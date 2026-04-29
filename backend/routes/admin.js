/**
 * routes/admin.js
 * Rotas administrativas protegidas (isAdmin).
 */

const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const admin = require('../config/firebaseAdmin');

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ICC-';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 4) code += '-';
  }
  return code;
}

function isAdmin(req) {
  const { uid, email, admin: adminClaim } = req.user;
  return (
    adminClaim === true ||
    email === 'itacars237@admin.com' ||
    email === 'aryelgamerbrs2@gmail.com' ||
    uid === 'EhJOQzxkHOUjRTbmdNDDIqe7XEy2'
  );
}

// ─── Importa o sendTicketEmail do paymentController ─────────────────────────
// Reutiliza a mesma função de envio de e-mail
const { sendTicketEmailFn } = (() => {
  try {
    return { sendTicketEmailFn: require('../controllers/paymentController').sendTicketEmail };
  } catch {
    return { sendTicketEmailFn: null };
  }
})();

// ─── POST /api/admin/issue-ticket ───────────────────────────────────────────
// Emite um ingresso manualmente para um comprador (venda feita fora da plataforma)
router.post('/issue-ticket', verifyFirebaseToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const {
    eventoId,
    ticketType,
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerCpf,
    carPlate,
    carModel,
    carYear,
    carColor,
    price,             // valor pago (pode ser 0)
    paymentMethod,     // 'pix', 'dinheiro', 'transferencia', etc.
    notes,             // observações internas
    sendEmail,         // boolean: enviar ingresso por e-mail
    targetUserId,      // opcional: associar ao UID de um usuário existente
  } = req.body;

  if (!eventoId || !ticketType || !buyerName) {
    return res.status(400).json({ error: 'eventoId, ticketType e buyerName são obrigatórios.' });
  }

  try {
    const db = admin.firestore();

    // Busca o evento para validar e pegar o nome (Tenta 'excursions' primeiro, depois 'eventos')
    let eventoRef = db.collection('excursions').doc(String(eventoId));
    let eventoSnap = await eventoRef.get();
    
    if (!eventoSnap.exists) {
      eventoRef = db.collection('eventos').doc(String(eventoId));
      eventoSnap = await eventoRef.get();
    }

    if (!eventoSnap.exists) {
      console.error('[ERROR] Evento não encontrado:', eventoId);
      return res.status(404).json({ error: 'Evento não encontrado em nenhuma coleção.' });
    }
    const eventoData = eventoSnap.data();

    // Encontra o lote pelo tipo
    const ticketIndex = (eventoData.tickets || []).findIndex((t) => t.type === ticketType);
    const ticketDef = ticketIndex >= 0 ? eventoData.tickets[ticketIndex] : null;

    // ID do pedido manual: prefixo MANUAL + timestamp + random
    const manualOrderId = `MANUAL-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const ticketCode = generateTicketCode();

    // Destino: usa targetUserId ou cria sob um bucket "guest_manual_<orderId>"
    const userId = targetUserId || `guest_manual_${manualOrderId}`;

    const orderPayload = {
      eventoId: String(eventoId),
      eventoName: eventoData.name || '',
      eventoDate: eventoData.date || null,
      ticketType,
      price: Number(price) || 0,
      status: 'Pago',
      purchaseDate: new Date().toISOString(),
      buyerName,
      buyerEmail: buyerEmail || '',
      buyerPhone: buyerPhone || '',
      buyerCpf: buyerCpf || '',
      carInfo: {
        plate: carPlate || '',
        model: carModel || '',
        year: carYear || '',
        color: carColor || '',
      },
      paymentMethod: paymentMethod || 'manual',
      notes: notes || '',
      isManual: true,
      issuedBy: req.user.uid,
      paymentId: manualOrderId,
      ticket: {
        code: ticketCode,
        validated: false,
        validatedAt: null,
        validatedBy: null,
      },
    };

    // Grava o pedido no Firestore
    await db
      .collection('users')
      .doc(userId)
      .collection('orders')
      .doc(manualOrderId)
      .set(orderPayload);

    // Incrementa contadores do evento
    const updateData = { bookedSlots: admin.firestore.FieldValue.increment(1) };
    if (ticketIndex >= 0) {
      const currentSold = Number((eventoData.ticketSoldCounts || {})[String(ticketIndex)] || 0);
      updateData.ticketSoldCounts = {
        ...(eventoData.ticketSoldCounts || {}),
        [String(ticketIndex)]: currentSold + 1,
      };
    }
    await eventoRef.update(updateData);

    // Envia e-mail se solicitado
    if (sendEmail && buyerEmail) {
      try {
        // Tenta usar o sendTicketEmail exportado; se não disponível, importa direto
        const { sendTicketEmail } = require('../controllers/paymentController');
        await sendTicketEmail(buyerEmail, buyerName, eventoData.name, ticketCode);
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail do ingresso manual:', emailErr.message);
        // Não falha a request por causa do e-mail
      }
    }

    return res.json({
      message: 'Ingresso emitido com sucesso!',
      orderId: manualOrderId,
      ticketCode,
      userId,
    });
  } catch (err) {
    console.error('Erro ao emitir ingresso manual:', err);
    return res.status(500).json({ error: 'Erro interno ao emitir ingresso.' });
  }
});

module.exports = router;
