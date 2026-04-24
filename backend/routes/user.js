const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

// Pasta para armazenar uploads (crie se não existir)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safeName}`);
  }
});

// Limitar tamanho do arquivo a 3MB e aceitar apenas imagens
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens são permitidas'));
    cb(null, true);
  }
});

// POST /api/user/avatar
// Protegida: requer Authorization: Bearer <Firebase ID Token>
router.post('/avatar', verifyFirebaseToken, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  // Opcional: poderíamos nomear com uid para facilitar
  const fileUrl = `/uploads/${req.file.filename}`; // servido como estático em server.js
  res.json({ url: fileUrl });
});

module.exports = router;
