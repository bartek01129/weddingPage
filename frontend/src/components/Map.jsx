import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

const locations = [
	{
		title: 'Ceremonia Ślubna',
		name: 'Kościół na Świętym Krzyżu',
		address: 'ul. Klasztorna 1, 26-016 Nowa Słupia',
		time: 'Ceremonia · 15:00',
		embedSrc:
			'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6197.804067854249!2d21.052971!3d50.8594469!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47181c7dc99d721b%3A0x346e39cf2ad9519a!2sKlasztor%20Misjonarzy%20Oblat%C3%B3w%20Maryi%20Niepokalanej-%20Sanktuarium%20Relikwii%20Drzewa%20Krzy%C5%BCa%20%C5%9Awi%C4%99tego!5e1!3m2!1sen!2spl!4v1771369079322!5m2!1sen!2spl',
		mapsUrl:
			'https://www.google.com/maps/search/?api=1&query=Klasztor+Misjonarzy+Oblat%C3%B3w+Maryi+Niepokalanej+Nowa+S%C5%82upia',
		iframeTitle: 'Mapa Kościół na Świętym Krzyżu',
		animateX: -30,
	},
	{
		title: 'Przyjęcie Weselne',
		name: 'Hotel Echo',
		address: 'ul. Główna 12, 26-060 Cedzyna',
		time: 'Przyjęcie · 17:00',
		embedSrc:
			'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14464.702794548806!2d20.7208445679792!3d50.872042726223604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471827368e8027cd%3A0xc4ba8d2ab9fbb6e7!2sHotel%20ECHO!5e1!3m2!1sen!2spl!4v1769970152763!5m2!1sen!2spl',
		mapsUrl:
			'https://www.google.com/maps/search/?api=1&query=Hotel+Echo+Cedzyna',
		iframeTitle: 'Mapa Hotel Echo Cedzyna',
		animateX: 30,
	},
];

export default function Map() {
	return (
		<section id='map' className='py-20 md:py-24 px-4 bg-primary-bg'>
			<div className='max-w-6xl mx-auto'>
				<SectionHeading
					eyebrow='Lokalizacje'
					title='Jak dojechać?'
					className='mb-14 md:mb-16'
				/>

				<div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14'>
					{locations.map((loc) => (
						<motion.div
							key={loc.title}
							initial={{ opacity: 0, x: loc.animateX }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8, ease: 'easeOut' }}
							viewport={{ once: true }}
							className='space-y-5'
						>
							<div className='text-center lg:text-left'>
								<p className='eyebrow mb-2'>{loc.title}</p>
								<h3 className='text-2xl md:text-3xl font-serif font-medium text-text-main'>
									{loc.name}
								</h3>
							</div>

							{/* Mapa w białej ramie jak fotografia */}
							<div className='bg-white p-2 rounded-2xl shadow-card'>
								<div className='rounded-xl overflow-hidden h-80 md:h-96'>
									<iframe
										src={loc.embedSrc}
										width='100%'
										height='100%'
										style={{ border: 0 }}
										allowFullScreen
										loading='lazy'
										referrerPolicy='no-referrer-when-downgrade'
										title={loc.iframeTitle}
									/>
								</div>
							</div>

							<div className='bg-white rounded-xl shadow-softer border border-accent-green/10 p-6'>
								<div className='flex items-center justify-between gap-4 flex-wrap'>
									<div>
										<p className='text-sm font-light text-text-main/75 mb-1'>
											{loc.address}
										</p>
										<p className='font-serif italic text-accent-gold text-lg'>
											{loc.time}
										</p>
									</div>

									<a
										href={loc.mapsUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-accent-green/40 text-accent-green text-xs font-semibold uppercase tracking-elegant hover:bg-accent-green hover:text-white hover:border-accent-green transition-all whitespace-nowrap'
									>
										<svg
											className='w-4 h-4'
											fill='none'
											stroke='currentColor'
											strokeWidth={2}
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
											/>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
											/>
										</svg>
										Pokaż na mapie
									</a>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
