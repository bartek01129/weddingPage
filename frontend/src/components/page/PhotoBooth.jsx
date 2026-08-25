import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api/photos';
const VIDEO_API_URL = '/api/videos';
const PAGE_SIZE = 40;
const OPTIMISTIC_WINDOW_MS = 60_000;
const SWIPE_DISTANCE = 70; // px potrzebne do zmiany zdjęcia
const SWIPE_VELOCITY = 400; // px/s — szybki flick też przewija
const EDGE_RESISTANCE = 0.18; // opór na pierwszym/ostatnim zdjęciu

const ADMIN_TOKEN = new URLSearchParams(window.location.search).get('admin');

function isImage(file) {
	const okType = file.type.startsWith('image/');
	const okHeic = /\.(heic|heif)$/i.test(file.name);
	return okType || okHeic;
}

function isVideo(file) {
	// Część telefonów oddaje .mov z pustym type — rozszerzenie jest wtedy jedyną
	// wskazówką. To tylko rozpoznanie trasy: film i tak weryfikuje ffprobe.
	const okType = file.type.startsWith('video/');
	const okExt = /\.(mp4|mov|m4v|webm|avi|3gp|mkv)$/i.test(file.name);
	return okType || okExt;
}

// Sekundy → 0:07 / 1:23. null gdy backend nie zna długości (indeks po odbudowie).
function formatDuration(seconds) {
	if (!Number.isFinite(seconds) || seconds <= 0) return null;
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

const makeId = () =>
	typeof crypto !== 'undefined' && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const UPLOAD_CONCURRENCY = 3; // ile zdjęć leci równolegle z jednej przeglądarki
// Watchdog uploadu: liczymy BRAK POSTĘPU, nie łączny czas. xhr.timeout zerwałby
// duży plik na wolnym łączu mimo że transfer idzie poprawnie.
const STALL_TIMEOUT_MS = 45_000; // cisza w trakcie wysyłki = zerwane łącze
const RESPONSE_TIMEOUT_MS = 180_000; // body wysłane, serwer przetwarza (HEIC bywa wolny)
const MAX_ATTEMPTS = 3; // 1 próba + 2 ponowienia
const RETRY_BASE_MS = 1500;

class UploadError extends Error {
	constructor(message, { retryable = false } = {}) {
		super(message);
		this.retryable = retryable;
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Zmniejszanie przed wysyłką to OPTYMALIZACJA TRANSFERU, nie bramka: backend
// i tak skaluje wszystko do 1600 px, więc 3500 px q0.85 wygląda na stronie
// identycznie jak oryginał, a leci przez sieć kilkanaście razy szybciej.
const SHRINK_ABOVE_BYTES = 15 * 1024 * 1024;
const SHRINK_TARGET_BYTES = 14 * 1024 * 1024;
const SHRINK_STEPS = [
	{ maxPx: 3500, quality: 0.85 },
	{ maxPx: 2600, quality: 0.8 },
	{ maxPx: 2000, quality: 0.75 },
	{ maxPx: 1600, quality: 0.7 },
	{ maxPx: 1600, quality: 0.5 },
];

// Dekodowanie na canvas jest pamięciożerne — trzy zdjęcia 48 MPx naraz potrafią
// wywalić kartę na telefonie. Uploady lecą równolegle, samo zmniejszanie nie.
let shrinkChain = Promise.resolve();
function queueShrink(job) {
	const run = shrinkChain.then(job, job);
	shrinkChain = run.catch(() => {});
	return run;
}

async function shrinkImage(file) {
	// imageOrientation JAWNIE: canvas gubi EXIF, więc serwerowe .rotate() nie ma
	// już czego naprawić. Bez tego zdjęcie z telefonu ląduje trwale obrócone.
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const longest = Math.max(bitmap.width, bitmap.height);

	try {
		let last = null;
		for (const { maxPx, quality } of SHRINK_STEPS) {
			const scale = Math.min(1, maxPx / longest);
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			const blob = await new Promise((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', quality),
			);
			if (!blob) throw new Error('canvas.toBlob zwrócił null');
			last = blob;
			if (blob.size <= SHRINK_TARGET_BYTES) break;
		}
		// Brak twardego limitu: bierzemy najlepszy wynik, jaki wyszedł. Gdyby
		// wyszedł większy od oryginału (bywa przy PNG), oryginał jest lepszy.
		if (!last || last.size >= file.size) return file;
		return new File([last], file.name.replace(/\.\w+$/, '') + '.jpg', {
			type: 'image/jpeg',
		});
	} finally {
		bitmap.close();
	}
}

async function prepareForUpload(file) {
	// Filmu nie tykamy: canvas go nie zdekoduje, a zmniejszaniem zajmuje się
	// ffmpeg po stronie serwera. Ten warunek MUSI być przed limitem rozmiaru.
	if (isVideo(file)) return file;
	if (file.size <= SHRINK_ABOVE_BYTES) return file;
	try {
		return await queueShrink(() => shrinkImage(file));
	} catch {
		// NIGDY nie pomijamy pliku — to był błąd starej wersji. Gdy przeglądarka
		// nie umie zdekodować (typowo HEIC poza Safari), wysyłamy oryginał;
		// serwer poradzi sobie sam, HEIC konwertuje heic-convert.
		return file;
	}
}

function uploadOnce(file, url, onProgress) {
	return new Promise((resolve, reject) => {
		const fd = new FormData();
		fd.append('file', file);

		const xhr = new XMLHttpRequest();
		let bodySent = false;
		let timer;

		const arm = (ms, onFire) => {
			clearTimeout(timer);
			timer = setTimeout(onFire, ms);
		};
		const disarm = () => clearTimeout(timer);

		const failStalled = () => {
			xhr.abort();
			// Body nie doszło w całości → serwer nic nie zapisał, ponowienie bezpieczne.
			reject(new UploadError('Przesyłanie się zatrzymało.', { retryable: true }));
		};
		const failNoResponse = () => {
			xhr.abort();
			// Plik poszedł w całości: serwer mógł go zapisać mimo braku odpowiedzi.
			// NIE ponawiamy — bez klucza idempotencji retry zrobiłby duplikat.
			reject(
				new UploadError(
					'Serwer nie odpowiedział — sprawdź galerię, zanim wyślesz ponownie.',
				),
			);
		};

		xhr.open('POST', url);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
			arm(STALL_TIMEOUT_MS, failStalled);
		};
		xhr.upload.onload = () => {
			bodySent = true;
			arm(RESPONSE_TIMEOUT_MS, failNoResponse);
		};
		xhr.onabort = disarm;
		xhr.onload = () => {
			disarm();
			let data = null;
			try {
				data = JSON.parse(xhr.responseText);
			} catch {
				// Niepoprawny JSON — np. strona błędu proxy zamiast odpowiedzi API.
			}

			if (xhr.status >= 200 && xhr.status < 300 && data?.public_id) {
				resolve(data);
				return;
			}
			if (xhr.status === 409) {
				reject(new UploadError('Galeria jest pełna — osiągnięto limit zdjęć.'));
				return;
			}
			// 503 (brak ffmpeg) i 507 (brak miejsca) to decyzje serwera, nie
			// awarie — ponawianie niczego nie zmieni, a zajmie gościowi minutę.
			if (xhr.status >= 500 && xhr.status !== 503 && xhr.status !== 507) {
				// Serwer przy błędzie sprząta swoje pliki, więc retry nie zrobi duplikatu.
				reject(
					new UploadError(data?.error || `Błąd serwera (${xhr.status})`, {
						retryable: true,
					}),
				);
				return;
			}
			reject(new UploadError(data?.error || `Błąd uploadu (${xhr.status})`));
		};
		xhr.onerror = () => {
			disarm();
			// Zerwanie przed wysłaniem całego body jest bezpieczne do ponowienia.
			reject(
				new UploadError('Błąd sieci podczas przesyłania.', {
					retryable: !bodySent,
				}),
			);
		};

		arm(STALL_TIMEOUT_MS, failStalled);
		xhr.send(fd);
	});
}

async function uploadToServer(file, url, onProgress) {
	for (let attempt = 1; ; attempt++) {
		try {
			return await uploadOnce(file, url, onProgress);
		} catch (err) {
			if (!err.retryable || attempt >= MAX_ATTEMPTS) throw err;
			onProgress(0); // pasek wraca na start — widać, że lecimy od nowa
			await sleep(attempt * RETRY_BASE_MS);
		}
	}
}

export default function PhotoBooth() {
	const navigate = useNavigate();
	const [photos, setPhotos] = useState([]);
	const [queue, setQueue] = useState([]);
	const [errorMsg, setErrorMsg] = useState('');
	const [selectedId, setSelectedId] = useState(null);
	const [loadedImages, setLoadedImages] = useState(new Set());
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef(null);
	const photosLenRef = useRef(0);
	photosLenRef.current = photos.length;

	const fetchPhotos = useCallback(async () => {
		try {
			const res = await fetch(API_URL, { cache: 'no-store' });
			if (!res.ok) return;
			const data = await res.json();
			if (!Array.isArray(data)) return;
			setPhotos((prev) => {
				const known = new Set(data.map((p) => p.public_id));
				const now = Date.now();
				const pending = prev.filter(
					(p) =>
						!known.has(p.public_id) &&
						now - new Date(p.created_at).getTime() < OPTIMISTIC_WINDOW_MS,
				);
				return [...data, ...pending].sort(
					(a, b) => new Date(b.created_at) - new Date(a.created_at),
				);
			});
		} catch {
			/* empty */
		}
	}, []);

	useEffect(() => {
		window.scrollTo(0, 0);
		fetchPhotos();
		const id = setInterval(fetchPhotos, 30_000);
		return () => clearInterval(id);
	}, [fetchPhotos]);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setVisibleCount((c) => (c < photosLenRef.current ? c + PAGE_SIZE : c));
				}
			},
			{ rootMargin: '600px' },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const handleFiles = async (fileList) => {
		const files = Array.from(fileList || []);
		if (!files.length) return;
		setErrorMsg('');
		setQueue((q) => q.filter((it) => it.status === 'uploading'));

		const accepted = files.filter((f) => isImage(f) || isVideo(f));
		const rejected = files.length - accepted.length;
		if (rejected > 0)
			setErrorMsg(`Pominięto ${rejected} plik(ów) — to nie są zdjęcia ani filmy.`);

		const items = accepted.map((file) => ({ file, id: makeId() }));
		setQueue((q) => [
			...q,
			...items.map(({ id, file }) => ({
				id,
				name: file.name,
				progress: 0,
				status: 'uploading',
			})),
		]);

		// Pula workerów zamiast pętli sekwencyjnej: 25 zdjęć na słabym wifi szło
		// wcześniej jedno po drugim. cursor++ jest bezpieczny — między odczytem
		// a inkrementacją nie ma awaita, więc żaden plik nie trafi do dwóch workerów.
		let cursor = 0;
		const worker = async () => {
			while (cursor < items.length) {
				const { file, id } = items[cursor++];
				const video = isVideo(file);
				try {
					const payload = await prepareForUpload(file);
					const data = await uploadToServer(payload, video ? VIDEO_API_URL : API_URL, (p) =>
						setQueue((q) =>
							q.map((it) => (it.id === id ? { ...it, progress: p } : it)),
						),
					);
					setPhotos((prev) => {
						if (prev.some((p) => p.public_id === data.public_id)) return prev;
						return [data, ...prev];
					});
					setQueue((q) =>
						q.map((it) =>
							it.id === id ? { ...it, progress: 1, status: 'done' } : it,
						),
					);
				} catch (err) {
					setQueue((q) =>
						q.map((it) => (it.id === id ? { ...it, status: 'error' } : it)),
					);
					setErrorMsg(
						err.message ||
							`Nie udało się przesłać ${video ? 'filmu' : 'zdjęcia'}.`,
					);
				}
			}
		};
		await Promise.all(
			Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length) }, worker),
		);
		setTimeout(
			() => setQueue((q) => q.filter((it) => it.status !== 'done')),
			2500,
		);
	};

	const onInputChange = (e) => {
		handleFiles(e.target.files);
		e.target.value = '';
	};

	const handleDeletePhoto = async (e, photo) => {
		e.stopPropagation();
		const noun = photo.kind === 'video' ? 'film' : 'zdjęcie';
		if (!window.confirm(`Usunąć to ${noun}?`)) return;
		try {
			const res = await fetch(`${API_URL}/${photo.id}`, {
				method: 'DELETE',
				headers: { 'X-Admin-Token': ADMIN_TOKEN },
			});
			if (res.status === 204) {
				setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
			} else if (res.status === 401) {
				setErrorMsg('Błędny token administratora.');
			} else {
				setErrorMsg('Nie udało się usunąć zdjęcia.');
			}
		} catch {
			setErrorMsg('Nie udało się usunąć zdjęcia.');
		}
	};

	const selectedIndex = photos.findIndex((p) => p.id === selectedId);
	const selectedPhoto = selectedIndex === -1 ? null : photos[selectedIndex];
	const hasPrev = selectedIndex > 0;
	const hasNext = selectedIndex !== -1 && selectedIndex < photos.length - 1;
	// Swipe w lightboxie — bez zapętlania na skrajnych zdjęciach
	const dragX = useMotionValue(0);

	const goPrev = () => {
		if (!hasPrev) return;
		dragX.set(0);
		setSelectedId(photos[selectedIndex - 1].id);
	};
	const goNext = () => {
		if (!hasNext) return;
		dragX.set(0);
		setSelectedId(photos[selectedIndex + 1].id);
	};

	useEffect(() => {
		dragX.set(0);
	}, [selectedId, dragX]);

	// Na krańcach galerii mocno tłumimy przesunięcie (opór zamiast przewijania)
	const handleDrag = (_, info) => {
		const blocked =
			(info.offset.x > 0 && !hasPrev) || (info.offset.x < 0 && !hasNext);
		if (blocked) dragX.set(info.offset.x * EDGE_RESISTANCE);
	};

	const handleDragEnd = (_, info) => {
		const { offset, velocity } = info;
		const swipedRight =
			offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY;
		const swipedLeft =
			offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY;

		if (swipedRight && hasPrev) goPrev();
		else if (swipedLeft && hasNext) goNext();
		else dragX.set(0);
	};

	useEffect(() => {
		if (selectedIndex === -1) return;
		const handleKey = (e) => {
			if (e.key === 'Escape') setSelectedId(null);
			else if (e.key === 'ArrowLeft' && selectedIndex > 0)
				setSelectedId(photos[selectedIndex - 1].id);
			else if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1)
				setSelectedId(photos[selectedIndex + 1].id);
		};
		window.addEventListener('keydown', handleKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', handleKey);
			document.body.style.overflow = 'unset';
		};
	}, [selectedIndex, photos]);

	const busy = queue.some((it) => it.status === 'uploading');

	return (
		<section className='min-h-screen py-10 px-4 bg-primary-bg'>
			<div className='max-w-4xl mx-auto'>
				<div className='flex justify-start mb-8'>
					<button
						onClick={() => navigate('/')}
						className='flex items-center gap-2 text-accent-green text-xs font-semibold uppercase tracking-elegant hover:text-accent-gold transition-colors'
					>
						<svg
							className='w-5 h-5'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M10 19l-7-7m0 0l7-7m-7 7h18'
							/>
						</svg>
						Wróć do strony głównej
					</button>
				</div>

				<motion.div
					className='text-center mb-12'
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, ease: 'easeOut' }}
				>
					<p className='eyebrow mb-4'>Wspólne wspomnienia</p>
					<h2 className='text-4xl md:text-5xl font-serif font-medium text-text-main mb-6'>
						Galeria Weselna
					</h2>
					<div
						className='flex items-center justify-center gap-3 mb-5'
						aria-hidden='true'
					>
						<span className='h-px w-14 bg-gradient-to-r from-transparent to-accent-gold/80' />
						<span className='block w-1.5 h-1.5 rotate-45 bg-accent-gold' />
						<span className='h-px w-14 bg-gradient-to-r from-accent-gold/80 to-transparent' />
					</div>
					<p className='font-serif italic text-xl text-accent-green/85'>
						Uwiecznijmy te chwile razem!
					</p>
				</motion.div>

				{/* Sekcja Aparatu*/}
				<div className='sticky top-4 z-30 mb-12 flex justify-center'>
					<div className='bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-card border border-accent-gold/30 w-full max-w-md'>
						<div className='flex flex-row gap-3 justify-center'>
							{/* INPUT DLA APARATU */}
							<input
								type='file'
								accept='image/*'
								capture='environment'
								onChange={onInputChange}
								id='camera-input'
								className='hidden'
							/>
							<label
								htmlFor='camera-input'
								className='flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-accent-green text-white rounded-xl font-semibold shadow-soft cursor-pointer hover:bg-info-green active:scale-95 transition-all'
							>
								<svg
									className='w-6 h-6'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
									/>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
									/>
								</svg>
								<span className='text-sm md:text-base'>Zrób zdjęcie</span>
							</label>

							{/* INPUT DLA GALERII */}
							<input
								type='file'
								accept='image/*,video/*'
								multiple
								onChange={onInputChange}
								id='gallery-input'
								className='hidden'
							/>
							<label
								htmlFor='gallery-input'
								className='flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-white text-accent-green border border-accent-green/40 rounded-xl font-semibold shadow-softer cursor-pointer hover:border-accent-green hover:bg-accent-green/5 active:scale-95 transition-all'
							>
								<svg
									className='w-6 h-6'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
									/>
								</svg>
								<span className='text-sm md:text-base'>Z biblioteki</span>
							</label>
						</div>

						{/* INPUT DLA FILMU — osobny wiersz, nie trzeci kafelek: trzy
						    równe przyciski robią się nieklikalne na wąskim telefonie. */}
						<div className='mt-3'>
							<input
								type='file'
								accept='video/*'
								capture='environment'
								onChange={onInputChange}
								id='video-input'
								className='hidden'
							/>
							<label
								htmlFor='video-input'
								className='w-full flex flex-row items-center justify-center gap-2 px-4 py-3 bg-white text-accent-green border border-accent-gold/60 rounded-xl font-semibold shadow-softer cursor-pointer hover:border-accent-gold hover:bg-accent-gold/5 active:scale-95 transition-all'
							>
								<svg
									className='w-5 h-5'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
									/>
								</svg>
								<span className='text-sm md:text-base'>Nagraj film</span>
							</label>
						</div>

						<AnimatePresence>
							{queue.length > 0 && (
								<motion.ul
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className='mt-4 space-y-2 overflow-hidden'
								>
									{queue.map((it) => (
										<li key={it.id} className='text-left'>
											<div className='flex items-center justify-between gap-3 mb-1'>
												<span className='text-xs text-text-main/60 truncate max-w-[70%]'>
													{it.name}
												</span>
												<span
													className={`text-xs font-semibold tabular-nums ${
														it.status === 'error'
															? 'text-red-500'
															: it.status === 'done'
																? 'text-accent-gold'
																: 'text-text-main/45'
													}`}
												>
													{it.status === 'error'
														? 'Błąd'
														: it.status === 'done'
															? 'Gotowe'
															: `${Math.round(it.progress * 100)}%`}
												</span>
											</div>
											<div className='h-[3px] w-full bg-light-gray rounded-full overflow-hidden'>
												<div
													className={`h-full rounded-full transition-[width] duration-200 ${
														it.status === 'error'
															? 'bg-red-400'
															: 'bg-accent-gold'
													}`}
													style={{
														width: `${
															it.status === 'error'
																? 100
																: Math.round(it.progress * 100)
														}%`,
													}}
												/>
											</div>
										</li>
									))}
								</motion.ul>
							)}
						</AnimatePresence>

						{errorMsg && (
							<p className='mt-3 text-xs text-red-500 text-center font-light'>
								{errorMsg}
							</p>
						)}
					</div>
				</div>

				{/* Siatka zdjęć */}
				<div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6'>
					<AnimatePresence>
						{photos.slice(0, visibleCount).map((photo) => (
							<motion.div
								key={photo.id}
								layout
								initial={{ opacity: 0, scale: 0.92 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.92 }}
								onClick={() => setSelectedId(photo.id)}
								className='group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft bg-white border-4 border-white cursor-pointer'
							>
								<div className='relative w-full h-full bg-accent-green/10'>
									{!loadedImages.has(photo.id) && (
										<div className='absolute inset-0 bg-gradient-to-br from-accent-green/10 to-accent-gold/10 animate-pulse rounded-2xl' />
									)}
									<img
										src={photo.thumb_url}
										alt='Wedding moment'
										loading='lazy'
										onLoad={() =>
											setLoadedImages((prev) => new Set([...prev, photo.id]))
										}
										className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
											loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'
										}`}
									/>
									{photo.kind === 'video' && (
										<>
											{/* Znacznik filmu w języku papeterii: krem, złoty
											    hairline, zielona strzałka — nie czarne szkło. */}
											<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
												<span className='flex items-center justify-center w-14 h-14 rounded-full bg-cream/90 backdrop-blur-[2px] border border-accent-gold/70 shadow-soft transition-transform duration-500 group-hover:scale-110'>
													<svg
														className='w-5 h-5 translate-x-[2px] text-accent-green'
														viewBox='0 0 24 24'
														fill='currentColor'
													>
														<path d='M8 5v14l11-7z' />
													</svg>
												</span>
											</div>
											<span className='pointer-events-none absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-cream/90 border border-accent-gold/40 text-[11px] tracking-wide text-accent-green font-light'>
												{photo.processing
													? 'przetwarzanie…'
													: formatDuration(photo.duration) || 'film'}
											</span>
										</>
									)}
									{ADMIN_TOKEN && (
										<button
											onClick={(e) => handleDeletePhoto(e, photo)}
											title={photo.kind === 'video' ? 'Usuń film' : 'Usuń zdjęcie'}
											className='absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-accent-green/70 text-white/85 hover:text-white hover:bg-red-500/80 transition-colors'
										>
											<svg
												className='w-4 h-4'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={1.8}
													d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3'
												/>
											</svg>
										</button>
									)}
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				<div ref={sentinelRef} aria-hidden='true' className='h-px w-full' />

				{/* LIGHTBOX - Widok pełnoekranowy */}
				<AnimatePresence>
					{selectedPhoto && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSelectedId(null)}
							className='fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out'
						>
							<button
								onClick={() => setSelectedId(null)}
								className='absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[110]'
								title='Zamknij (Esc)'
							>
								<svg
									className='w-10 h-10'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M6 18L18 6M6 6l12 12'
									/>
								</svg>
							</button>

							{selectedIndex > 0 && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										goPrev();
									}}
									className='absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-[110]'
									title='Poprzednie zdjęcie (←)'
								>
									<svg
										className='w-10 h-10'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={1.8}
											d='M15 19l-7-7 7-7'
										/>
									</svg>
								</button>
							)}
							{selectedIndex < photos.length - 1 && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										goNext();
									}}
									className='absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-[110]'
									title='Następne zdjęcie (→)'
								>
									<svg
										className='w-10 h-10'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={1.8}
											d='M9 5l7 7-7 7'
										/>
									</svg>
								</button>
							)}

							{selectedPhoto.kind === 'video' ? (
								// Film NIE dostaje drag='x': przeciąganie zjadałoby natywne
								// kontrolki (przewijanie, głośność). Nawigacja zostaje na
								// strzałkach i klawiaturze, a to jest ważniejsze niż swipe.
								<motion.div
									key={selectedPhoto.id}
									initial={{ scale: 0.9, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.9, opacity: 0 }}
									className='flex flex-col items-center gap-4 max-w-full'
									onClick={(e) => e.stopPropagation()}
								>
									{selectedPhoto.video_url ? (
										<video
											src={selectedPhoto.video_url}
											poster={selectedPhoto.web_url}
											controls
											autoPlay
											playsInline
											preload='metadata'
											className='max-w-full max-h-[85vh] rounded-lg shadow-2xl bg-black'
										/>
									) : (
										// Transkod jeszcze trwa — pokazujemy plakat, żeby gość
										// widział, że film dotarł, i wiedział, że ma wrócić.
										<>
											<img
												src={selectedPhoto.web_url}
												alt='Kadr z filmu'
												className='max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain opacity-70'
											/>
											<p className='font-serif italic text-white/80 text-center px-6'>
												Film się przygotowuje — zajrzyj za chwilę.
											</p>
										</>
									)}
								</motion.div>
							) : (
								<motion.img
									key={selectedPhoto.id}
									initial={{ scale: 0.9, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.9, opacity: 0 }}
									src={selectedPhoto.web_url}
									draggable={false}
									drag='x'
									dragDirectionLock
									dragConstraints={{ left: 0, right: 0 }}
									dragElastic={0.6}
									dragMomentum={false}
									style={{ x: dragX, touchAction: 'pan-y' }}
									onDrag={handleDrag}
									onDragEnd={handleDragEnd}
									className='max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-default select-none'
									onClick={(e) => e.stopPropagation()}
								/>
							)}
						</motion.div>
					)}
				</AnimatePresence>

				{photos.length === 0 && !busy && (
					<div className='text-center py-20 text-text-main/40 font-serif italic'>
						Nie ma jeszcze żadnych zdjęć ani filmów. Bądź pierwszy!
					</div>
				)}
			</div>
		</section>
	);
}
