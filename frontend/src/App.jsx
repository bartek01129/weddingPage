import { useState, useEffect } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	Link,
} from 'react-router-dom';
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
import Songs from './components/Songs';
import PhotoBooth from './components/page/PhotoBooth';
import './App.css';
import Agenda from './components/Agenda';

export default function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(
		sessionStorage.getItem('weddingAuth') === 'authenticated',
	);

	const handleAuthSuccess = () => {
		setIsAuthenticated(true);
	};

	return (
		<Router>
			<main className='min-h-screen bg-primary-bg text-text-main overflow-x-hidden'>
				<ScrollToTopButton />

				<Routes>
					{/* STRONA GŁÓWNA */}
					<Route
						path='/'
						element={
							!isAuthenticated ? (
								<PasswordProtection onSuccess={handleAuthSuccess} />
							) : (
								<>
									<Hero />
									<Countdown />
									<Welcome />

									<section className='py-12 bg-white/30 backdrop-blur-sm text-center'>
										<div className='max-w-4xl mx-auto px-4'>
											<h3 className='text-2xl font-serif font-bold text-accent-green mb-6'>
												Podziel się z nami swoimi chwilami!
											</h3>
											<Link
												to='/galeria'
												className='inline-block bg-accent-green text-white px-10 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform'
											>
												Otwórz Galerię Zdjęć
											</Link>
										</div>
									</section>
									<Agenda />
									<Info />
									<Map />
									<RSVP />
									<Gifts />
									<Contact />
									<Songs />
									<Footer />
								</>
							)
						}
					/>

					{/* PODSTRONA GALERII */}
					<Route
						path='/galeria'
						element={
							isAuthenticated ? (
								<PhotoBooth />
							) : (
								<PasswordProtection onSuccess={handleAuthSuccess} />
							)
						}
					/>

					{/* Obsługa błędnych adresów */}
					<Route path='*' element={<Navigate to='/' />} />
				</Routes>
			</main>
		</Router>
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
			<svg
				className='w-6 h-6'
				fill='none'
				stroke='currentColor'
				viewBox='0 0 24 24'
			>
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
