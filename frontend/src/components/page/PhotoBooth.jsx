import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_URL = '/api/photos';

export default function PhotoBooth() {
	const navigate = useNavigate();
	const [photos, setPhotos] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [selectedImage, setSelectedImage] = useState(null);
	const [loadedImages, setLoadedImages] = useState(new Set());

	const fetchPhotos = async () => {
		try {
			const res = await fetch(API_URL);
			const data = await res.json();
			setPhotos(data);
		} catch (err) {
			console.error('Błąd pobierania galerii');
		}
	};

	useEffect(() => {
		fetchPhotos();
		window.scrollTo(0, 0);
	}, []);

	const handleUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		setUploading(true);

		const formData = new FormData();
		formData.append('file', file);
		formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

		try {
			const cloudRes = await fetch(
				`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
				{ method: 'POST', body: formData },
			);
			const cloudData = await cloudRes.json();

			if (cloudData.secure_url) {
				const dbRes = await fetch(API_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: cloudData.secure_url,
						public_id: cloudData.public_id,
					}),
				});

				if (dbRes.ok) {
					fetchPhotos();
				}
			}
		} catch (err) {
			alert('Wystąpił błąd podczas przesyłania zdjęcia. Spróbuj ponownie!');
		} finally {
			setUploading(false);
			e.target.value = '';
		}
	};

	useEffect(() => {
		const handleEsc = (e) => {
			if (e.key === 'Escape') setSelectedImage(null);
		};

		if (selectedImage) {
			window.addEventListener('keydown', handleEsc);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			window.removeEventListener('keydown', handleEsc);
			document.body.style.overflow = 'unset';
		};
	}, [selectedImage]);

	return (
		<section className='min-h-screen py-10 px-4 bg-primary-bg'>
			<div className='max-w-4xl mx-auto'>
				<div className='flex justify-start mb-8'>
					<button
						onClick={() => navigate('/')}
						className='flex items-center gap-2 text-accent-green font-semibold hover:opacity-70 transition-opacity'
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

				<div className='text-center mb-12'>
					<motion.h2
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						className='text-4xl md:text-5xl font-serif font-bold text-accent-green mb-4'
					>
						Galeria Weselna
					</motion.h2>
					<p className='text-text-main/70 italic'>
						Uwiecznijmy te chwile razem!
					</p>
				</div>

				{/* Sekcja Aparatu*/}
				<div className='sticky top-4 z-30 mb-12 flex justify-center'>
					<div className='bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-3xl shadow-elegant border border-accent-green/10 w-full max-w-md'>
						<div className='flex flex-row gap-3 justify-center'>
							{/* INPUT DLA APARATU */}
							<input
								type='file'
								accept='image/*'
								capture='environment'
								onChange={handleUpload}
								id='camera-input'
								className='hidden'
								disabled={uploading}
							/>
							<label
								htmlFor='camera-input'
								className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-accent-green text-white rounded-2xl font-bold shadow-lg cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${
									uploading ? 'opacity-50 cursor-not-allowed' : ''
								}`}
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
								onChange={handleUpload}
								id='gallery-input'
								className='hidden'
								disabled={uploading}
							/>
							<label
								htmlFor='gallery-input'
								className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-white text-accent-green border-2 border-accent-green rounded-2xl font-bold shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${
									uploading ? 'opacity-50 cursor-not-allowed' : ''
								}`}
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

						{uploading && (
							<div className='mt-4 flex items-center justify-center gap-3 text-accent-green font-medium animate-pulse'>
								<div className='animate-spin h-4 w-4 border-2 border-accent-green border-t-transparent rounded-full' />
								<span>Przesyłanie Twojego wspomnienia...</span>
							</div>
						)}
					</div>
				</div>

				{/* Siatka zdjęć */}
				<div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6'>
					<AnimatePresence>
						{photos.map((photo) => (
							<motion.div
								key={photo.id}
								layout
								onClick={() => setSelectedImage(photo.url)}
								className='group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft bg-white border-4 border-white cursor-pointer'
							>
								<div className='relative w-full h-full bg-accent-green/10'>
									{!loadedImages.has(photo.id) && (
										<div className='absolute inset-0 bg-gradient-to-br from-accent-green/10 to-accent-gold/10 animate-pulse rounded-2xl' />
									)}
									<img
										src={photo.url.replace(
											'/upload/',
											'/upload/w_400,h_533,c_fill,g_auto,q_auto:eco,f_auto/',
										)}
										alt='Wedding moment'
										loading='lazy'
										onLoad={() =>
											setLoadedImages((prev) => new Set([...prev, photo.id]))
										}
										className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
											loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'
										}`}
									/>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				{/* LIGHTBOX - Widok pełnoekranowy */}
				<AnimatePresence>
					{selectedImage && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSelectedImage(null)}
							className='fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out'
						>
							<button
								onClick={() => setSelectedImage(null)}
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

							<motion.img
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.9, opacity: 0 }}
								src={selectedImage.replace(
									'/upload/',
									'/upload/q_auto,f_auto/',
								)}
								className='max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-default'
								onClick={(e) => e.stopPropagation()}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{photos.length === 0 && !uploading && (
					<div className='text-center py-20 text-text-main/40 font-serif italic'>
						Nie ma jeszcze żadnych zdjęć. Bądź pierwszy!
					</div>
				)}
			</div>
		</section>
	);
}
