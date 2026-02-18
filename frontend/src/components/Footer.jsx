import React from 'react';
import { motion } from 'framer-motion';

const navLinks = [
	{ name: 'STRONA GŁÓWNA', href: '#hero' },
	{ name: 'POTWIERDZENIE PRZYBYCIA', href: '#rsvp' },
	{ name: 'LOKALIZACJA', href: '#map' },
];

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className='bg-accent-green text-white py-16 px-4'>
			<div className='max-w-6xl mx-auto'>
				{/* Navigation Links */}
				<motion.div
					className='text-center mb-12 pb-8 border-b border-white/10'
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<div className='flex flex-wrap justify-center gap-6 md:gap-8'>
						{navLinks.map((link, idx) => (
							<a
								key={idx}
								href={link.href}
								className='text-white/80 hover:text-white transition-colors font-sans text-sm'
							>
								{link.name}
							</a>
						))}
					</div>
				</motion.div>

				{/* Main Content */}
				<div className='flex justify-center mb-12'>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className='text-center max-w-sm'
					>
						<h3 className='text-2xl font-serif mb-4'>Paulina & Bartek</h3>
						<p className='text-white/80 text-sm leading-relaxed'>
							Zapraszamy Cię do udziału w naszym wielkim dniu. Twoja obecność
							oznacza dla nas całe szczęście.
						</p>
					</motion.div>
				</div>

				<div className='h-px bg-white/20 my-8' />

				<motion.div
					className='text-center'
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ delay: 0.3, duration: 0.6 }}
					viewport={{ once: true }}
				>
					<p className='text-sm text-white/70 mb-2'>
						Made with ❤️ for our special day
					</p>
					<p className='text-xs text-white/60'>
						© {currentYear} Paulina & Bartek. All rights reserved.
					</p>
					<div className='mt-4 flex justify-center gap-6 text-sm text-white/60'>
						<a href='#hero' className='hover:text-white transition-colors'>
							Powrót do góry ↑
						</a>
					</div>
				</motion.div>
			</div>
		</footer>
	);
}
