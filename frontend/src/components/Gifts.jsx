import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

export default function Gifts() {
	return (
		<section
			id='gifts'
			className='py-16 md:py-20 px-4 bg-primary-bg border-t border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<SectionHeading eyebrow='Zamiast kwiatów' title='Prezenty' />
				<motion.p
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					viewport={{ once: true }}
					className='mt-6 text-center font-serif italic text-xl md:text-2xl text-text-main/85 leading-relaxed max-w-2xl mx-auto'
				>
					Będzie nam bardzo miło, jeśli zamiast kwiatów obdarujecie nas pomocną
					cegiełką na naszą wspólną przyszłość.
				</motion.p>
			</div>
		</section>
	);
}
