import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
		credentials: true,
		exposedHeaders: ['X-Voter-Token'],
	}),
);
app.use(express.json());

//Nodemailer
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'smtp.gmail.com',
	port: parseInt(process.env.SMTP_PORT || '587'),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

// MariaDB setup
const pool = mysql.createPool(process.env.DB_URL);

async function initDB() {
	const conn = await pool.getConnection();
	try {
		await conn.execute(`
      CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        link VARCHAR(255),
        votes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

		await conn.execute(`
      CREATE TABLE IF NOT EXISTS upvotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        song_id INT NOT NULL,
        voter_token VARCHAR(64),
        ip VARCHAR(45) NOT NULL,
        user_agent VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_token_vote (song_id, voter_token),
        INDEX idx_voter_token (voter_token)
      )
    `);

		// Migracje dla istniejących baz (idempotentne — błędy "już istnieje" są ignorowane)
		const migrations = [
			'ALTER TABLE upvotes ADD COLUMN voter_token VARCHAR(64) NULL',
			'ALTER TABLE upvotes ADD INDEX idx_voter_token (voter_token)',
			'ALTER TABLE upvotes DROP INDEX unique_vote',
			'ALTER TABLE upvotes ADD UNIQUE KEY unique_token_vote (song_id, voter_token)',
		];
		for (const sql of migrations) {
			try {
				await conn.execute(sql);
			} catch (err) {
				const benign = [
					'ER_DUP_FIELDNAME', // kolumna już jest
					'ER_DUP_KEYNAME', // indeks już jest
					'ER_CANT_DROP_FIELD_OR_KEY', // indeks do usunięcia już nie istnieje
				];
				if (!benign.includes(err.code)) {
					console.error('Migration error:', err.code, err.message);
				}
			}
		}

		// Weryfikacja: bez kolumny voter_token głosowanie nie zadziała.
		// Wyłącznie diagnostyka — nie może zablokować startu serwera.
		try {
			const [cols] = await conn.execute(
				`SELECT COLUMN_NAME FROM information_schema.COLUMNS
				 WHERE TABLE_SCHEMA = DATABASE()
				   AND TABLE_NAME = 'upvotes' AND COLUMN_NAME = 'voter_token'`,
			);
			if (cols.length === 0) {
				console.error(
					'!!! KRYTYCZNE: brak kolumny upvotes.voter_token — migracja nie przeszla. Glosowanie nie bedzie dzialac.',
				);
			}
		} catch (err) {
			console.error('Nie udalo sie zweryfikowac migracji:', err.message);
		}

		await conn.execute(`
			CREATE TABLE IF NOT EXISTS rsvps (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				attending ENUM('yes', 'no') NOT NULL,
				guests INT DEFAULT 0,
				companions JSON,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await conn.execute(`
			CREATE TABLE IF NOT EXISTS photos (
				id INT AUTO_INCREMENT PRIMARY KEY,
				url VARCHAR(500) NOT NULL,
				public_id VARCHAR(255),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		conn.release();
		console.log('Database ready');
	} catch (err) {
		conn.release();
		throw err;
	}
}

// Auth
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

function getRole(password) {
	if (password === ADMIN_PASSWORD) return 'admin';
	return null;
}

//IP get
function getClientInfo(req) {
	const ip =
		req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
		req.socket.remoteAddress ||
		'unknown';
	const userAgent = req.headers['user-agent']?.slice(0, 500) || 'unknown';
	return { ip, userAgent };
}

// --- Tożsamość głosującego ---
// Główne źródło: ciasteczko httpOnly ustawiane przez serwer (nie podlega
// 7-dniowemu limitowi WebKit na localStorage). Zapas: token z localStorage
// przysłany w nagłówku — pozwala odtworzyć tożsamość, gdy ciasteczko zniknie.
const VOTER_COOKIE = 'voter_token';
const VOTER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // rok

function isValidToken(value) {
	return /^[\w-]{8,64}$/.test(String(value ?? '').trim());
}

function parseCookies(req) {
	const header = req.headers.cookie;
	if (!header) return {};
	const out = {};
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx < 1) continue;
		const key = part.slice(0, idx).trim();
		try {
			out[key] = decodeURIComponent(part.slice(idx + 1).trim());
		} catch {
			out[key] = part.slice(idx + 1).trim();
		}
	}
	return out;
}

// Zwraca token głosującego i (od)nawia ciasteczko — przedłużenie ważności.
function ensureVoterToken(req, res) {
	let token = parseCookies(req)[VOTER_COOKIE];

	if (!isValidToken(token)) {
		// brak ciasteczka — spróbuj przejąć token z localStorage klienta
		const fromClient =
			req.headers['x-voter-token'] || req.body?.token || req.query?.token;
		token = isValidToken(fromClient) ? String(fromClient).trim() : randomUUID();
	}

	token = String(token).trim();

	const isHttps =
		req.secure || req.headers['x-forwarded-proto'] === 'https';

	res.cookie(VOTER_COOKIE, token, {
		httpOnly: true,
		secure: isHttps,
		sameSite: 'lax',
		maxAge: VOTER_COOKIE_MAX_AGE,
		path: '/',
	});
	// klient zapisuje go w localStorage jako zapas
	res.set('X-Voter-Token', token);
	// odpowiedź niesie tożsamość — żaden proxy/CDN nie może jej zbuforować
	res.set('Cache-Control', 'no-store');

	return token;
}

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// RSVP
app.post('/api/rsvp', async (req, res) => {
	const { name, attending, guests, companions } = req.body;

	if (!name) {
		return res.status(400).json({ error: 'Imię jest wymagane.' });
	}
	if (!attending) {
		return res.status(400).json({ error: 'Proszę potwierdzić obecność.' });
	}
	if (guests > 0 && !companions) {
		return res
			.status(400)
			.json({ error: 'Proszę podać imiona osób towarzyszących.' });
	}

	const companionsList =
		Array.isArray(companions) && companions.length > 0
			? companions
					.map(
						(c, i) =>
							`<li>${i + 1}. ${c.firstName || ''} ${c.lastName || ''}</li>`,
					)
					.join('')
			: null;

	try {
		await transporter.sendMail({
			from: `"Wedding RSVP" <${process.env.SMTP_USER}>`,
			to: process.env.COUPLE_EMAIL || process.env.SMTP_USER,
			subject: `RSVP od ${name}`,
			html: `
				<h2>Nowe potwierdzenie obecności</h2>
				<p><strong>Imię i nazwisko:</strong> ${name}</p>
				<p><strong>Obecność:</strong> ${attending === 'yes' ? ' Tak, będę!' : ' Niestety nie mogę'}</p>
				<p><strong>Łączna liczba osób:</strong> ${guests || 1}</p>
				${companionsList ? `<p><strong>Osoby towarzyszące:</strong></p><ul>${companionsList}</ul>` : ''}
			`,
		});

		await pool.execute(
			'INSERT INTO rsvps (name, attending, guests, companions, ip, user_agent) VALUES (?, ?, ?, ?)',
			[name.trim(), attending, guests || 0, JSON.stringify(companions) || null],
		);

		res.json({ success: true, message: 'RSVP zostało wysłane pomyślnie!' });
	} catch (error) {
		console.error('Email error:', error);
		res
			.status(500)
			.json({ error: 'Nie udało się wysłać maila. Spróbuj ponownie.' });
	}
});

// Songs
// Liczba głosów liczona zawsze z tabeli upvotes — nie da się rozsynchronizować.
// (Kolumna songs.votes jest odtąd nieużywana.)
const SONG_SELECT = `
	SELECT s.id, s.title, s.artist, s.link, s.created_at,
	       COUNT(u.id) AS votes
	FROM songs s
	LEFT JOIN upvotes u ON u.song_id = s.id
`;
const SONG_GROUP_BY = ' GROUP BY s.id, s.title, s.artist, s.link, s.created_at';

async function getSongById(id) {
	const [rows] = await pool.execute(
		`${SONG_SELECT} WHERE s.id = ?${SONG_GROUP_BY}`,
		[id],
	);
	return rows[0] || null;
}

app.get('/api/songs', async (req, res) => {
	try {
		const [rows] = await pool.execute(
			`${SONG_SELECT}${SONG_GROUP_BY} ORDER BY votes DESC, s.created_at ASC`,
		);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.post('/api/songs', async (req, res) => {
	const { title, artist, link } = req.body;

	if (!title?.trim() || !artist?.trim()) {
		return res.status(400).json({ error: 'Tytuł oraz wykonawca są wymagane.' });
	}

	try {
		const [result] = await pool.execute(
			'INSERT INTO songs (title, artist, link) VALUES (?, ?, ?)',
			[title.trim(), artist.trim(), link?.trim() || null],
		);
		res.status(201).json(await getSongById(result.insertId));
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.post('/api/songs/:id/upvote', async (req, res) => {
	const { id } = req.params;

	const token = ensureVoterToken(req, res);
	const { ip, userAgent } = getClientInfo(req);

	try {
		const [existing] = await pool.execute('SELECT id FROM songs WHERE id = ?', [
			id,
		]);
		if (existing.length === 0) {
			return res.status(404).json({ error: 'Utwór nie istnieje.' });
		}

		// Sprawdź czy ten token już głosował
		const [alreadyVoted] = await pool.execute(
			'SELECT id FROM upvotes WHERE song_id = ? AND voter_token = ?',
			[id, token],
		);

		if (alreadyVoted.length > 0) {
			return res.status(409).json({ error: 'Już oddałeś głos na ten utwór.' });
		}

		await pool.execute(
			'INSERT INTO upvotes (song_id, voter_token, ip, user_agent) VALUES (?, ?, ?, ?)',
			[id, token, ip, userAgent.slice(0, 100)],
		);

		res.json(await getSongById(id));
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.post('/api/songs/:id/downvote', async (req, res) => {
	const { id } = req.params;

	const token = ensureVoterToken(req, res);

	try {
		const [existing] = await pool.execute('SELECT id FROM songs WHERE id = ?', [
			id,
		]);
		if (existing.length === 0) {
			return res.status(404).json({ error: 'Utwór nie istnieje.' });
		}

		// Sprawdź czy ten token oddał głos
		const [alreadyVoted] = await pool.execute(
			'SELECT id FROM upvotes WHERE song_id = ? AND voter_token = ?',
			[id, token],
		);

		if (alreadyVoted.length === 0) {
			return res
				.status(409)
				.json({ error: 'Nie oddałeś głosu na ten utwór.' });
		}

		await pool.execute(
			'DELETE FROM upvotes WHERE song_id = ? AND voter_token = ?',
			[id, token],
		);

		res.json(await getSongById(id));
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.delete('/api/songs/:id', async (req, res) => {
	const { id } = req.params;
	const { password } = req.body;

	if (getRole(password) !== 'admin') {
		return res
			.status(401)
			.json({ error: 'Brak uprawnień. Wymagane hasło administratora.' });
	}

	try {
		const [existing] = await pool.execute('SELECT id FROM songs WHERE id = ?', [
			id,
		]);
		if (existing.length === 0) {
			return res.status(404).json({ error: 'Utwór nie istnieje.' });
		}
		// Świadomie NIE kasujemy wierszy z upvotes: przy liczeniu przez COUNT
		// osierocone głosy są nieszkodliwe (nigdy nie trafiają do JOIN-a),
		// a ich zostawienie ogranicza skutki przypadkowego usunięcia utworu.
		await pool.execute('DELETE FROM songs WHERE id = ?', [id]);
		res.json({ success: true, message: 'Utwór usunięty.' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.get('/api/songs/voted', async (req, res) => {
	// Ustala tożsamość (ciasteczko > token z localStorage > nowy) i odnawia ciasteczko
	const token = ensureVoterToken(req, res);
	const { ip, userAgent } = getClientInfo(req);

	// Przejęcie starych głosów (oddanych jeszcze bez tokenu) to operacja
	// best-effort — jej niepowodzenie nie może zepsuć ładowania listy.
	try {
		const ua = userAgent.slice(0, 100);

		// 1. Odrzuć stary głos na utwór, na który ten token już głosował.
		//    Inaczej krok 2 naruszyłby unikalny klucz (song_id, voter_token).
		await pool.execute(
			`DELETE stary FROM upvotes stary
			 JOIN upvotes nowy
			   ON nowy.song_id = stary.song_id AND nowy.voter_token = ?
			 WHERE stary.voter_token IS NULL AND stary.ip = ? AND stary.user_agent = ?`,
			[token, ip, ua],
		);

		// 2. Przypisz pozostałe stare głosy tego urządzenia do tokenu
		await pool.execute(
			`UPDATE upvotes SET voter_token = ?
			 WHERE voter_token IS NULL AND ip = ? AND user_agent = ?`,
			[token, ip, ua],
		);
	} catch (err) {
		console.error('Przejęcie starych głosów nie powiodło się:', err.message);
	}

	try {
		const [rows] = await pool.execute(
			'SELECT song_id FROM upvotes WHERE voter_token = ?',
			[token],
		);
		res.json(rows.map((r) => r.song_id));
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

//CLOUDINARY - PHOTO BOOTH
app.get('/api/photos', async (req, res) => {
	try {
		const [rows] = await pool.execute(
			'SELECT * FROM photos ORDER BY created_at DESC',
		);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: 'Błąd pobierania zdjęć z cloud' });
	}
});

app.post('/api/photos', async (req, res) => {
	const { url, public_id } = req.body;
	try {
		await pool.execute('INSERT INTO photos (url, public_id) VALUES (?, ?)', [
			url,
			public_id,
		]);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: 'Błąd zapisu zdjęcia' });
	}
});

// Start backend
initDB()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`  Wedding backend running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error(' DB init failed:', err);
		process.exit(1);
	});
