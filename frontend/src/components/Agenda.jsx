import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

const infoCards = [
	{
		id: 1,
		title: 'Ceremonia Ślubna',
		time: '15:00',
	},
	{
		id: 2,
		title: 'Powitanie Gości na Sali i Rozpoczęcie Przyjęcia',
		time: '17:00',
	},
	{
		id: 3,
		title: 'Życzenia dla Pary Młodej',
		time: '17:15',
	},
	{
		id: 4,
		title: 'Uroczysty Obiad Weselny',
		time: '17:45',
	},
	{
		id: 5,
		title: 'Pierwszy Taniec',
		time: '18:40',
	},
	{
		id: 6,
		title: 'Kolacja Wieczorna',
		time: '20:30',
	},
	{
		id: 7,
		title: 'Tort Weselny',
		time: '22:00',
	},
	{
		id: 8,
		title: 'Kolacja Nocna',
		time: '23:00',
	},
	{
		id: 9,
		title: 'Oczepiny',
		time: '00:00',
	},
	{
		id: 10,
		title: 'Poczęstunek Nocny',
		time: '01:00',
	},
];

export default function Agenda() {
	return (
		<section id='agenda' className='py-20 md:py-24 px-4 bg-accent-green'>
			<div className='max-w-7xl mx-auto'>
				<SectionHeading
					eyebrow='Sobota · 22 sierpnia 2026'
					title='Orientacyjny przebieg dnia'
					tone='light'
					className='mb-16 md:mb-20'
				/>

				{/* Oś czasu */}
				<div className='relative max-w-3xl mx-auto'>
					<span
						className='absolute left-[5px] md:left-1/2 md:-translate-x-1/2 top-2 bottom-2 w-px bg-white/20'
						aria-hidden='true'
					/>
					<ol className='space-y-10 md:space-y-12'>
						{infoCards.map((card, i) => {
							const isLeft = i % 2 === 0;
							return (
								<motion.li
									key={card.id}
									className='relative pl-10 md:pl-0 md:grid md:grid-cols-2 md:gap-20 md:items-center'
									initial={{ opacity: 0, y: 24 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, ease: 'easeOut' }}
									viewport={{ once: true, margin: '-40px' }}
								>
									{/* Węzeł na osi */}
									<span
										className='absolute left-0 top-2 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-[11px] h-[11px] rotate-45 bg-accent-gold ring-4 ring-accent-green'
										aria-hidden='true'
									/>

									<div
										className={
											isLeft ? 'md:text-right' : 'md:col-start-2 md:text-left'
										}
									>
										<p className='font-serif italic text-accent-gold text-2xl md:text-3xl leading-none mb-2'>
											{card.time}
										</p>
										<h3 className='font-serif font-medium text-white text-xl md:text-2xl leading-snug'>
											{card.title}
										</h3>
									</div>
								</motion.li>
							);
						})}
					</ol>
				</div>
			</div>
		</section>
	);
}
