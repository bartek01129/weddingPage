import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'smtp.gmail.com',
	port: parseInt(process.env.SMTP_PORT || '587'),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// RSVP endpoint
app.post('/api/rsvp', async (req, res) => {
	const { name, attending, guests, companions } = req.body;

	if (!name) {
		return res.status(400).json({ error: 'Imię jest wymagane.' });
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
		// Notification to couple
		await transporter.sendMail({
			from: `"Wedding RSVP" <${process.env.SMTP_USER}>`,
			to: process.env.COUPLE_EMAIL || process.env.SMTP_USER,
			subject: `RSVP od ${name}`,
			html: `
        <h2>Nowe potwierdzenie obecności</h2>
        <p><strong>Imię i nazwisko:</strong> ${name}</p>
        <p><strong>Obecność:</strong> ${attending === 'yes' ? ' Tak, będę!' : ' Niestety nie mogę'}</p>
        <p><strong>Łączna liczba osób:</strong> ${guests || 1}</p>
        ${
					companionsList
						? `<p><strong>Osoby towarzyszące:</strong></p><ul>${companionsList}</ul>`
						: ''
				}
      `,
		});

		res.json({ success: true, message: 'RSVP zostało wysłane pomyślnie!' });
	} catch (error) {
		console.error('Email error:', error);
		res
			.status(500)
			.json({ error: 'Nie udało się wysłać maila. Spróbuj ponownie.' });
	}
});

app.listen(PORT, () => {
	console.log(`✉️  Wedding backend running on port ${PORT}`);
});
