import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Info from './components/Info';
import Map from './components/Map';
import RSVP from './components/RSVP';
import Footer from './components/Footer';
import Countdown from './components/Countdown';
import Welcome from './components/Welcome';
import Gifts from './components/Gifts';
import Contact from './components/Contact';
import PasswordProtection from './components/PasswordProtection';
import './App.css';

export default function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(
		sessionStorage.getItem('weddingAuth') === 'authenticated',
	);

	useEffect(() => {
		const handleBeforeUnload = () => {
			// Session storage is cleared automatically when the tab is closed
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, []);

	const handleAuthSuccess = () => {
		setIsAuthenticated(true);
	};

	if (!isAuthenticated) {
		return <PasswordProtection onSuccess={handleAuthSuccess} />;
	}

	return (
		<main className='min-h-screen bg-primary-bg text-text-main overflow-x-hidden'>
			<ScrollToTopButton />
			<Hero />
			<Countdown />
			<Welcome />
			<Info />
			<Map />
			<RSVP />
			<Gifts />
			<Contact />
			<Footer />
		</main>
	);
}

function ScrollToTopButton() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const toggleVisibility = () => {
			setIsVisible(window.pageYOffset > 300);
		};
		window.addEventListener('scroll', toggleVisibility);
		return () => window.removeEventListener('scroll', toggleVisibility);
	}, []);

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	if (!isVisible) return null;

	return (
		<button
			onClick={scrollToTop}
			className='fixed bottom-8 right-8 p-3 bg-accent-green text-white rounded-full shadow-elegant hover:shadow-soft hover:scale-110 transition-all z-50'
			title='Powrót do góry'
		>
			<svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
				<path
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
					d='M5 15l7-7 7 7'
				/>
			</svg>
		</button>
	);
}
