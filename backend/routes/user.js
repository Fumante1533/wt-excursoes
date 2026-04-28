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

const admin = require('../config/firebaseAdmin');

// POST /api/user/link-guest-orders
// Vincula pedidos de visitante ao usuário recém cadastrado/logado
router.post('/link-guest-orders', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    if (!email) return res.status(400).json({ error: 'Usuário sem e-mail.' });

    const db = admin.firestore();
    const ordersQuery = db.collectionGroup('orders').where('buyerEmail', '==', email);
    const snap = await ordersQuery.get();
    
    if (snap.empty) {
      return res.json({ message: 'Nenhum pedido de visitante encontrado.' });
    }

    const batch = db.batch();
    let movedCount = 0;

    snap.docs.forEach(docSnap => {
      // O caminho é users/{userId}/orders/{orderId}
      const parentUserRef = docSnap.ref.parent.parent;
      if (parentUserRef && parentUserRef.id.startsWith('guest_')) {
        const newOrderRef = db.collection('users').doc(uid).collection('orders').doc(docSnap.id);
        batch.set(newOrderRef, docSnap.data());
        batch.delete(docSnap.ref);
        movedCount++;
      }
    });

    if (movedCount > 0) {
      await batch.commit();
    }

    res.json({ message: `${movedCount} ingressos vinculados com sucesso.` });
  } catch (err) {
    console.error('Erro ao vincular ingressos:', err);
    res.status(500).json({ error: 'Erro interno ao vincular ingressos.' });
  }
});

module.exports = router;
