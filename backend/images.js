// Pipeline obrazów: multer → wykrycie formatu → web/thumb webp → publikacja.
// Nie ufamy mimetype ani rozszerzeniu; format ustalamy z zawartości pliku.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

// Formaty, które sharp czyta bezpośrednio; resztę (HEIC) łapiemy po magic bytes.
const SHARP_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff']);
const EXT_BY_FORMAT = {
	jpeg: 'jpg',
	png: 'png',
	webp: 'webp',
	avif: 'avif',
	gif: 'gif',
	tiff: 'tiff',
};

// Semafor bez zależności: prosty rozdział "permitów" przez kolejkę obietnic.
function makeSemaphore(max) {
	let available = max;
	const waiters = [];
	return {
		acquire() {
			if (available > 0) {
				available--;
				return Promise.resolve();
			}
			return new Promise((r) => waiters.push(r));
		},
		release() {
			const next = waiters.shift();
			if (next) next(); // przekaż permit dalej bez zmiany licznika
			else available++;
		},
	};
}

// Max 2 równoległe joby sharp; max 1 heic-convert (czysty WASM, RAM-żerny).
const sharpSem = makeSemaphore(2);
const heicSem = makeSemaphore(1);

async function withSem(sem, fn) {
	await sem.acquire();
	try {
		return await fn();
	} finally {
		sem.release();
	}
}

export function initSharp() {
	// Globalnie raz: bez cache plików (co upload to nowy plik) i 1 wątek libvips —
	// współbieżność trzymamy własnym semaforem, nie wewnętrzną pulą sharpa.
	sharp.cache(false);
	sharp.concurrency(1);
}

export function createUpload(dirs, maxUploadBytes) {
	const storage = multer.diskStorage({
		// Piszemy na dysk do tmp/, NIE do RAM — mały VPS, oszczędzamy pamięć.
		destination: (req, file, cb) => cb(null, dirs.tmp),
		filename: (req, file, cb) => cb(null, `${randomUUID()}.upload`),
	});
	return multer({ storage, limits: { fileSize: maxUploadBytes, files: 1 } });
}

async function safeUnlink(file) {
	try {
		await fs.unlink(file);
	} catch {
		// Brak pliku = już posprzątane; inne błędy ignorujemy w ścieżce cleanup.
	}
}
export { safeUnlink };

function isHeic(buf) {
	// ISO-BMFF: bajty 4-8 = 'ftyp', 8-12 = brand. HEIC ma brand z tej listy.
	if (buf.length < 12) return false;
	if (buf.toString('ascii', 4, 8) !== 'ftyp') return false;
	const brand = buf.toString('ascii', 8, 12);
	return ['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand);
}

async function readHeader(tempPath) {
	// Do detekcji ISO-BMFF wystarczy 12 bajtów — nie czytamy 15 MB do RAM
	// tylko po to, żeby sprawdzić magic bytes.
	const fh = await fs.open(tempPath, 'r');
	try {
		const buf = Buffer.alloc(12);
		await fh.read(buf, 0, 12, 0);
		return buf;
	} finally {
		await fh.close();
	}
}

async function decodeInput(tempPath) {
	// 1) Najpierw sharp — czyta nagłówek bez ładowania całości do RAM.
	try {
		const meta = await withSem(sharpSem, () => sharp(tempPath).metadata());
		if (meta.format && SHARP_FORMATS.has(meta.format)) {
			return { source: tempPath, ext: EXT_BY_FORMAT[meta.format] };
		}
	} catch {
		// sharp nie rozpoznał — spróbujemy HEIC niżej.
	}

	// 2) HEIC: na alpine sharp bez libheif go nie czyta → konwersja przez WASM.
	// Pełny bufor pliku ładujemy DOPIERO w semaforze — równoległe uploady
	// czekające w kolejce nie mogą trzymać po 15 MB w RAM każdy.
	if (isHeic(await readHeader(tempPath))) {
		const jpeg = await withSem(heicSem, async () =>
			heicConvert({
				buffer: await fs.readFile(tempPath),
				format: 'JPEG',
				quality: 0.9,
			}),
		);
		// original_ext = 'heic' (oryginał zapisujemy nietknięty), dalej sharp na buforze.
		return { source: jpeg, ext: 'heic' };
	}

	const err = new Error('To nie jest obraz.');
	err.code = 'NOT_IMAGE';
	throw err;
}

async function generate(source, webTmp, thumbTmp) {
	await withSem(sharpSem, async () => {
		// .rotate() ZAWSZE przed resize: webp gubi EXIF, więc orientację
		// trzeba "wypalić" w pikselach zanim zapiszemy plik wyjściowy.
		await sharp(source)
			.rotate()
			.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 78 })
			.toFile(webTmp);
		// Miniaturę tniemy z gotowej wersji web (≤1600px, orientacja już wypalona)
		// zamiast dekodować 12-48 MPx oryginał drugi raz — połowa CPU/RAM na upload.
		await sharp(webTmp)
			.resize(400, 533, { fit: 'cover' })
			.webp({ quality: 70 })
			.toFile(thumbTmp);
	});
}

// Przetwarza temp multera → publikuje web/thumb/original. Zwraca rekord indeksu.
// Każda ścieżka błędu sprząta wszystko, co zdążyło powstać (łącznie z temp multera).
export async function processUpload(tempPath, dirs) {
	const id = randomUUID();
	const webTmp = path.join(dirs.tmp, `${id}.web.webp`);
	const thumbTmp = path.join(dirs.tmp, `${id}.thumb.webp`);
	const cleanup = [webTmp, thumbTmp];

	try {
		const { source, ext } = await decodeInput(tempPath);
		await generate(source, webTmp, thumbTmp);

		const webFinal = path.join(dirs.web, `${id}.webp`);
		const thumbFinal = path.join(dirs.thumbs, `${id}.webp`);
		const originalFinal = path.join(dirs.originals, `${id}.${ext}`);

		// Publikacja przez rename (jeden FS ⇒ atomowo): plik trafia do web/
		// dopiero kompletny. Od momentu renamea sprzątamy plik docelowy, nie temp.
		await fs.rename(webTmp, webFinal);
		cleanup.push(webFinal);
		await fs.rename(thumbTmp, thumbFinal);
		cleanup.push(thumbFinal);
		await fs.rename(tempPath, originalFinal);

		return { id, created_at: new Date().toISOString(), original_ext: ext };
	} catch (err) {
		for (const f of cleanup) await safeUnlink(f);
		await safeUnlink(tempPath);
		throw err;
	}
}

async function unlinkOriginalById(id, dirs) {
	// ext nieznany (indeks odbudowany ze skanu) → usuń dowolny original o tym id.
	let files;
	try {
		files = await fs.readdir(dirs.originals);
	} catch {
		return;
	}
	await Promise.all(
		files
			.filter((f) => f.startsWith(`${id}.`))
			.map((f) => safeUnlink(path.join(dirs.originals, f))),
	);
}

// Usuwa komplet plików zdjęcia (web + thumb + original). Używane przy DELETE
// oraz gdy insert do indeksu odmówił (galeria pełna) i trzeba wycofać upload.
export async function removeFiles(id, ext, dirs) {
	await safeUnlink(path.join(dirs.web, `${id}.webp`));
	await safeUnlink(path.join(dirs.thumbs, `${id}.webp`));
	if (ext) await safeUnlink(path.join(dirs.originals, `${id}.${ext}`));
	else await unlinkOriginalById(id, dirs);
}
