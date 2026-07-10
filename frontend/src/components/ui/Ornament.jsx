import React from 'react';

// Złoty separator w stylu papeterii ślubnej: linia — romb — linia
export default function Ornament({ className = '' }) {
	return (
		<div
			className={`flex items-center justify-center gap-3 ${className}`}
			aria-hidden='true'
		>
			<span className='h-px w-14 bg-gradient-to-r from-transparent to-accent-gold/80' />
			<span className='block w-1.5 h-1.5 rotate-45 bg-accent-gold' />
			<span className='h-px w-14 bg-gradient-to-r from-accent-gold/80 to-transparent' />
		</div>
	);
}
