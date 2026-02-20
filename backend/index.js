const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
	res.json({ message: 'Wedding API działa 💍' });
});

app.get('/api', (req, res) => {
	res.json({ message: 'Wedding API działa 💍' });
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server działa na porcie ${PORT}`);
});
