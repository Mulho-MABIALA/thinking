const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Charger les variables d'environnement
require('dotenv').config();

const app = express();

// Connexion MongoDB
connectDB();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'https://bejewelled-piroshki-f572b9.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(clean)) return callback(null, true);
    return callback(null, true); // permissif pour prod
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/team', require('./routes/team'));
app.use('/api/news', require('./routes/news'));
app.use('/api/services', require('./routes/services'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/faq', require('./routes/faq'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/finance', require('./routes/finance'));

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Thinking Tech API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
