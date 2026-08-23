import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';
import Ornament from './ui/Ornament';

export default function Thanks() {
	return (
		<section
			id='podziekowania'
			className='py-16 md:py-24 px-4 bg-primary-bg scroll-mt-20'
		>
			<div className='max-w-3xl mx-auto'>
				<SectionHeading
					eyebrow='22 sierpnia 2026'
					title='Dziękujemy!'
					subtitle='Ten dzień był dla nas najważniejszy i to Wy sprawiliście, że stał się niezapomniany!!!'
				/>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
					viewport={{ once: true }}
					className='relative mt-12 rounded-2xl border border-accent-gold/30 bg-white/60 backdrop-blur-sm shadow-card p-8 md:p-12'
				>
					<span
						className='pointer-events-none absolute inset-2 rounded-xl border border-accent-gold/20'
						aria-hidden='true'
					/>

					<div className='relative space-y-6 text-center text-base md:text-lg font-light leading-relaxed text-text-main/80'>
						<p>
							Kochani, z całego serca dziękujemy Wam za to, że byliście z nami w
							tym wyjątkowym dniu. Wasza obecność, ciepłe słowa i uśmiechy
							sprawiły, że nasz ślub był dokładnie taki, o jakim marzyliśmy.
						</p>
						<p>
							Dziękujemy za wspólną zabawę do białego rana, za każdy taniec,
							każdy toast i każdą rozmowę. Za wzruszenia podczas ceremonii i za
							śmiech, który niósł się przez całą noc. To dzięki Wam ten dzień
							miał tyle radości.
						</p>
						<p>
							Dziękujemy również za wszystkie życzenia, prezenty i dobre myśli,
							które nam towarzyszyły. Zabieramy je ze sobą w naszą wspólną
							drogę.
						</p>
						<p>
							Ten dzień minął zdecydowanie zbyt szybko, ale wspomnienia zostaną
							z nami na zawsze i mamy nadzieję, że z Wami również.
						</p>
					</div>

					<Ornament className='relative mt-10' />

					<p className='relative mt-8 text-center font-serif italic text-2xl md:text-3xl text-accent-green'>
						Paulina &amp; Bartek
					</p>
				</motion.div>
			</div>
		</section>
	);
}
