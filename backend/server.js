import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
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
        ip VARCHAR(45) NOT NULL,
        user_agent VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (song_id, ip, user_agent(100))
      )
    `);

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

	const client = getClientInfo(req);

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
app.get('/api/songs', async (req, res) => {
	try {
		const [rows] = await pool.execute(
			'SELECT * FROM songs ORDER BY votes DESC, created_at ASC',
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
		const [rows] = await pool.execute('SELECT * FROM songs WHERE id = ?', [
			result.insertId,
		]);
		res.status(201).json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.post('/api/songs/:id/upvote', async (req, res) => {
	const { id } = req.params;

	const client = getClientInfo(req);
	const ip = client.ip;
	const userAgent = client.userAgent;

	try {
		const [existing] = await pool.execute('SELECT id FROM songs WHERE id = ?', [
			id,
		]);
		if (existing.length === 0) {
			return res.status(404).json({ error: 'Utwór nie istnieje.' });
		}

		// Sprawdź czy już głosował
		const [alreadyVoted] = await pool.execute(
			'SELECT id FROM upvotes WHERE song_id = ? AND ip = ? AND user_agent = ?',
			[id, ip, userAgent.slice(0, 100)],
		);

		if (alreadyVoted.length > 0) {
			return res.status(409).json({ error: 'Już oddałeś głos na ten utwór.' });
		}

		// Zapisz głos i zwiększ licznik
		await pool.execute(
			'INSERT INTO upvotes (song_id, ip, user_agent) VALUES (?, ?, ?)',
			[id, ip, userAgent.slice(0, 100)],
		);
		await pool.execute('UPDATE songs SET votes = votes + 1 WHERE id = ?', [id]);

		const [rows] = await pool.execute('SELECT * FROM songs WHERE id = ?', [id]);
		res.json(rows[0]);
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
		await pool.execute('DELETE FROM songs WHERE id = ?', [id]);
		res.json({ success: true, message: 'Utwór usunięty.' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Błąd serwera.' });
	}
});

app.get('/api/songs/voted', async (req, res) => {
	const ip =
		req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
		req.socket.remoteAddress ||
		'unknown';
	const userAgent = req.headers['user-agent']?.slice(0, 100) || 'unknown';

	try {
		const [rows] = await pool.execute(
			'SELECT song_id FROM upvotes WHERE ip = ? AND user_agent = ?',
			[ip, userAgent],
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
