import React from 'react';
import { motion } from 'framer-motion';

const couples = [
	{ name: 'Paulina', phone: '+48 607 597 506' },
	{ name: 'Bartek', phone: '+48 786 165 293' },
];

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 15 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5 },
	},
};

export default function Contact() {
	return (
		<section
			id='contact'
			className='py-14 md:py-16 px-4 bg-white/20 backdrop-blur-sm border-t border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
					className='text-center mb-10'
				>
					<h2 className='text-2xl md:text-3xl font-serif font-bold text-accent-green'>
						Kontakt
					</h2>
				</motion.div>

				<motion.div
					className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-lg mx-auto'
					variants={containerVariants}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true }}
				>
					{couples.map((person, idx) => (
						<motion.div
							key={idx}
							className='text-center'
							variants={itemVariants}
						>
							<h3 className='text-lg font-serif font-semibold text-text-main mb-3'>
								{person.name}
							</h3>
							<a
								href={`tel:${person.phone.replace(/\s/g, '')}`}
								className='inline-block text-accent-green hover:text-accent-green/70 transition-colors font-sans text-base'
							>
								{person.phone}
							</a>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
