import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api/photos';
const MAX_BYTES = 15 * 1024 * 1024;
const PAGE_SIZE = 40;
const OPTIMISTIC_WINDOW_MS = 60_000;

const ADMIN_TOKEN = new URLSearchParams(window.location.search).get('admin');

function isImage(file) {
	const okType = file.type.startsWith('image/');
	const okHeic = /\.(heic|heif)$/i.test(file.name);
	return okType || okHeic;
}

const SHRINK_STEPS = [
	{ maxPx: 3500, quality: 0.85 },
	{ maxPx: 2600, quality: 0.8 },
	{ maxPx: 2000, quality: 0.75 },
	{ maxPx: 1600, quality: 0.7 },
	{ maxPx: 1600, quality: 0.5 },
];
const SHRINK_TARGET_BYTES = 14 * 1024 * 1024;

async function shrinkImage(file) {
	const bitmap = await createImageBitmap(file);
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
			if (!blob) throw new Error('Nie udało się przetworzyć zdjęcia.');
			last = blob;
			if (blob.size <= SHRINK_TARGET_BYTES) break;
		}
		if (!last || last.size > MAX_BYTES)
			throw new Error('Nie udało się zmniejszyć zdjęcia pod limit.');
		return new File([last], file.name.replace(/\.\w+$/, '') + '.jpg', {
			type: 'image/jpeg',
		});
	} finally {
		bitmap.close();
	}
}

const makeId = () =>
	typeof crypto !== 'undefined' && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function uploadToServer(file, onProgress) {
	return new Promise((resolve, reject) => {
		const fd = new FormData();
		fd.append('file', file);

		const xhr = new XMLHttpRequest();
		xhr.open('POST', API_URL);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};
		xhr.onload = () => {
			let data;
			try {
				data = JSON.parse(xhr.responseText);
			} catch {
				reject(new Error('Błędna odpowiedź serwera'));
				return;
			}
			if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
				resolve(data);
				return;
			}
			if (xhr.status === 409) {
				reject(new Error('Galeria jest pełna — osiągnięto limit zdjęć.'));
			} else if (xhr.status === 429) {
				reject(
					new Error(
						'Za dużo przesłań na raz — odczekaj chwilę i spróbuj ponownie.',
					),
				);
			} else {
				reject(new Error(data?.error || `Błąd uploadu (${xhr.status})`));
			}
		};
		xhr.onerror = () => reject(new Error('Błąd sieci podczas przesyłania'));
		xhr.send(fd);
	});
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

		const accepted = files.filter(isImage);
		const rejected = files.length - accepted.length;
		if (rejected > 0)
			setErrorMsg(`Pominięto ${rejected} plik(ów) — to nie są zdjęcia.`);

		for (let file of accepted) {
			if (file.size > MAX_BYTES) {
				try {
					file = await shrinkImage(file);
				} catch {
					setErrorMsg(
						`Pominięto „${file.name}" — plik jest za duży i nie udało się go zmniejszyć.`,
					);
					continue;
				}
			}
			const id = makeId();
			setQueue((q) => [
				...q,
				{ id, name: file.name, progress: 0, status: 'uploading' },
			]);
			try {
				const data = await uploadToServer(file, (p) =>
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
				setErrorMsg(err.message || 'Nie udało się przesłać zdjęcia.');
			}
		}
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
		if (!window.confirm('Usunąć to zdjęcie?')) return;
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
	const goPrev = () =>
		selectedIndex > 0 && setSelectedId(photos[selectedIndex - 1].id);
	const goNext = () =>
		selectedIndex !== -1 &&
		selectedIndex < photos.length - 1 &&
		setSelectedId(photos[selectedIndex + 1].id);

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
								accept='image/*'
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
									{ADMIN_TOKEN && (
										<button
											onClick={(e) => handleDeletePhoto(e, photo)}
											title='Usuń zdjęcie'
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

							<motion.img
								key={selectedPhoto.id}
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.9, opacity: 0 }}
								src={selectedPhoto.web_url}
								className='max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-default'
								onClick={(e) => e.stopPropagation()}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{photos.length === 0 && !busy && (
					<div className='text-center py-20 text-text-main/40 font-serif italic'>
						Nie ma jeszcze żadnych zdjęć. Bądź pierwszy!
					</div>
				)}
			</div>
		</section>
	);
}
