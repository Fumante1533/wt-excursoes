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

async function getAllOrderDocs(db) {
  try {
    const snap = await db.collectionGroup('orders').get();
    return snap.docs;
  } catch (err) {
    console.warn('linkGuestOrders: collectionGroup order scan failed; falling back to user order scan.', err.message || err);
  }

  const usersSnap = await db.collection('users').get();
  const docs = [];
  for (const userDoc of usersSnap.docs) {
    const ordersSnap = await userDoc.ref.collection('orders').get();
    docs.push(...ordersSnap.docs);
  }
  return docs;
}

// POST /api/user/link-guest-orders
// Vincula pedidos de visitante ao usuário recém cadastrado/logado
router.post('/link-guest-orders', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    if (!email) return res.status(400).json({ error: 'Usuário sem e-mail.' });

    const db = admin.firestore();
    const normalizedEmail = String(email).trim().toLowerCase();
    const orderDocs = await getAllOrderDocs(db);
    const matchingOrders = orderDocs.filter((docSnap) => {
      const data = docSnap.data() || {};
      return String(data.buyerEmail || '').trim().toLowerCase() === normalizedEmail;
    });
    
    if (matchingOrders.length === 0) {
      return res.json({ message: 'Nenhum pedido de visitante encontrado.' });
    }

    const batch = db.batch();
    let movedCount = 0;

    matchingOrders.forEach(docSnap => {
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

const nodemailer = require('nodemailer');
const sendTicketEmail = async (email, name, eventName, ticketCode) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Reenvio de Ingresso: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2 style="color: #eab308;">Aqui está o seu ingresso!</h2>
          <p>Olá <strong>${name}</strong>, conforme solicitado, reenviamos o seu ingresso.</p>
          <div style="margin: 20px auto; padding: 20px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <p style="font-size: 18px; margin: 0;">Código do Ingresso:</p>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${ticketCode}</p>
          </div>
          <p>Apresente este código na entrada do evento.</p>
          <p>Nos vemos lá!</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Erro ao reenviar email:', err);
  }
};

router.post('/resend-ticket', verifyFirebaseToken, async (req, res) => {
  try {
    // Verificação simples de admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'Não autorizado.' });
    
    // Verifica permissão de admin (consistente com as regras do painel admin)
    const currentEmail = req.user.email?.toLowerCase();
    const currentUid = req.user.uid;
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const isSpecialAdmin =
      req.user.admin === true ||
      currentEmail === adminEmail ||
      currentEmail === 'aryelgamerbrs2@gmail.com' ||
      currentUid === 'EhJOQzxkHOUjRTbmdNDDIqe7XEy2';

    if (!isSpecialAdmin) {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'ID do pedido obrigatório.' });

    const db = admin.firestore();
    const ordersQuery = db.collectionGroup('orders');
    const ordersSnap = await ordersQuery.get();
    
    let targetOrder = null;
    ordersSnap.forEach(doc => {
      if (doc.id === orderId) targetOrder = doc.data();
    });

    if (!targetOrder) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (!targetOrder.ticket?.code) return res.status(400).json({ error: 'Pedido sem ingresso gerado.' });

    await sendTicketEmail(
      targetOrder.buyerEmail, 
      targetOrder.buyerName || 'Participante', 
      targetOrder.eventoName || 'Evento', 
      targetOrder.ticket.code
    );

    res.json({ message: 'Ingresso reenviado.' });
  } catch (err) {
    console.error('Erro no reenvio de ingresso:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/user/resend-my-ticket
// O próprio usuário reenvia o seu ingresso
router.post('/resend-my-ticket', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'ID do pedido obrigatório.' });

    const db = admin.firestore();
    const orderRef = db.collection('users').doc(uid).collection('orders').doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const order = snap.data();
    if (!order.ticket?.code) return res.status(400).json({ error: 'Ingresso ainda não gerado.' });

    await sendTicketEmail(
      email,
      order.buyerName || 'Participante',
      order.eventoName || 'Evento',
      order.ticket.code
    );

    res.json({ message: 'Ingresso reenviado com sucesso.' });
  } catch (err) {
    console.error('Erro ao reenviar ingresso do usuário:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
