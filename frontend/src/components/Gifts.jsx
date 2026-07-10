import React from 'react';
import { motion } from 'framer-motion';
import Ornament from './ui/Ornament';

export default function Gifts() {
	return (
		<section
			id='gifts'
			className='py-20 md:py-24 px-4 bg-primary-bg border-t border-accent-green/10'
		>
			<motion.div
				className='max-w-3xl mx-auto text-center'
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				viewport={{ once: true }}
			>
				<Ornament className='mb-8' />

				{/* Ikona prezentu */}
				<div className='flex justify-center mb-6 text-accent-gold'>
					<svg
						width='36'
						height='36'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth={1.3}
						strokeLinecap='round'
						strokeLinejoin='round'
						aria-hidden='true'
					>
						<path d='M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7' />
						<path d='M2 8.5A1.5 1.5 0 013.5 7h17A1.5 1.5 0 0122 8.5V11a1 1 0 01-1 1H3a1 1 0 01-1-1V8.5z' />
						<path d='M12 7v13' />
						<path d='M12 7C11 4 9.5 3 8 3.4 6.3 3.9 6.6 6.2 8 7h4z' />
						<path d='M12 7c1-3 2.5-4 4-3.6 1.7.5 1.4 2.8 0 3.6h-4z' />
					</svg>
				</div>

				<p className='eyebrow mb-4'>Podziękowanie</p>
				<h2 className='text-3xl md:text-4xl font-serif font-medium text-text-main mb-6'>
					Prezenty
				</h2>
				<p className='text-base md:text-lg text-text-main/70 leading-relaxed max-w-2xl mx-auto font-light'>
					Największym prezentem będzie Wasza obecność w tym wyjątkowym dniu.
					Jeśli jednak chcielibyście obdarować nas upominkiem, zamiast kwiatów i
					prezentów prosimy o cegiełkę na wykończenie naszego domu.
				</p>
			</motion.div>
		</section>
	);
}
