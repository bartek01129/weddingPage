import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const TimeUnit = ({ value, label }) => (
	<div className='flex flex-col items-center min-w-[4.5rem]'>
		<div className='text-4xl md:text-5xl font-serif font-medium text-accent-green tabular-nums'>
			{String(value).padStart(2, '0')}
		</div>
		<div className='mt-2 text-xs text-accent-gold uppercase tracking-elegant font-semibold'>
			{label}
		</div>
	</div>
);

const Separator = () => (
	<span
		className='hidden sm:block w-px h-12 bg-accent-green/15 self-center'
		aria-hidden='true'
	/>
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
			className='py-12 md:py-16 px-4 bg-primary-bg border-b border-accent-green/10'
		>
			<div className='max-w-4xl mx-auto'>
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className='text-center'
				>
					<p className='eyebrow mb-8'>Do naszego wielkiego dnia pozostało</p>
					<div className='flex justify-center gap-5 md:gap-10 flex-wrap'>
						<TimeUnit value={timeLeft.days} label='Dni' />
						<Separator />
						<TimeUnit value={timeLeft.hours} label='Godzin' />
						<Separator />
						<TimeUnit value={timeLeft.minutes} label='Minut' />
						<Separator />
						<TimeUnit value={timeLeft.seconds} label='Sekund' />
					</div>
				</motion.div>
			</div>
		</section>
	);
}
