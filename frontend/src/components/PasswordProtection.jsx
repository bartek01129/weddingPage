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
		}
	}, [onSuccess]);

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
				className='bg-white/95 backdrop-blur-sm rounded-2xl shadow-elegant p-8 max-w-md w-full mx-4'
				initial={{ scale: 0.9, y: 20 }}
				animate={{ scale: 1, y: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
			>
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-serif font-bold text-accent-green mb-2'>
						Paulina & Bartek
					</h1>
					<p className='text-text-main/75 text-sm'>Wpisz hasło, aby wejść</p>
				</div>

				<form onSubmit={handleSubmit} className='space-y-4'>
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
							placeholder='Wpisz hasło'
							className='w-full px-4 py-3 border-2 border-accent-green/30 rounded-lg focus:outline-none focus:border-accent-green text-text-main placeholder-text-main/50 transition-colors'
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
						className='w-full bg-accent-green hover:bg-accent-green/90 disabled:bg-accent-green/50 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2'
						whileHover={{ scale: 1.02 }}
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

				<p className='text-center text-xs text-text-main/50 mt-6'>
					Prywatne zaproszenie na ślub
				</p>
			</motion.div>
		</motion.div>
	);
}
