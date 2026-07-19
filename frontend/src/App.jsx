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

									<section className='py-16 px-4 bg-primary-bg'>
										<div className='max-w-2xl mx-auto'>
											<div className='relative rounded-2xl border border-accent-gold/30 bg-white/60 backdrop-blur-sm shadow-card p-10 md:p-12 text-center'>
												<span
													className='pointer-events-none absolute inset-2 rounded-xl border border-accent-gold/20'
													aria-hidden='true'
												/>
												{/* Ikona aparatu */}
												<div className='flex justify-center mb-6 text-accent-gold'>
													<svg
														width='36'
														height='36'
														viewBox='0 0 24 24'
														fill='none'
														stroke='currentColor'
														strokeWidth={1.3}
														strokeLinecap='round'
														strokeLinejoin='round'
														aria-hidden='true'
													>
														<path d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' />
														<circle cx='12' cy='13' r='3.5' />
														<path d='M17.5 9.5h.01' />
													</svg>
												</div>
												<p className='eyebrow mb-4'>Wspólna galeria</p>
												<h3 className='text-2xl md:text-3xl font-serif font-medium text-text-main mb-4'>
													Podziel się z nami swoimi chwilami!
												</h3>
												<p className='text-sm md:text-base font-light text-text-main/75 mb-8 max-w-md mx-auto'>
													Wgrajcie zdjęcia z naszego wielkiego dnia — razem
													stworzymy wspólny album pełen wspomnień.
												</p>
												<Link to='/galeria' className='btn-primary'>
													Otwórz galerię zdjęć
												</Link>
											</div>
										</div>
									</section>
									<Agenda />
									<Info />
									<Map />
									{/* <RSVP /> */}
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
			className='fixed bottom-8 right-8 p-3 bg-accent-green text-white rounded-full border border-white/25 shadow-elegant hover:bg-info-green transition-all z-50'
			title='Powrót do góry'
			aria-label='Powrót do góry'
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
