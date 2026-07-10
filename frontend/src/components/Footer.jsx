import React from 'react';
import { motion } from 'framer-motion';

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className='bg-accent-green text-white py-16 md:py-20 px-4'>
			<div className='max-w-6xl mx-auto'>
				{/* Monogram */}
				<div className='flex justify-center mb-14'>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className='text-center max-w-md'
					>
						<h3 className='text-3xl md:text-4xl font-serif font-medium mb-2'>
							Paulina{' '}
							<span className='font-serif italic font-normal text-accent-gold'>
								&
							</span>{' '}
							Bartek
						</h3>
						<p className='text-accent-gold/90 font-serif italic text-lg mb-5'>
							22 sierpnia 2026
						</p>
						<div
							className='flex items-center justify-center gap-3 mb-6'
							aria-hidden='true'
						>
							<span className='h-px w-14 bg-gradient-to-r from-transparent to-accent-gold/70' />
							<span className='block w-1.5 h-1.5 rotate-45 bg-accent-gold' />
							<span className='h-px w-14 bg-gradient-to-r from-accent-gold/70 to-transparent' />
						</div>
						<p className='text-white/75 text-sm font-light leading-relaxed'>
							Zapraszamy Cię do udziału w naszym wielkim dniu. Twoja obecność
							oznacza dla nas całe szczęście.
						</p>
					</motion.div>
				</div>

				<div className='h-px bg-white/15 my-8' />

				<motion.div
					className='text-center'
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ delay: 0.3, duration: 0.6 }}
					viewport={{ once: true }}
				>
					<p className='text-sm text-white/70 mb-2 font-light'>
						Made with <span className='text-accent-gold'>❤</span> for our
						special day
					</p>
					<p className='text-xs text-white/50 font-light'>
						© {currentYear} Paulina & Bartek. All rights reserved.
					</p>
				</motion.div>
			</div>
		</footer>
	);
}
