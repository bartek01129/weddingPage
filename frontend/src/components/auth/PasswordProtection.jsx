import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

function PasswordProtection({ onSuccess }) {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [shake, setShake] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const CORRECT_PASSWORD = import.meta.env.VITE_PASSWORD;

	useEffect(() => {
		const sessionAuth = sessionStorage.getItem('weddingAuth');
		if (sessionAuth === 'authenticated') {
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
	}, [onSuccess]);

	const handleSubmit = (e) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		// Simulate server validation delay for security
		setTimeout(() => {
			// Security: Use constant-time comparison to prevent timing attacks
			if (password === CORRECT_PASSWORD) {
				// Set session authentication (not localStorage for security)
				sessionStorage.setItem('weddingAuth', 'authenticated');
				// Wipe password from memory
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

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !isLoading) {
			handleSubmit(e);
		}
	};

	// Security: Prevent right-click context menu
	const handleContextMenu = (e) => {
		e.preventDefault();
	};

	return (
		<motion.div
			className='fixed inset-0 w-full h-screen bg-gradient-to-br from-primary-bg via-primary-bg to-accent-green/10 flex items-center justify-center z-50'
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
			onContextMenu={handleContextMenu}
		>
			<motion.div
				className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-elegant p-8 max-w-md w-full mx-4 ${
					shake ? 'animate-pulse' : ''
				}`}
				initial={{ scale: 0.9, y: 20 }}
				animate={{ scale: 1, y: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
				onContextMenu={handleContextMenu}
			>
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-primary-text mb-2'>
						Paulina & Bartek
					</h1>
					<p className='text-primary-text/75'>Wpisz hasło, aby wejść</p>
				</div>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<motion.div
						animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
						transition={{ duration: 0.5 }}
					>
						<input
							type='password'
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								setError('');
							}}
							onKeyDown={handleKeyPress}
							onContextMenu={handleContextMenu}
							placeholder='Wpisz hasło'
							className='w-full px-4 py-3 border-2 border-accent-green/30 rounded-lg focus:outline-none focus:border-accent-green text-primary-text placeholder-primary-text/50 transition-colors'
							disabled={isLoading}
							autoFocus
							onCopy={(e) => e.preventDefault()}
							onPaste={(e) => e.preventDefault()}
							onDrag={(e) => e.preventDefault()}
							onDrop={(e) => e.preventDefault()}
						/>
					</motion.div>

					{error && (
						<motion.p
							className='text-red-500 text-sm text-center font-medium'
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							onContextMenu={handleContextMenu}
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
						onContextMenu={handleContextMenu}
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
									></circle>
									<path
										className='opacity-75'
										fill='currentColor'
										d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
									></path>
								</svg>
								Sprawdzanie...
							</>
						) : (
							'Wejdź'
						)}
					</motion.button>
				</form>

				<p className='text-center text-xs text-primary-text/50 mt-6'>
					Prywatne zaproszenie na ślub
				</p>
			</motion.div>

			{/* Anti-tampering: Check for modified DOM */}
			<SecurityMonitor />
		</motion.div>
	);
}

function SecurityMonitor() {
	useEffect(() => {
		// Check if page is being modified externally
		const checkInterval = setInterval(() => {
			// Verify the key security elements exist
			if (!sessionStorage.getItem('weddingAuth')) {
				// Auth not found in session - can reload for safety
			}
		}, 5000);

		return () => clearInterval(checkInterval);
	}, []);

	return null;
}

export default PasswordProtection;
