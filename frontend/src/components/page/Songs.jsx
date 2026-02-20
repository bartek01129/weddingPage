import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '/api/songs';

export default function Songs() {
	const [songs, setSongs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	// Add song form
	const [title, setTitle] = useState('');
	const [artist, setArtist] = useState('');
	const [password, setPassword] = useState('');
	const [addError, setAddError] = useState('');
	const [isAdding, setIsAdding] = useState(false);
	const [showAddForm, setShowAddForm] = useState(false);

	// Admin
	const [adminPassword, setAdminPassword] = useState('');
	const [deletingId, setDeletingId] = useState(null);
	const [showAdminInput, setShowAdminInput] = useState(null); // song id

	// Upvoted IDs stored in sessionStorage
	const [upvotedIds, setUpvotedIds] = useState(() => {
		try {
			return new Set(JSON.parse(sessionStorage.getItem('upvotedSongs') || '[]'));
		} catch {
			return new Set();
		}
	});

	const fetchSongs = useCallback(async () => {
		try {
			const res = await fetch(API_URL);
			if (!res.ok) throw new Error();
			const data = await res.json();
			setSongs(data);
		} catch {
			setError('Nie udało się załadować listy utworów.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSongs();
	}, [fetchSongs]);

	const handleUpvote = async (id) => {
		if (upvotedIds.has(id)) return;

		try {
			const res = await fetch(`${API_URL}/${id}/upvote`, { method: 'POST' });
			if (!res.ok) throw new Error();
			const updated = await res.json();
			setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => b.votes - a.votes));
			const newSet = new Set([...upvotedIds, id]);
			setUpvotedIds(newSet);
			sessionStorage.setItem('upvotedSongs', JSON.stringify([...newSet]));
		} catch {
			// silent fail
		}
	};

	const handleAddSong = async (e) => {
		e.preventDefault();
		if (!title.trim() || !artist.trim() || !password.trim()) {
			setAddError('Wypełnij wszystkie pola.');
			return;
		}
		setIsAdding(true);
		setAddError('');
		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, artist, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setAddError(data.error || 'Błąd dodawania.');
				return;
			}
			setSongs((prev) => [...prev, data].sort((a, b) => b.votes - a.votes));
			setTitle('');
			setArtist('');
			setPassword('');
			setShowAddForm(false);
		} catch {
			setAddError('Błąd połączenia z serwerem.');
		} finally {
			setIsAdding(false);
		}
	};

	const handleDelete = async (id) => {
		if (!adminPassword.trim()) return;
		setDeletingId(id);
		try {
			const res = await fetch(`${API_URL}/${id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: adminPassword }),
			});
			const data = await res.json();
			if (!res.ok) {
				alert(data.error || 'Brak uprawnień.');
				return;
			}
			setSongs((prev) => prev.filter((s) => s.id !== id));
			setShowAdminInput(null);
			setAdminPassword('');
		} catch {
			alert('Błąd połączenia z serwerem.');
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<section id='songs' className='py-20 px-4 bg-primary-bg'>
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
						Lista życzeń muzycznych
					</h2>
					<p className='text-text-main/70 text-base max-w-xl mx-auto'>
						Zaproponuj utwór i zagłosuj na swoje ulubione piosenki. Pomożesz nam
						stworzyć idealną playlistę!
					</p>
					<div className='w-16 h-1 bg-accent-gold mx-auto rounded-full mt-4' />
				</motion.div>

				{/* Add song button */}
				<motion.div
					className='flex justify-center mb-8'
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
				>
					<button
						onClick={() => setShowAddForm(!showAddForm)}
						className='inline-flex items-center gap-2 px-6 py-3 bg-accent-green text-white rounded-full font-semibold hover:bg-accent-green/90 hover:scale-105 transition-all shadow-soft'
					>
						<svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'>
							<path strokeLinecap='round' strokeLinejoin='round' d={showAddForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
						</svg>
						{showAddForm ? 'Anuluj' : 'Zaproponuj utwór'}
					</button>
				</motion.div>

				{/* Add song form */}
				<AnimatePresence>
					{showAddForm && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className='overflow-hidden mb-8'
						>
							<div className='bg-white rounded-2xl shadow-elegant p-6 border-l-4 border-accent-gold'>
								<h3 className='text-lg font-serif font-semibold text-text-main mb-4'>
									Dodaj utwór
								</h3>
								<form onSubmit={handleAddSong} className='space-y-4'>
									<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
										<div>
											<label className='block text-sm font-semibold text-text-main mb-1'>
												Tytuł *
											</label>
											<input
												type='text'
												value={title}
												onChange={(e) => setTitle(e.target.value)}
												placeholder='Nazwa utworu'
												className='w-full px-4 py-2.5 border-2 border-accent-green/30 rounded-xl bg-white focus:outline-none focus:border-accent-green transition-all text-text-main'
											/>
										</div>
										<div>
											<label className='block text-sm font-semibold text-text-main mb-1'>
												Wykonawca *
											</label>
											<input
												type='text'
												value={artist}
												onChange={(e) => setArtist(e.target.value)}
												placeholder='Artysta / zespół'
												className='w-full px-4 py-2.5 border-2 border-accent-green/30 rounded-xl bg-white focus:outline-none focus:border-accent-green transition-all text-text-main'
											/>
										</div>
									</div>
									<div>
										<label className='block text-sm font-semibold text-text-main mb-1'>
											Hasło *
										</label>
										<input
											type='password'
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder='Hasło ze strony'
											className='w-full px-4 py-2.5 border-2 border-accent-green/30 rounded-xl bg-white focus:outline-none focus:border-accent-green transition-all text-text-main'
										/>
										<p className='text-xs text-text-main/50 mt-1'>
											To samo hasło co do wejścia na stronę
										</p>
									</div>

									{addError && (
										<p className='text-red-500 text-sm'>{addError}</p>
									)}

									<button
										type='submit'
										disabled={isAdding}
										className='w-full py-3 bg-accent-green text-white rounded-full font-semibold hover:bg-accent-green/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2'
									>
										{isAdding ? (
											<>
												<svg className='animate-spin h-4 w-4' fill='none' viewBox='0 0 24 24'>
													<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
													<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
												</svg>
												Dodawanie...
											</>
										) : (
											'Dodaj utwór'
										)}
									</button>
								</form>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Songs list */}
				{isLoading ? (
					<div className='text-center py-12 text-text-main/50'>
						<svg className='animate-spin h-8 w-8 mx-auto mb-2' fill='none' viewBox='0 0 24 24'>
							<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
							<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
						</svg>
						Ładowanie...
					</div>
				) : error ? (
					<p className='text-center text-red-500 py-8'>{error}</p>
				) : songs.length === 0 ? (
					<p className='text-center text-text-main/50 py-12'>
						Brak utworów. Bądź pierwszy i zaproponuj coś!
					</p>
				) : (
					<motion.div className='space-y-3'>
						<AnimatePresence>
							{songs.map((song, index) => (
								<motion.div
									key={song.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{ delay: index * 0.03 }}
									className='bg-white rounded-xl shadow-softer p-4 flex items-center gap-4'
								>
									{/* Rank */}
									<span className='text-2xl font-serif font-bold text-accent-gold/60 w-8 text-center flex-shrink-0'>
										{index + 1}
									</span>

									{/* Song info */}
									<div className='flex-1 min-w-0'>
										<p className='font-semibold text-text-main truncate'>
											{song.title}
										</p>
										<p className='text-sm text-text-main/60 truncate'>
											{song.artist}
										</p>
									</div>

									{/* Upvote */}
									<button
										onClick={() => handleUpvote(song.id)}
										disabled={upvotedIds.has(song.id)}
										className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
											upvotedIds.has(song.id)
												? 'bg-accent-green/10 text-accent-green cursor-default'
												: 'bg-accent-green/10 text-accent-green hover:bg-accent-green hover:text-white'
										}`}
									>
										<svg className='w-4 h-4' fill={upvotedIds.has(song.id) ? 'currentColor' : 'none'} stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' />
										</svg>
										{song.votes}
									</button>

									{/* Delete (admin) */}
									<div className='flex-shrink-0'>
										{showAdminInput === song.id ? (
											<div className='flex items-center gap-2'>
												<input
													type='password'
													value={adminPassword}
													onChange={(e) => setAdminPassword(e.target.value)}
													placeholder='Hasło admina'
													className='w-28 px-2 py-1 text-xs border border-red-300 rounded-lg focus:outline-none focus:border-red-500'
													autoFocus
												/>
												<button
													onClick={() => handleDelete(song.id)}
													disabled={deletingId === song.id}
													className='px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all disabled:opacity-50'
												>
													{deletingId === song.id ? '...' : 'Usuń'}
												</button>
												<button
													onClick={() => { setShowAdminInput(null); setAdminPassword(''); }}
													className='px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300 transition-all'
												>
													✕
												</button>
											</div>
										) : (
											<button
												onClick={() => setShowAdminInput(song.id)}
												className='p-1.5 text-text-main/20 hover:text-red-400 transition-colors'
												title='Usuń (admin)'
											>
												<svg className='w-4 h-4' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'>
													<path strokeLinecap='round' strokeLinejoin='round' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
												</svg>
											</button>
										)}
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
				)}
			</div>
		</section>
	);
}
