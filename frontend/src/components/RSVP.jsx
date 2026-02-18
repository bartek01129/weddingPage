import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendEmails } from '../utils/emailGenerator';

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
		'w-full px-4 py-3 border-2 border-accent-green/30 rounded-xl bg-white focus:outline-none focus:border-accent-green focus:ring-2 focus:ring-accent-gold/30 transition-all text-text-main placeholder-text-main/50';

	const labelClass = 'block text-sm font-semibold text-text-main mb-2';

	return (
		<section id='rsvp' className='py-20 px-4 bg-white/30'>
			<div className='max-w-3xl mx-auto'>
				{/* Header */}
				<motion.div
					className='text-center mb-12'
					initial={{ opacity: 0, y: -20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
				>
					<h2 className='text-4xl md:text-5xl font-serif text-text-main mb-4'>
						RSVP
					</h2>
					<p className='text-text-main/75 text-lg'>
						Potwierdź swoją obecność do 18 lipca
					</p>
					<div className='w-16 h-1 bg-accent-gold mx-auto rounded-full mt-4' />
				</motion.div>

				{/* Card */}
				<motion.div
					className='bg-primary-bg rounded-3xl shadow-elegant p-8 md:p-12'
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<AnimatePresence mode='wait'>
						{/* Step 1: Form */}
						{step === 1 && (
							<motion.div
								key='step1'
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
							>
								<h3 className='text-2xl font-serif text-text-main mb-8'>
									Wyślij potwierdzenie
								</h3>

								<form onSubmit={handleSubmit} className='space-y-6'>
									{/* Name fields */}
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

									{/* Attendance */}
									<div>
										<label className={labelClass}>
											Czy będziesz w stanie wziąć udział w naszym weselu? *
										</label>
										<div className='space-y-3'>
											{[
												{ value: 'yes', label: '✔ Tak, będę uczestniczyć' },
												{
													value: 'no',
													label: '✗ Niestety nie będę mógł/mogła przybyć',
												},
											].map((option) => (
												<label
													key={option.value}
													className='flex items-center p-4 border-2 border-accent-green/30 rounded-xl cursor-pointer hover:bg-accent-green/5 transition-all group'
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
														className='w-5 h-5 accent-accent-green cursor-pointer'
													/>
													<span className='ml-3 text-text-main font-medium group-hover:text-accent-green transition-colors'>
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

									{/* Companions counter */}
									<div>
										<label className={labelClass}>
											Czy potwierdzasz więcej osób?
										</label>
										<div className='flex items-center gap-4'>
											<button
												type='button'
												onClick={handleRemoveCompanion}
												disabled={companions.length === 0}
												className='px-4 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
											>
												−
											</button>
											<span className='text-3xl font-bold text-accent-green min-w-[3rem] text-center'>
												{companions.length}
											</span>
											<button
												type='button'
												onClick={handleAddCompanion}
												className='px-4 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg font-semibold transition-all'
											>
												+
											</button>
										</div>
									</div>

									{/* Companion name fields */}
									{companions.length > 0 && (
										<div className='border-2 border-accent-green/20 rounded-xl p-6 bg-accent-green/5 space-y-4'>
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
														<p className='text-sm text-text-main mb-2'>
															Osoba {index + 1}
														</p>
														<div className='flex gap-3'>
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
																className='flex-1 px-3 py-2 border-2 border-accent-green/20 rounded-lg bg-white text-sm focus:outline-none focus:border-accent-green focus:ring-2 focus:ring-accent-gold/30 transition-all'
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
																className='flex-1 px-3 py-2 border-2 border-accent-green/20 rounded-lg bg-white text-sm focus:outline-none focus:border-accent-green focus:ring-2 focus:ring-accent-gold/30 transition-all'
															/>
														</div>
													</motion.div>
												))}
											</AnimatePresence>
										</div>
									)}

									{/* Submit error */}
									{errors.submit && (
										<p className='text-red-500 text-sm text-center'>
											{errors.submit}
										</p>
									)}

									{/* Submit button */}
									<button
										type='submit'
										disabled={isLoading}
										className='w-full px-6 py-3 bg-accent-green hover:bg-accent-green/90 disabled:bg-accent-green/50 text-white rounded-full font-semibold hover:shadow-elegant hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
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
											'Wyślij Potwierdzenie'
										)}
									</button>
								</form>
							</motion.div>
						)}

						{/* Step 2: Success */}
						{step === 2 && (
							<motion.div
								key='step2'
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.5 }}
								className='text-center py-8'
							>
								<motion.div
									className='text-6xl mb-6'
									animate={{ scale: [1, 1.1, 1] }}
									transition={{ duration: 0.5, delay: 0.2 }}
								></motion.div>
								<h3 className='text-3xl md:text-4xl font-serif text-text-main mb-4'>
									Dziękujemy!
								</h3>
								<div className='bg-accent-green/10 rounded-2xl p-6 mb-8 border-l-4 border-accent-green'>
									<p className='text-text-main font-semibold mb-2'>
										Ważne informacje:
									</p>
									<p className='text-sm text-text-main/75'>
										Możesz zmienić odpowiedź pisząc do nas na{' '}
										<a
											href='mailto:kontakt@naszslub.pl'
											className='underline hover:text-accent-green transition-colors'
										>
											kontakt@naszslub.pl
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
