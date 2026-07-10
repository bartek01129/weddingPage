import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendEmails } from '../utils/emailGenerator';
import SectionHeading from './ui/SectionHeading';
import Ornament from './ui/Ornament';

export default function RSVP() {
	const [step, setStep] = useState(1);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [attending, setAttending] = useState('');
	const [companions, setCompanions] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState({});

	const validateForm = () => {
		const newErrors = {};
		if (!firstName.trim()) newErrors.firstName = 'Proszę wpisać imię';
		if (!lastName.trim()) newErrors.lastName = 'Proszę wpisać nazwisko';
		if (!attending) newErrors.attending = 'Proszę wybrać opcję';
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleAddCompanion = () => {
		setCompanions([...companions, { firstName: '', lastName: '' }]);
	};

	const handleRemoveCompanion = () => {
		if (companions.length > 0) {
			setCompanions(companions.slice(0, -1));
		}
	};

	const handleCompanionChange = (index, field, value) => {
		const updated = [...companions];
		updated[index] = { ...updated[index], [field]: value };
		setCompanions(updated);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) return;

		setIsLoading(true);
		try {
			await sendEmails({
				guestName: `${firstName} ${lastName}`,
				// guestEmail,
				attending,
				companionCount: companions.length,
				companions,
			});
			setStep(2);
		} catch (error) {
			console.error('Błąd podczas wysyłania:', error);
			setErrors({
				submit: error.message || 'Wystąpił błąd. Spróbuj ponownie.',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const inputClass =
		'w-full px-4 py-3 border border-accent-green/25 rounded-lg bg-white focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all text-text-main placeholder:text-text-main/40 placeholder:font-light';

	const labelClass =
		'block text-xs font-semibold uppercase tracking-widest text-text-main/70 mb-2';

	return (
		<section id='rsvp' className='py-20 md:py-24 px-4 bg-white/40'>
			<div className='max-w-3xl mx-auto'>
				<SectionHeading
					eyebrow='Potwierdzenie obecności'
					title='RSVP'
					subtitle='Potwierdź swoją obecność do 18 lipca'
					className='mb-12'
				/>

				{/* Karta jak zaproszenie */}
				<motion.div
					className='relative bg-white rounded-2xl shadow-card p-8 md:p-12'
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<span
						className='pointer-events-none absolute inset-2 rounded-xl border border-accent-gold/20'
						aria-hidden='true'
					/>

					<AnimatePresence mode='wait'>
						{/* Krok 1: Formularz */}
						{step === 1 && (
							<motion.div
								key='step1'
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className='relative'
							>
								<h3 className='text-2xl font-serif font-medium text-text-main mb-8 text-center'>
									Wyślij potwierdzenie
								</h3>

								<form onSubmit={handleSubmit} className='space-y-6'>
									{/* Imię i nazwisko */}
									<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
										<div>
											<label className={labelClass}>Imię *</label>
											<input
												type='text'
												value={firstName}
												onChange={(e) => {
													setFirstName(e.target.value);
													setErrors({ ...errors, firstName: '' });
												}}
												placeholder='Twoje imię'
												className={inputClass}
											/>
											{errors.firstName && (
												<p className='text-red-500 text-sm mt-1'>
													{errors.firstName}
												</p>
											)}
										</div>
										<div>
											<label className={labelClass}>Nazwisko *</label>
											<input
												type='text'
												value={lastName}
												onChange={(e) => {
													setLastName(e.target.value);
													setErrors({ ...errors, lastName: '' });
												}}
												placeholder='Twoje nazwisko'
												className={inputClass}
											/>
											{errors.lastName && (
												<p className='text-red-500 text-sm mt-1'>
													{errors.lastName}
												</p>
											)}
										</div>
									</div>

									{/* Obecność */}
									<div>
										<label className={labelClass}>
											Czy będziesz w stanie wziąć udział w naszym weselu? *
										</label>
										<div className='space-y-3'>
											{[
												{ value: 'yes', label: 'Tak, będę uczestniczyć' },
												{
													value: 'no',
													label: 'Niestety nie będę mógł/mogła przybyć',
												},
											].map((option) => (
												<label
													key={option.value}
													className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
														attending === option.value
															? 'border-accent-gold bg-accent-gold/5'
															: 'border-accent-green/20 hover:border-accent-green/50'
													}`}
												>
													<input
														type='radio'
														name='attending'
														value={option.value}
														checked={attending === option.value}
														onChange={(e) => {
															setAttending(e.target.value);
															setErrors({ ...errors, attending: '' });
														}}
														className='w-5 h-5 accent-accent-green cursor-pointer text-accent-green focus:ring-accent-gold'
													/>
													<span className='ml-3 text-text-main font-medium'>
														{option.label}
													</span>
												</label>
											))}
										</div>
										{errors.attending && (
											<p className='text-red-500 text-sm mt-1'>
												{errors.attending}
											</p>
										)}
									</div>

									{/* Licznik osób towarzyszących */}
									<div>
										<label className={labelClass}>
											Czy potwierdzasz więcej osób?
										</label>
										<div className='flex items-center gap-5'>
											<button
												type='button'
												onClick={handleRemoveCompanion}
												disabled={companions.length === 0}
												aria-label='Usuń osobę towarzyszącą'
												className='w-11 h-11 rounded-full border border-accent-green/30 text-accent-green text-xl font-medium hover:border-accent-green hover:bg-accent-green hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent-green disabled:hover:border-accent-green/30'
											>
												−
											</button>
											<span className='text-3xl font-serif font-medium text-accent-green min-w-[3rem] text-center tabular-nums'>
												{companions.length}
											</span>
											<button
												type='button'
												onClick={handleAddCompanion}
												aria-label='Dodaj osobę towarzyszącą'
												className='w-11 h-11 rounded-full border border-accent-green/30 text-accent-green text-xl font-medium hover:border-accent-green hover:bg-accent-green hover:text-white transition-all'
											>
												+
											</button>
										</div>
									</div>

									{/* Dane osób towarzyszących */}
									{companions.length > 0 && (
										<div className='border border-accent-gold/30 rounded-xl p-6 bg-primary-bg/50 space-y-4'>
											<p className='text-sm font-semibold text-text-main'>
												Podaj imiona i nazwiska osób towarzyszących:
											</p>
											<AnimatePresence initial={false}>
												{companions.map((companion, index) => (
													<motion.div
														key={index}
														initial={{ opacity: 0, y: -10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -10 }}
														transition={{ duration: 0.15 }}
													>
														<p className='text-xs uppercase tracking-widest font-semibold text-text-main/60 mb-2'>
															Osoba {index + 1}
														</p>
														<div className='grid md:grid-cols-2 grid-cols-1 gap-3'>
															<input
																type='text'
																value={companion.firstName}
																onChange={(e) =>
																	handleCompanionChange(
																		index,
																		'firstName',
																		e.target.value,
																	)
																}
																placeholder='Imię'
																className='flex-1 px-3 py-2.5 border border-accent-green/20 rounded-lg bg-white text-sm focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all placeholder:text-text-main/40 placeholder:font-light'
															/>
															<input
																type='text'
																value={companion.lastName}
																onChange={(e) =>
																	handleCompanionChange(
																		index,
																		'lastName',
																		e.target.value,
																	)
																}
																placeholder='Nazwisko'
																className='flex-1 px-3 py-2.5 border border-accent-green/20 rounded-lg bg-white text-sm focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all placeholder:text-text-main/40 placeholder:font-light'
															/>
														</div>
													</motion.div>
												))}
											</AnimatePresence>
										</div>
									)}

									{/* Błąd wysyłki */}
									{errors.submit && (
										<p className='text-red-500 text-sm text-center'>
											{errors.submit}
										</p>
									)}

									{/* Przycisk wysyłki */}
									<button
										type='submit'
										disabled={isLoading}
										className='btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed'
									>
										{isLoading ? (
											<>
												<svg
													className='animate-spin h-5 w-5'
													viewBox='0 0 24 24'
													fill='none'
												>
													<circle
														className='opacity-25'
														cx='12'
														cy='12'
														r='10'
														stroke='currentColor'
														strokeWidth='4'
													/>
													<path
														className='opacity-75'
														fill='currentColor'
														d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
													/>
												</svg>
												Wysyłanie...
											</>
										) : (
											'Wyślij potwierdzenie'
										)}
									</button>
								</form>
							</motion.div>
						)}

						{/* Krok 2: Podziękowanie */}
						{step === 2 && (
							<motion.div
								key='step2'
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.5 }}
								className='relative text-center py-8'
							>
								<motion.div
									className='mx-auto mb-6 w-16 h-16 rounded-full border border-accent-gold/50 flex items-center justify-center'
									initial={{ scale: 0.6, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.5, delay: 0.15 }}
								>
									<svg
										className='w-7 h-7 text-accent-gold'
										fill='none'
										stroke='currentColor'
										strokeWidth={1.5}
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											d='M4.5 12.75l6 6 9-13.5'
										/>
									</svg>
								</motion.div>
								<h3 className='text-3xl md:text-4xl font-serif font-medium text-text-main mb-4'>
									Dziękujemy!
								</h3>
								<Ornament className='mb-8' />
								<div className='bg-primary-bg/60 rounded-xl border border-accent-gold/25 p-6'>
									<p className='text-text-main font-semibold mb-2'>
										Ważne informacje:
									</p>
									<p className='text-sm font-light text-text-main/75'>
										Możesz zmienić odpowiedź pisząc do nas na{' '}
										<a
											href='mailto:bartek011229@gmail.com'
											className='underline decoration-accent-gold/60 underline-offset-2 hover:text-accent-green transition-colors'
										>
											bartek011229@gmail.com
										</a>
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</section>
	);
}
