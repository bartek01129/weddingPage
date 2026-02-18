import React from 'react';
import { motion } from 'framer-motion';

export default function Gifts() {
	return (
		<section
			id='gifts'
			className='py-14 md:py-16 px-4 bg-primary-bg border-t border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
					className='text-center'
				>
					<h2 className='text-2xl md:text-3xl font-serif font-bold text-accent-green mb-4'>
						Prezenty
					</h2>
					<p className='text-base md:text-lg text-text-main/75 leading-relaxed max-w-2xl mx-auto'>
						Będzie nam bardzo miło, jeśli zamiast kwiatów obdarujecie nas
						pomocną cegiełką na naszą wspólną przyszłość.
					</p>
				</motion.div>
			</div>
		</section>
	);
}
