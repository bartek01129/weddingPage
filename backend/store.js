// Indeks zdjęć: trzymany w pamięci (GET czyta stąd, bez I/O na request),
// utrwalany do photos.json. Rekord: { id, created_at, original_ext, bytes }.
import fs from 'node:fs/promises';
import path from 'node:path';

// Akceptujemy dowolną wersję UUID — my generujemy v4 (crypto.randomUUID).
// Eksportowany: server.js używa TEGO SAMEGO wzorca jako guard przed path traversal.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let dirs; // { originals, web, thumbs, tmp }
let indexFile;
let maxPhotos;

let index = [];

// Wszystkie mutacje indeksu idą jednym łańcuchem obietnic — równoległe uploady
// nie mogą sobie nadpisać photos.json ani wejść razem w sekcję krytyczną limitu.
let writeLock = Promise.resolve();

function serialize(job) {
	const run = writeLock.then(job, job);
	// Chwytamy błąd tylko dla kontynuacji łańcucha; wynik/błąd wraca do wołającego.
	writeLock = run.catch(() => {});
	return run;
}

async function persist() {
	const tmp = indexFile + '.tmp';
	await fs.writeFile(tmp, JSON.stringify(index));
	// rename w obrębie tego samego katalogu = atomowa podmiana indeksu.
	await fs.rename(tmp, indexFile);
}

async function listIds(dir) {
	// Zbiór id z nazw plików w katalogu (dwa readdir-y zamiast 2×N fs.access —
	// przy pełnej galerii nie opóźniamy startu serwera sekwencyjnym I/O).
	try {
		const files = await fs.readdir(dir);
		return new Set(files.map((f) => f.split('.')[0]));
	} catch {
		return new Set();
	}
}

async function cleanDir(dir) {
	let entries;
	try {
		entries = await fs.readdir(dir);
	} catch {
		return;
	}
	await Promise.all(
		entries.map((e) => fs.rm(path.join(dir, e), { recursive: true, force: true })),
	);
}

async function rebuildFromDisk() {
	// Awaryjnie odtwarzamy indeks ze skanu web/: id = nazwa pliku, created_at = mtime.
	// Oryginał/rozmiar są nieodtwarzalne — original_ext zostaje null (patrz usuwanie).
	let files;
	try {
		files = await fs.readdir(dirs.web);
	} catch {
		return [];
	}
	const records = [];
	for (const f of files) {
		if (!f.endsWith('.webp')) continue;
		const id = f.slice(0, -'.webp'.length);
		if (!UUID_RE.test(id)) continue;
		let stat;
		try {
			stat = await fs.stat(path.join(dirs.web, f));
		} catch {
			continue;
		}
		records.push({
			id,
			created_at: stat.mtime.toISOString(),
			original_ext: null,
		});
	}
	return records;
}

async function sweepOrphans(validIds) {
	// Indeks jest źródłem prawdy — pliki bez wpisu to śmieci po crashu w pół
	// operacji (upload/DELETE). Bez sprzątania wolumen ciekłby bez końca.
	for (const dir of [dirs.web, dirs.thumbs, dirs.originals]) {
		let files;
		try {
			files = await fs.readdir(dir);
		} catch {
			continue;
		}
		await Promise.all(
			files
				.filter((f) => !validIds.has(f.split('.')[0]))
				.map((f) => fs.rm(path.join(dir, f), { force: true })),
		);
	}
}

export async function init(config) {
	dirs = config.dirs;
	indexFile = path.join(config.dataDir, 'photos.json');
	maxPhotos = config.maxPhotos;

	// Katalogi muszą istnieć, zanim multer/sharp zaczną pisać.
	for (const d of Object.values(dirs)) {
		await fs.mkdir(d, { recursive: true });
	}

	// tmp/ czyścimy na starcie — po crashu mogły zostać niedokończone pliki.
	await cleanDir(dirs.tmp);

	let records;
	let dirty = false;
	try {
		const parsed = JSON.parse(await fs.readFile(indexFile, 'utf8'));
		if (!Array.isArray(parsed)) throw new Error('indeks nie jest tablicą');
		records = parsed;
	} catch {
		// Brak pliku lub uszkodzony JSON → odbuduj skanem web/.
		records = await rebuildFromDisk();
		dirty = true;
	}

	// Odsiej sieroty: wpisy bez kompletu plików (web + thumb).
	const [webIds, thumbIds] = await Promise.all([
		listIds(dirs.web),
		listIds(dirs.thumbs),
	]);
	const verified = records.filter(
		(r) =>
			r &&
			typeof r.id === 'string' &&
			UUID_RE.test(r.id) &&
			webIds.has(r.id) &&
			thumbIds.has(r.id),
	);
	if (verified.length !== records.length) dirty = true;
	index = verified;

	// Lustrzane sprzątanie: pliki, których nie ma w indeksie, kasujemy z dysku.
	await sweepOrphans(new Set(index.map((r) => r.id)));

	if (dirty) await persist();
	return index.length;
}

// GET /api/photos — kopia posortowana najnowsze-pierwsze (kontrakt).
export function getAll() {
	return [...index].sort((a, b) =>
		(a.created_at || '') < (b.created_at || '') ? 1 : -1,
	);
}

export function get(id) {
	return index.find((r) => r.id === id) || null;
}

export function count() {
	return index.length;
}

// Wstawienie w sekcji krytycznej: limit sprawdzamy TU (nie tylko przed sharpem),
// bo przy równoległych uploadach szybki check przed przetwarzaniem nie wystarcza.
export function insert(record) {
	return serialize(async () => {
		if (index.length >= maxPhotos) return { ok: false, full: true };
		index.push(record);
		try {
			await persist();
		} catch (err) {
			// Zapis indeksu nie przeszedł → wycofujemy wpis z pamięci, inaczej
			// zdjęcie byłoby widoczne w GET mimo błędu zgłoszonego klientowi.
			// pop() jest bezpieczny: mutacje są serializowane, nikt nie wszedł między.
			index.pop();
			throw err;
		}
		return { ok: true, record };
	});
}

export function remove(id) {
	return serialize(async () => {
		const i = index.findIndex((r) => r.id === id);
		if (i === -1) return null;
		const [record] = index.splice(i, 1);
		await persist();
		return record;
	});
}
