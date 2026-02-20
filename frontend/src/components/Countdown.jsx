import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const TimeUnit = ({ value, label }) => (
	<div className='flex flex-col items-center'>
		<div className='text-2xl md:text-3xl font-serif font-bold text-accent-green'>
			{String(value).padStart(2, '0')}
		</div>
		<div className='text-xs md:text-sm text-accent-green/60 uppercase tracking-widest font-semibold'>
			{label}
		</div>
	</div>
);

export default function Countdown() {
	const [timeLeft, setTimeLeft] = useState({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	useEffect(() => {
		const calculateTimeLeft = () => {
			const weddingDate = new Date('2026-08-22T15:00:00').getTime();
			const now = new Date().getTime();
			const distance = weddingDate - now;

			if (distance > 0) {
				setTimeLeft({
					days: Math.floor(distance / (1000 * 60 * 60 * 24)),
					hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
					minutes: Math.floor((distance / 1000 / 60) % 60),
					seconds: Math.floor((distance / 1000) % 60),
				});
			}
		};

		calculateTimeLeft();
		const timer = setInterval(calculateTimeLeft, 1000);
		return () => clearInterval(timer);
	}, []);

	return (
		<section
			id='countdown'
			className='py-8 md:py-10 px-4 bg-primary-bg border-b border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.4 }}
					viewport={{ once: true }}
					className='text-center'
				>
					<div className='flex justify-center gap-3 md:gap-6 flex-wrap'>
						<TimeUnit value={timeLeft.days} label='Dni' />
						<TimeUnit value={timeLeft.hours} label='Godzin' />
						<TimeUnit value={timeLeft.minutes} label='Minut' />
						<TimeUnit value={timeLeft.seconds} label='Sekund' />
					</div>
				</motion.div>
			</div>
		</section>
	);
}
