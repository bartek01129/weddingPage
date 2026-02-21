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
			'Karczek w sosie myśliwskim, kluski śląskie i surówka z kieszonego ogórka',
	},
	{
		id: 4,
		title: 'Kolacja Nocna',
		description: 'Strogonof wołowy z świeżo wypiekaną bagietką',
	},
	{
		id: 5,
		title: 'Początek Nocny',
		description: 'Żurek',
	},
];

export default function Info() {
	return (
		<section id='info' className='py-20 px-4 bg-info-green'>
			<div className='max-w-7xl mx-auto'>
				<motion.div
					className='text-center mb-16'
					initial={{ opacity: 0, y: -20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					viewport={{ once: true }}
				>
					<h2 className='text-4xl md:text-5xl font-serif text-white mb-4'>
						Potrawy
					</h2>
					<div className='w-16 h-1 bg-accent-gold mx-auto rounded-full' />
				</motion.div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
					{infoCards.map((card, i) => (
						<motion.div
							key={card.id}
							custom={i}
							variants={cardVariants}
							initial='hidden'
							whileInView='visible'
							transition={{ duration: 0.1 }}
							viewport={{ once: true }}
							className='bg-white/20 backdrop-blur-sm rounded-xl p-6 shadow-soft hover:shadow-elegant transition-shadow'
						>
							<h3 className='text-lg font-serif font-bold text-accent-gold mb-3'>
								{card.title}
							</h3>
							{card.description && (
								<p className='text-ss text-white/80 mb-3'>{card.description}</p>
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
