// Pipeline wideo: multer → ffprobe → plakat (kadr) → publikacja → kolejka transkodu.
// Nie ufamy rozszerzeniu ani mimetype: film musi się przedstawić ffprobe'owi.
//
// Dlaczego transkod leci W TLE, a nie w trakcie requestu: na małym VPS-ie
// przekodowanie minutowego filmu to 1-3 min CPU, a przeglądarka odpuszcza po
// 180 s. Odpowiadamy więc od razu (film widać w galerii jako plakat), a wersję
// do odtwarzania kolejka dostarcza chwilę później — front i tak odpytuje
// /api/photos co 30 s, więc podmieni URL sam.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// ffmpeg sypie na stderr postępem klatka po klatce — bez zapasu w buforze
// dłuższy transkod wywraca się na ERR_CHILD_PROCESS_STDIO_MAXBUFFER.
const EXEC_OPTS = { maxBuffer: 16 * 1024 * 1024 };

// Kodeki, które odtworzy każda współczesna przeglądarka. HEVC świadomie poza
// listą: iPhone nagrywa w nim domyślnie, a Chrome na Androidzie bywa bezradny.
const WEB_VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1']);
const WEB_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis']);

const EXT_BY_FORMAT = [
	{ match: /matroska|webm/, ext: 'webm' },
	{ match: /mp4|mov|m4a|3gp/, ext: 'mp4' },
];

// Nieruchomy obraz TEŻ ma ścieżkę wideo: w JPEG-u ffprobe widzi jedną klatkę
// mjpeg, a HEIC z iPhone'a to kontener mp4 z jedną klatką HEVC. Bez tej bramki
// zdjęcie wysłane przyciskiem „Nagraj film" wylądowałoby w galerii jako film
// nie do odtworzenia. Zdjęcia mają własną trasę — tu je odrzucamy.
const STILL_FORMATS = /^(image2|.*_pipe)$/;

function isStillImage(format, stream, duration) {
	if (STILL_FORMATS.test(format)) return true;
	// HEIC/AVIF są nieodróżnialne od filmu po nazwie formatu, więc patrzymy na
	// treść: jedna klatka i zerowa długość to zdjęcie, nie nagranie.
	const frames = Number(stream.nb_frames) || 0;
	return frames <= 1 && duration < 0.5;
}

export async function assertToolsAvailable() {
	// Lepiej wywalić się na starcie niż przy pierwszym filmie gościa.
	await run('ffprobe', ['-version'], EXEC_OPTS);
	await run('ffmpeg', ['-version'], EXEC_OPTS);
}

export async function probe(file) {
	let stdout;
	try {
		({ stdout } = await run(
			'ffprobe',
			['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
			EXEC_OPTS,
		));
	} catch {
		const err = new Error('To nie jest film.');
		err.code = 'NOT_VIDEO';
		throw err;
	}

	const info = JSON.parse(stdout);
	const streams = info.streams || [];
	const video = streams.find((s) => s.codec_type === 'video');
	if (!video) {
		const err = new Error('To nie jest film.');
		err.code = 'NOT_VIDEO';
		throw err;
	}
	const audio = streams.find((s) => s.codec_type === 'audio');
	const formatName = info.format?.format_name || '';
	const duration = Number(info.format?.duration) || 0;

	if (isStillImage(formatName, video, duration)) {
		const err = new Error('To zdjęcie, nie film.');
		err.code = 'NOT_VIDEO';
		throw err;
	}

	return {
		duration,
		formatName,
		majorBrand: (info.format?.tags?.major_brand || '').trim(),
		vcodec: video.codec_name || '',
		acodec: audio?.codec_name || null,
		ext: EXT_BY_FORMAT.find((f) => f.match.test(formatName))?.ext || 'mp4',
	};
}

// Co trzeba zrobić, żeby przeglądarka to odtworzyła:
//   'ready'  — nic, plik idzie do galerii nietknięty
//   'repack' — tylko zmiana opakowania, strumień wideo kopiujemy 1:1 (bezstratnie)
//   'encode' — pełne przekodowanie, jedyny przypadek, w którym tracimy jakość
//
// Rozdzielenie 'repack' od 'encode' jest tu najważniejsze: iPhone w trybie
// „Najbardziej zgodne" nagrywa H.264 w kontenerze .mov. Strumień jest gotowy do
// odtworzenia — złe jest wyłącznie opakowanie. Przekodowywanie takiego filmu
// to strata jakości bez żadnego powodu (i minuta CPU zamiast sekundy).
export function playbackPlan(meta) {
	if (!WEB_VIDEO_CODECS.has(meta.vcodec)) return 'encode';

	const audioOk = !meta.acodec || WEB_AUDIO_CODECS.has(meta.acodec);
	// major_brand 'qt' = kontener QuickTime (.mov). Ten sam format_name co mp4,
	// ale przeglądarki traktują go różnie, więc przepakowujemy.
	const containerOk =
		!meta.majorBrand.startsWith('qt') && (meta.ext === 'mp4' || meta.ext === 'webm');

	if (containerOk && audioOk) return 'ready';
	return 'repack';
}

// Kadr na plakat. Sekunda od początku, żeby nie trafić w czarną klatkę, ale
// nie dalej niż połowa filmu — krótkie klipy potrafią mieć 0.8 s.
export async function extractPoster(src, outJpg, duration) {
	const at = Math.min(1, Math.max(0, duration / 2));
	await run(
		'ffmpeg',
		[
			'-y',
			'-ss', at.toFixed(2),
			'-i', src,
			'-frames:v', '1',
			'-q:v', '3',
			outJpg,
		],
		EXEC_OPTS,
	);
}

// faststart przenosi indeks na początek pliku: odtwarzanie rusza od razu,
// bez ściągania całości. Bez tego film "wisi" na wolnym łączu.
const FASTSTART = ['-movflags', '+faststart'];

// Przepakowanie: strumień wideo kopiujemy bit w bit, więc jakość jest DOKŁADNIE
// taka jak z telefonu. Trwa sekundę zamiast minut. Ścieżkę dźwiękową ruszamy
// tylko wtedy, gdy jej kodek nie nadaje się do przeglądarki.
export async function repackToMp4(src, outMp4, meta) {
	const audioOk = !meta.acodec || WEB_AUDIO_CODECS.has(meta.acodec);
	await run(
		'ffmpeg',
		[
			'-y',
			'-i', src,
			'-c:v', 'copy',
			...(meta.acodec ? (audioOk ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k']) : []),
			...FASTSTART,
			outMp4,
		],
		EXEC_OPTS,
	);
}

// Dłuższy bok do 1920 px, -2 pilnuje parzystości wymiarów (wymóg yuv420p).
// min() nie powiększa: film nagrany w 720p zostaje w 720p.
const SCALE_1920 =
	"scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'";

// Pełne przekodowanie — tylko dla kodeków, których przeglądarka nie odtworzy
// (praktycznie: HEVC z iPhone'a). crf 21 jest wizualnie bliskie oryginału;
// przy braku limitu rozmiaru nie ma powodu oszczędzać na jakości wspomnień.
export async function encodeToMp4(src, outMp4) {
	await run(
		'ffmpeg',
		[
			'-y',
			'-i', src,
			'-vf', SCALE_1920,
			'-c:v', 'libx264',
			'-preset', 'veryfast',
			'-crf', '21',
			'-profile:v', 'high',
			'-pix_fmt', 'yuv420p',
			'-c:a', 'aac',
			'-b:a', '192k',
			...FASTSTART,
			// Dwa wątki: transkod ma nie zagłodzić uploadów zdjęć na 2-rdzeniowym VPS.
			'-threads', '2',
			outMp4,
		],
		EXEC_OPTS,
	);
}

// Jedno wejście dla kolejki: sama decyduje, czy wystarczy przepakowanie.
// Dzięki temu wznowienie po restarcie nie musi pamiętać planu — wystarczy
// ponowny ffprobe pliku źródłowego.
export async function makePlayable(src, outMp4, meta) {
	if (playbackPlan(meta) === 'encode') {
		await encodeToMp4(src, outMp4);
		return 'encode';
	}
	await repackToMp4(src, outMp4, meta);
	return 'repack';
}

// Kolejka transkodów: JEDEN naraz. Równoległy ffmpeg na małej maszynie kładzie
// cały serwis, a filmy i tak nie muszą być gotowe natychmiast.
const queue = [];
let draining = false;

async function drain() {
	if (draining) return;
	draining = true;
	while (queue.length) {
		const job = queue.shift();
		try {
			await job();
		} catch (err) {
			console.error('Transkod nie powiódł się:', err.message);
		}
	}
	draining = false;
}

export function enqueue(job) {
	queue.push(job);
	drain();
}

export function queueLength() {
	return queue.length + (draining ? 1 : 0);
}
