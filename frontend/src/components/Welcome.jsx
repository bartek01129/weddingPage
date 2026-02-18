import React from 'react';
import { motion } from 'framer-motion';

export default function Welcome() {
	return (
		<section id='welcome' className='py-12 md:py-14 px-4 bg-primary-bg'>
			<div className='max-w-4xl mx-auto'>
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
					className='text-center'
				>
					<h2 className='text-2xl md:text-3xl font-serif font-bold text-accent-green mb-4'>
						Drodzy goście!
					</h2>
					<p className='text-base md:text-lg text-text-main/80 leading-relaxed max-w-2xl mx-auto'>
						Tu znajdziecie najważniejsze informacje odnośnie ślubu - daty,
						lokalizacje, mapki, a także potwierdzicie swoją obecność na naszej
						uroczystości. Już nie możemy doczekać się spotkania z Wami!
					</p>
				</motion.div>
			</div>
		</section>
	);
}
