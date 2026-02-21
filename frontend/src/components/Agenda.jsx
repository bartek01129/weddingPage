import React from 'react';
import { motion } from 'framer-motion';

const cardVariants = {
	hidden: { opacity: 0, y: 30 },
	visible: (i) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: i * 0.2,
			duration: 0.6,
			ease: 'easeOut',
		},
	}),
};

const infoCards = [
	{
		id: 1,
		title: 'Ceremonia Ślubna',
		time: '15:00',
	},
	{
		id: 2,
		title: 'Powitanie Gości i Rozpoczęcie Przyjęcia',
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
		time: '00:30',
	},
];

export default function Agenda() {
	return (
		<section id='agenda' className='py-20 px-4 bg-accent-green'>
			<div className='max-w-7xl mx-auto'>
				<motion.div
					className='text-center mb-16'
					initial={{ opacity: 0, y: -20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					viewport={{ once: true }}
				>
					<h2 className='text-4xl md:text-5xl font-serif text-white mb-4'>
						Przebieg
					</h2>
					<div className='w-16 h-1 bg-accent-gold mx-auto rounded-full' />
				</motion.div>

				<div className='grid grid-cols-1 md:grid-cols-5 gap-8'>
					{infoCards.map((card, i) => (
						<motion.div
							key={card.id}
							custom={i}
							variants={cardVariants}
							initial='hidden'
							whileInView='visible'
							transition={{ duration: 0.1 }}
							viewport={{ once: true }}
							className='bg-white/20 backdrop-blur-sm rounded-xl p-6 shadow-soft hover:shadow-elegant transition-shadow flex flex-col'
						>
							<h3 className='text-lg font-serif font-bold text-white mb-3 flex-1'>
								{card.title}
							</h3>
							{card.time && (
								<p className='text-accent-gold font-semibold text-base mt-auto'>
									{card.time}
								</p>
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
