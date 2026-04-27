require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const paymentRoutes = require('./routes/paymentRoutes');
const importRoutes = require('./routes/import');
const userRoutes = require('./routes/user');

const app = express();

const allowedOrigins = [
  'https://itajobicarsclub.com.br',
  'https://www.itajobicarsclub.com.br',
  'https://api.itajobicarsclub.com.br',
  'http://localhost:5173',
  'http://localhost:3001',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requests sem origin (ex: Postman, curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origem: ${origin}`));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições deste IP. Tente novamente mais tarde.' },
});
app.use('/api/', limiter);

// Webhook Stripe exige corpo bruto (assinatura). Registrado antes de express.json().
const paymentProvider = (process.env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();
if (paymentProvider === 'stripe' && process.env.STRIPE_WEBHOOK_SECRET) {
  const stripeController = require('./controllers/stripeController');
  app.post(
    '/api/payment/webhook',
    express.raw({ type: 'application/json' }),
    stripeController.handleWebhook
  );
}

app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.send('Backend WT Excursões está no ar!');
});

app.use('/api/payment', paymentRoutes);
app.use('/api/import-excursions', importRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/user', userRoutes);

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[Erro Global]:', err.message || err);
  res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
