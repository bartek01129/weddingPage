import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

const infoCards = [
	{
		id: 1,
		title: 'Obiad Weselny',
		description: 'Rosół z kury z makaronem',
	},
	{
		id: 2,
		title: 'Obiad Weselny',
		description:
			'Filet z kurczaka faszerowany szpinakiem i serem mozzarella, sos pieprzowy, gratin ziemniaczany i zestaw surówek',
	},
	{
		id: 3,
		title: 'Kolacja Wieczorna',
		description:
			'Karczek w sosie myśliwskim, kluski śląskie i surówka z kiszonego ogórka',
	},
	{
		id: 4,
		title: 'Kolacja Nocna',
		description: 'Strogonof wołowy ze świeżo wypiekaną bagietką',
	},
	{
		id: 5,
		title: 'Poczęstunek Nocny',
		description: 'Żurek',
	},
];

export default function Info() {
	return (
		<section id='info' className='py-20 md:py-24 px-4 bg-info-green'>
			<div className='max-w-7xl mx-auto'>
				<SectionHeading
					eyebrow='Menu weselne'
					title='Potrawy'
					tone='light'
					className='mb-14 md:mb-16'
				/>

				{/* Karta menu */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: 'easeOut' }}
					viewport={{ once: true }}
					className='relative max-w-2xl mx-auto rounded-2xl border border-accent-gold/40 bg-white/5 backdrop-blur-sm p-8 md:p-14 text-center'
				>
					<span
						className='pointer-events-none absolute inset-2 rounded-xl border border-accent-gold/20'
						aria-hidden='true'
					/>

					{infoCards.map((card, i) => {
						const isNewCourse =
							i === 0 || infoCards[i - 1].title !== card.title;
						return (
							<React.Fragment key={card.id}>
								{isNewCourse && i > 0 && (
									<div
										className='flex items-center justify-center gap-3 my-8'
										aria-hidden='true'
									>
										<span className='h-px w-10 bg-gradient-to-r from-transparent to-accent-gold/50' />
										<span className='block w-1 h-1 rotate-45 bg-accent-gold/70' />
										<span className='h-px w-10 bg-gradient-to-r from-accent-gold/50 to-transparent' />
									</div>
								)}
								{isNewCourse && (
									<h3 className='font-serif italic text-accent-gold text-xl md:text-2xl mb-3'>
										{card.title}
									</h3>
								)}
								<p
									className={`text-white/85 font-light text-sm md:text-base leading-relaxed max-w-lg mx-auto ${
										isNewCourse ? '' : 'mt-3'
									}`}
								>
									{card.description}
								</p>
							</React.Fragment>
						);
					})}
				</motion.div>
			</div>
		</section>
	);
}
