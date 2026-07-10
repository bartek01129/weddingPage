import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

export default function Welcome() {
	return (
		<section id='welcome' className='py-16 md:py-20 px-4 bg-primary-bg'>
			<div className='max-w-4xl mx-auto'>
				<SectionHeading
					eyebrow='Kilka słów od nas'
					title='Drodzy Goście!'
					subtitle='Tu znajdziecie najważniejsze informacje odnośnie ślubu — daty, lokalizacje, mapki, a także potwierdzicie swoją obecność na naszej uroczystości.'
				/>
				<motion.p
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					viewport={{ once: true }}
					className='mt-6 text-center font-serif italic text-xl md:text-2xl text-accent-green'
				>
					Już nie możemy doczekać się spotkania z Wami!
				</motion.p>
			</div>
		</section>
	);
}
