import React from 'react';
import { motion } from 'framer-motion';
import couplePhoto from '../assets/couple.jpg';

export default function Hero() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.18,
				delayChildren: 0.3,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 18 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.9, ease: 'easeOut' },
		},
	};

	return (
		<section id='hero' className='relative w-full h-screen overflow-hidden'>
			{/* Tło */}
			<div className='absolute inset-0 w-full h-full'>
				<motion.img
					src={couplePhoto}
					alt='Paulina & Bartek'
					className='w-full h-full object-cover md:object-[center_30%]'
					initial={{ scale: 1.08 }}
					animate={{ scale: 1 }}
					transition={{ duration: 2.4, ease: 'easeOut' }}
				/>
				<div className='absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60' />
			</div>

			{/* Treść */}
			<motion.div
				className='relative z-10 w-full h-full flex flex-col items-center justify-center px-4 text-center'
				variants={containerVariants}
				initial='hidden'
				animate='visible'
			>
				<motion.div
					variants={itemVariants}
					className='flex items-center gap-4 mb-8'
				>
					<span
						className='h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-white/60'
						aria-hidden='true'
					/>
					<p className='text-white/85 text-xs md:text-sm font-sans font-medium uppercase tracking-wider2'>
						Zapraszamy na nasz ślub
					</p>
					<span
						className='h-px w-10 md:w-16 bg-gradient-to-r from-white/60 to-transparent'
						aria-hidden='true'
					/>
				</motion.div>

				<motion.h1
					variants={itemVariants}
					className='font-serif font-medium text-white text-5xl md:text-7xl lg:text-8xl leading-[1.1] mb-8'
				>
					Paulina{' '}
					<span className='font-serif italic font-normal text-accent-gold'>
						&
					</span>{' '}
					Bartek
				</motion.h1>

				<motion.div variants={itemVariants} className='mb-8'>
					<div
						className='flex items-center justify-center gap-3'
						aria-hidden='true'
					>
						<span className='h-px w-14 bg-gradient-to-r from-transparent to-accent-gold/90' />
						<span className='block w-1.5 h-1.5 rotate-45 bg-accent-gold' />
						<span className='h-px w-14 bg-gradient-to-r from-accent-gold/90 to-transparent' />
					</div>
				</motion.div>

				<motion.p
					variants={itemVariants}
					className='font-serif italic text-white/90 text-2xl md:text-3xl mb-3'
				>
					22 sierpnia 2026
				</motion.p>

				<motion.p
					variants={itemVariants}
					className='text-white/70 text-xs md:text-sm font-sans uppercase tracking-elegant mb-12'
				>
					Sobota &middot; godz. 15:00
				</motion.p>

				<motion.div variants={itemVariants}>
					<a
						href='#rsvp'
						className='inline-block px-10 py-4 border border-white/70 rounded-full text-white font-sans font-semibold text-sm uppercase tracking-elegant backdrop-blur-sm hover:bg-white hover:text-accent-green hover:border-white transition-all duration-500'
					>
						Potwierdź przybycie
					</a>
				</motion.div>
			</motion.div>

			{/* Wskaźnik przewijania */}
			<motion.a
				href='#countdown'
				aria-label='Przewiń w dół'
				className='absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 2, duration: 1 }}
			>
				<motion.span
					className='block w-px h-12 bg-gradient-to-b from-transparent via-white/70 to-white/20'
					animate={{ scaleY: [1, 0.6, 1] }}
					transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
					style={{ transformOrigin: 'top' }}
				/>
			</motion.a>
		</section>
	);
}
