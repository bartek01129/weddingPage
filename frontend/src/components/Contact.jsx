import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

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
			className='py-16 md:py-20 px-4 bg-white/40 border-t border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<SectionHeading
					eyebrow='Masz pytania?'
					title='Kontakt'
					className='mb-12'
				/>

				<motion.div
					className='flex flex-col md:flex-row items-center justify-center gap-10 md:gap-0'
					variants={containerVariants}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true }}
				>
					{couples.map((person, idx) => (
						<motion.div
							key={person.name}
							className={`text-center md:px-16 ${
								idx > 0 ? 'md:border-l md:border-accent-green/15' : ''
							}`}
							variants={itemVariants}
						>
							<h3 className='text-2xl font-serif font-medium text-text-main mb-3'>
								{person.name}
							</h3>
							<a
								href={`tel:${person.phone.replace(/\s/g, '')}`}
								className='inline-flex items-center gap-2 text-accent-green hover:text-accent-gold transition-colors font-light text-lg tabular-nums'
							>
								<svg
									className='w-4 h-4 text-accent-gold'
									fill='none'
									stroke='currentColor'
									strokeWidth={1.5}
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
									/>
								</svg>
								{person.phone}
							</a>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
