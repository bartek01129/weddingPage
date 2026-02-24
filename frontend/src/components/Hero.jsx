import React from 'react';
import { motion } from 'framer-motion';
import couplePhoto from '../assets/couple.jpg';
// Replace this import with your actual photo:
// import couplePhoto from '../assets/couple.jpg';

export default function Hero() {
	// Fallback gradient when no photo is provided
	const hasPhoto = true; // set to true and import couplePhoto once you add your image

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
				delayChildren: 0.2,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.6, ease: 'easeOut' },
		},
	};

	return (
		<section id='hero' className='relative w-full h-screen overflow-hidden'>
			{/* Background */}
			<div className='absolute inset-0 w-full h-full'>
				{hasPhoto ? (
					<img
						src={couplePhoto}
						alt='Paulina & Bartek'
						className='w-full h-full object-cover md:object-[center_30%]'
					/>
				) : (
					<div className='w-full h-full bg-gradient-to-br from-accent-green via-accent-green/90 to-accent-green/70' />
				)}
				<div className='absolute inset-0 bg-black/40' />
			</div>

			{/* Content */}
			<motion.div
				className='relative z-10 w-full h-full flex flex-col items-center justify-center px-4'
				variants={containerVariants}
				initial='hidden'
				animate='visible'
			>
				<motion.h1
					variants={itemVariants}
					className='text-5xl md:text-7xl font-serif font-bold text-white text-center mb-3'
				>
					Paulina & Bartek
				</motion.h1>

				<motion.p
					variants={itemVariants}
					className='text-lg md:text-xl text-white/80 text-center mb-8 font-light'
				>
					Zapraszamy do udziału w naszym wielkim dniu
				</motion.p>

				<motion.div
					variants={itemVariants}
					className='flex justify-center mb-10'
				>
					<div className='text-center py-4 px-8 bg-white/10 backdrop-blur-sm rounded-xl'>
						<p className='text-white font-serif text-3xl md:text-4xl font-bold'>
							22 Sierpnia 2026
						</p>
						<p className='text-white/60 text-sm mt-2'>Sobota</p>
					</div>
				</motion.div>

				<motion.div variants={itemVariants} className='flex justify-center'>
					<a
						href='#rsvp'
						className='px-1 py-3 border border-white/60 text-white backdrop-blur-sm font-serif text-lg tracking-widest uppercase hover:bg-white/20 transition-all duration-300'
					>
						Potwierdź Przybycie
					</a>
				</motion.div>
			</motion.div>
		</section>
	);
}
