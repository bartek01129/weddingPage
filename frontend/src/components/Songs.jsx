import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeading from './ui/SectionHeading';

const API_URL = '/api/songs';

// Stały, anonimowy identyfikator urządzenia/przeglądarki (localStorage).
// Głos jest przypisany do tego tokenu — działa na Android/iOS/Mac/Windows.
function getVoterToken() {
	try {
		let token = localStorage.getItem('voterToken');
		if (!token) {
			token =
				typeof crypto !== 'undefined' && crypto.randomUUID
					? crypto.randomUUID()
					: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
			localStorage.setItem('voterToken', token);
		}
		return token;
	} catch {
		// tryb prywatny bez dostępu do localStorage — token na czas sesji
		return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
	}
}

function getYouTubeId(link) {
	if (!link) return null;
	try {
		const url = new URL(link);
		let id = null;
		if (url.hostname === 'youtu.be') {
			id = url.pathname.split('/')[1];
		} else if (
			url.hostname === 'youtube.com' ||
			url.hostname.endsWith('.youtube.com')
		) {
			if (url.pathname === '/watch') {
				id = url.searchParams.get('v');
			} else {
				const match = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
				if (match) id = match[2];
			}
		}
		return id && /^[\w-]{11}$/.test(id) ? id : null;
	} catch {
		return null;
	}
}

let ytApiPromise = null;
function loadYouTubeApi() {
	if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
	if (!ytApiPromise) {
		ytApiPromise = new Promise((resolve) => {
			const prev = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				prev?.();
				resolve(window.YT);
			};
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			document.head.appendChild(tag);
		});
	}
	return ytApiPromise;
}

export default function Songs() {
	const [songs, setSongs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	// Add song form
	const [title, setTitle] = useState('');
	const [artist, setArtist] = useState('');
	const [link, setLink] = useState('');
	const [addError, setAddError] = useState('');
	const [isAdding, setIsAdding] = useState(false);
	const [showAddForm, setShowAddForm] = useState(false);

	// Admin
	const [adminPassword, setAdminPassword] = useState('');
	const [deletingId, setDeletingId] = useState(null);
	const [showAdminInput, setShowAdminInput] = useState(null); // song id

	// Anonimowy token głosującego (trwały, per-urządzenie)
	const voterToken = useRef(getVoterToken()).current;

	// Upvoted IDs (źródłem prawdy jest serwer via /voted)
	const [upvotedIds, setUpvotedIds] = useState(new Set());

	// YouTube playback
	const [playingId, setPlayingId] = useState(null); // song id
	const playerRef = useRef(null);

	useEffect(() => {
		return () => {
			playerRef.current?.destroy?.();
			playerRef.current = null;
		};
	}, []);

	const handlePlayStop = async (song) => {
		if (playingId === song.id) {
			playerRef.current?.stopVideo?.();
			setPlayingId(null);
			return;
		}

		const videoId = getYouTubeId(song.link);
		if (!videoId) return;

		setPlayingId(song.id);

		if (playerRef.current) {
			playerRef.current.loadVideoById(videoId);
			return;
		}

		const YT = await loadYouTubeApi();
		if (playerRef.current) {
			playerRef.current.loadVideoById(videoId);
			return;
		}
		playerRef.current = new YT.Player('yt-audio-player', {
			width: 0,
			height: 0,
			videoId,
			playerVars: { autoplay: 1, playsinline: 1 },
			events: {
				onReady: (e) => e.target.playVideo(),
				onStateChange: (e) => {
					if (e.data === YT.PlayerState.ENDED) setPlayingId(null);
				},
				onError: () => setPlayingId(null),
			},
		});
	};

	const fetchSongs = useCallback(async () => {
		try {
			const [songsRes, votedRes] = await Promise.all([
				fetch(API_URL),
				fetch(`${API_URL}/voted`, {
					headers: { 'X-Voter-Token': voterToken },
				}),
			]);

			if (!songsRes.ok || !votedRes.ok) throw new Error();

			const [songsData, votedData] = await Promise.all([
				songsRes.json(),
				votedRes.json(),
			]);

			setSongs(songsData);
			setUpvotedIds(new Set(votedData));
		} catch {
			setError('Nie udało się załadować listy utworów.');
		} finally {
			setIsLoading(false);
		}
	}, [voterToken]);

	useEffect(() => {
		fetchSongs();
	}, [fetchSongs]);

	const handleUpvote = async (id) => {
		const hasVoted = upvotedIds.has(id);
		const endpoint = hasVoted ? 'downvote' : 'upvote';

		try {
			const res = await fetch(`${API_URL}/${id}/${endpoint}`, {
				method: 'POST',
				headers: { 'X-Voter-Token': voterToken },
			});
			const data = await res.json();

			if (res.status === 409) {
				// Stan lokalny rozjechał się z serwerem — zsynchronizuj
				const newSet = new Set(upvotedIds);
				if (hasVoted) newSet.delete(id);
				else newSet.add(id);
				setUpvotedIds(newSet);
				return;
			}

			if (!res.ok) return;

			setSongs((prev) =>
				prev
					.map((s) => (s.id === id ? data : s))
					.sort((a, b) => b.votes - a.votes),
			);
			const newSet = new Set(upvotedIds);
			if (hasVoted) newSet.delete(id);
			else newSet.add(id);
			setUpvotedIds(newSet);
		} catch {
			// silent fail
		}
	};

	const handleAddSong = async (e) => {
		e.preventDefault();
		if (!title.trim() || !artist.trim()) {
			setAddError('Wypełnij wszystkie wymagane pola.');
			return;
		}
		setIsAdding(true);
		setAddError('');
		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, artist, link }),
			});
			const data = await res.json();
			if (!res.ok) {
				setAddError(data.error || 'Błąd dodawania.');
				return;
			}
			setSongs((prev) => [...prev, data].sort((a, b) => b.votes - a.votes));
			setTitle('');
			setArtist('');
			setLink('');
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
				<SectionHeading
					eyebrow='Wspólna playlista'
					title='Lista życzeń muzycznych'
					subtitle='Zaproponuj utwór i zagłosuj na swoje ulubione piosenki. Pomożesz nam stworzyć idealną playlistę!'
					className='mb-12'
				/>

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
						className={showAddForm ? 'btn-secondary' : 'btn-primary'}
					>
						<svg
							className='w-5 h-5'
							fill='none'
							stroke='currentColor'
							strokeWidth={2}
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d={showAddForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'}
							/>
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
							<div className='relative bg-white rounded-2xl shadow-card p-6 md:p-8 border border-accent-gold/30'>
								<h3 className='text-xl font-serif font-medium text-text-main mb-4'>
									Dodaj utwór
								</h3>
								<form onSubmit={handleAddSong} className='space-y-4'>
									<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
										<div>
											<label className='block text-xs font-semibold uppercase tracking-widest text-text-main/70 mb-2'>
												Tytuł *
											</label>
											<input
												type='text'
												value={title}
												onChange={(e) => setTitle(e.target.value)}
												placeholder='Nazwa utworu'
												className='w-full px-4 py-2.5 border border-accent-green/25 rounded-lg bg-white focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all text-text-main placeholder:text-text-main/40 placeholder:font-light'
											/>
										</div>
										<div>
											<label className='block text-xs font-semibold uppercase tracking-widest text-text-main/70 mb-2'>
												Wykonawca *
											</label>
											<input
												type='text'
												value={artist}
												onChange={(e) => setArtist(e.target.value)}
												placeholder='Artysta / zespół'
												className='w-full px-4 py-2.5 border border-accent-green/25 rounded-lg bg-white focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all text-text-main placeholder:text-text-main/40 placeholder:font-light'
											/>
										</div>
										<div>
											<label className='block text-xs font-semibold uppercase tracking-widest text-text-main/70 mb-2'>
												Link
											</label>
											<input
												type='text'
												value={link}
												onChange={(e) => setLink(e.target.value)}
												placeholder='Link do utworu'
												className='w-full px-4 py-2.5 border border-accent-green/25 rounded-lg bg-white focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 transition-all text-text-main placeholder:text-text-main/40 placeholder:font-light'
											/>
										</div>
									</div>

									{addError && (
										<p className='text-red-500 text-sm'>{addError}</p>
									)}

									<button
										type='submit'
										disabled={isAdding}
										className='btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed'
									>
										{isAdding ? (
											<>
												<svg
													className='animate-spin h-4 w-4'
													fill='none'
													viewBox='0 0 24 24'
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
														d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
													/>
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
						<svg
							className='animate-spin h-8 w-8 mx-auto mb-2'
							fill='none'
							viewBox='0 0 24 24'
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
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
							/>
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
					<motion.div
						className={`space-y-3 ${
							songs.length > 10
								? 'md:max-h-[880px] md:overflow-y-auto md:overscroll-contain md:pr-2'
								: ''
						}`}
					>
						<AnimatePresence>
							{songs.map((song, index) => (
								<motion.div
									key={song.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{ delay: index * 0.03 }}
									className='bg-white rounded-xl shadow-softer border border-accent-green/10 p-4 flex items-center gap-4 hover:shadow-soft transition-shadow'
								>
									{/* Rank */}
									<span className='text-2xl font-serif italic font-medium text-accent-gold w-8 text-center flex-shrink-0'>
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

									{/* Play / Stop */}
									{getYouTubeId(song.link) && (
										<button
											onClick={() => handlePlayStop(song)}
											className={`flex items-center justify-center w-9 h-9 rounded-full border flex-shrink-0 transition-all ${
												playingId === song.id
													? 'border-accent-gold bg-accent-gold text-white'
													: 'border-accent-gold/40 bg-white text-accent-gold hover:bg-accent-gold hover:text-white'
											}`}
											title={
												playingId === song.id ? 'Zatrzymaj' : 'Odtwórz'
											}
										>
											{playingId === song.id ? (
												<svg
													className='w-3.5 h-3.5'
													fill='currentColor'
													viewBox='0 0 24 24'
												>
													<rect x='6' y='6' width='12' height='12' rx='1' />
												</svg>
											) : (
												<svg
													className='w-4 h-4 ml-0.5'
													fill='currentColor'
													viewBox='0 0 24 24'
												>
													<path d='M8 5.14v13.72c0 .8.87 1.3 1.56.9l11.02-6.86c.65-.4.65-1.4 0-1.8L9.56 4.24A1.05 1.05 0 008 5.14z' />
												</svg>
											)}
										</button>
									)}

									{/* Upvote */}
									<button
										onClick={() => handleUpvote(song.id)}
										title={
											upvotedIds.has(song.id)
												? 'Kliknij, aby cofnąć głos'
												: 'Zagłosuj'
										}
										className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all group ${
											upvotedIds.has(song.id)
												? 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20'
												: 'border-accent-green/25 bg-white text-accent-green hover:bg-accent-green hover:border-accent-green hover:text-white'
										}`}
									>
										<svg
											className='w-4 h-4'
											fill={upvotedIds.has(song.id) ? 'currentColor' : 'none'}
											stroke='currentColor'
											strokeWidth={2}
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
											/>
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
													placeholder=''
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
													onClick={() => {
														setShowAdminInput(null);
														setAdminPassword('');
													}}
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
												<svg
													className='w-4 h-4'
													fill='none'
													stroke='currentColor'
													strokeWidth={2}
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
													/>
												</svg>
											</button>
										)}
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
				)}

				{/* Hidden YouTube player (audio only) */}
				<div className='absolute w-0 h-0 overflow-hidden' aria-hidden='true'>
					<div id='yt-audio-player' />
				</div>
			</div>
		</section>
	);
}
