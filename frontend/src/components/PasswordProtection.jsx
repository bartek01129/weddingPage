import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function PasswordProtection({ onSuccess }) {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [shake, setShake] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const CORRECT_PASSWORD = import.meta.env.VITE_PASSWORD;

	// Auto-login if session is still active
	useEffect(() => {
		const sessionAuth = sessionStorage.getItem('weddingAuth');
		if (sessionAuth === 'authenticated') {
			onSuccess();
			return;
		}

		const urlParams = new URLSearchParams(window.location.search);
		const pwdFromUrl = urlParams.get('pwd');

		if (pwdFromUrl && pwdFromUrl === CORRECT_PASSWORD) {
			sessionStorage.setItem('weddingAuth', 'authenticated');
			// Czyszczenie paska adresu, żeby hasło nie wisiało w URL
			window.history.replaceState(null, '', window.location.pathname);
			onSuccess();
		}

		// Security: Disable developer tools detection (basic)
		const disableDevTools = (e) => {
			if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
				e.preventDefault();
			}
		};
		document.addEventListener('keydown', disableDevTools);
		return () => document.removeEventListener('keydown', disableDevTools);
	}, [onSuccess, CORRECT_PASSWORD]);

	const handleSubmit = (e) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		setTimeout(() => {
			if (password === CORRECT_PASSWORD) {
				sessionStorage.setItem('weddingAuth', 'authenticated');
				setPassword('');
				onSuccess();
			} else {
				setError('Hasło nieprawidłowe');
				setShake(true);
				setPassword('');
				setTimeout(() => setShake(false), 500);
			}
			setIsLoading(false);
		}, 300);
	};

	return (
		<motion.div
			className='fixed inset-0 w-full h-screen bg-gradient-to-br from-primary-bg via-primary-bg to-accent-green/10 flex items-center justify-center z-50'
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<motion.div
				className='relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-card p-8 md:p-10 max-w-md w-full mx-4'
				initial={{ scale: 0.9, y: 20 }}
				animate={{ scale: 1, y: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
			>
				<span
					className='pointer-events-none absolute inset-2 rounded-xl border border-accent-gold/25'
					aria-hidden='true'
				/>

				<div className='relative text-center mb-8'>
					<p className='eyebrow mb-4'>Prywatne zaproszenie</p>
					<h1 className='text-3xl md:text-4xl font-serif font-medium text-text-main mb-2'>
						Paulina{' '}
						<span className='font-serif italic font-normal text-accent-gold'>
							&
						</span>{' '}
						Bartek
					</h1>
					<p className='font-serif italic text-accent-green/80 text-lg mb-5'>
						22 sierpnia 2026
					</p>
					<div
						className='flex items-center justify-center gap-3'
						aria-hidden='true'
					>
						<span className='h-px w-12 bg-gradient-to-r from-transparent to-accent-gold/70' />
						<span className='block w-1.5 h-1.5 rotate-45 bg-accent-gold' />
						<span className='h-px w-12 bg-gradient-to-r from-accent-gold/70 to-transparent' />
					</div>
				</div>

				<form onSubmit={handleSubmit} className='relative space-y-4'>
					<motion.div
						animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
						transition={{ duration: 0.4 }}
					>
						<input
							type='password'
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								setError('');
							}}
							placeholder='Wpisz hasło, aby wejść'
							className='w-full px-4 py-3 border border-accent-green/25 rounded-lg bg-white text-center focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 text-text-main placeholder:text-text-main/40 placeholder:font-light transition-all'
							disabled={isLoading}
							autoFocus
						/>
					</motion.div>

					{error && (
						<motion.p
							className='text-red-500 text-sm text-center font-medium'
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							{error}
						</motion.p>
					)}

					<motion.button
						type='submit'
						disabled={isLoading || !password}
						className='btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed'
						whileTap={{ scale: 0.98 }}
					>
						{isLoading ? (
							<>
								<svg
									className='animate-spin h-5 w-5'
									xmlns='http://www.w3.org/2000/svg'
									fill='none'
									viewBox='0 0 24 24'
								>
									<circle
										className='opacity-25'
										cx='12'
										cy='12'
										r='10'
										stroke='currentColor'
										strokeWidth='4'
									/>
									<path
										className='opacity-75'
										fill='currentColor'
										d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
									/>
								</svg>
								Sprawdzanie...
							</>
						) : (
							'Wejdź'
						)}
					</motion.button>
				</form>

				<p className='relative text-center text-xs font-light text-text-main/50 mt-6'>
					Hasło znajdziesz w swoim zaproszeniu
				</p>
			</motion.div>
		</motion.div>
	);
}
