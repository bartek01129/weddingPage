import React from 'react';
import { motion } from 'framer-motion';
import Ornament from './Ornament';

// Wspólny nagłówek sekcji: eyebrow → tytuł serif → ornament → opcjonalny podtytuł
export default function SectionHeading({
	eyebrow,
	title,
	subtitle,
	tone = 'dark',
	className = '',
}) {
	const titleColor = tone === 'light' ? 'text-white' : 'text-text-main';
	const subtitleColor = tone === 'light' ? 'text-white/75' : 'text-text-main/75';

	return (
		<motion.div
			className={`text-center ${className}`}
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.7, ease: 'easeOut' }}
			viewport={{ once: true }}
		>
			{eyebrow && <p className='eyebrow mb-4'>{eyebrow}</p>}
			<h2
				className={`text-4xl md:text-5xl font-serif font-medium ${titleColor}`}
			>
				{title}
			</h2>
			<Ornament className='mt-6' />
			{subtitle && (
				<p
					className={`mt-6 text-base md:text-lg font-light leading-relaxed ${subtitleColor} max-w-2xl mx-auto`}
				>
					{subtitle}
				</p>
			)}
		</motion.div>
	);
}
