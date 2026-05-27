/**
 * routes/admin.js
 * Rotas administrativas protegidas (isAdmin).
 */

const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const admin = require('../config/firebaseAdmin');
const { buildTicketSalesUpdate, findEventRef } = require('../lib/firestoreInventory');
const { createTicketFields, isAdminRequest } = require('../utils/ticketUtils');

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── POST /api/admin/issue-ticket ───────────────────────────────────────────
// Emite um ingresso manualmente para um comprador (venda feita fora da plataforma)
router.post('/issue-ticket', verifyFirebaseToken, async (req, res) => {
  if (!isAdminRequest(req.user)) {
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

    const locatedEvent = await findEventRef(db, eventoId);
    if (!locatedEvent) {
      console.error('[ERROR] Evento não encontrado:', eventoId);
      return res.status(404).json({ error: 'Evento não encontrado em nenhuma coleção.' });
    }
    const eventoData = locatedEvent.snap.data();

    // Encontra o lote pelo tipo
    // ID do pedido manual: prefixo MANUAL + timestamp + random
    const manualOrderId = `MANUAL-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const ticket = createTicketFields();

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
      ticket,
    };

    const userRef = db.collection('users').doc(userId);
    const orderRef = userRef.collection('orders').doc(manualOrderId);
    await db.runTransaction(async (transaction) => {
      const freshEventSnap = await transaction.get(locatedEvent.ref);
      if (!freshEventSnap.exists) {
        throw new Error('Evento não encontrado para emitir ingresso.');
      }
      const { updateData } = buildTicketSalesUpdate(freshEventSnap.data(), ticketType, 1);
      transaction.update(locatedEvent.ref, updateData);
      if (!targetUserId) {
        transaction.set(
          userRef,
          {
            name: buyerName,
            email: buyerEmail || '',
            isManualGuest: true,
            lastManualOrderId: manualOrderId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      transaction.set(orderRef, orderPayload);
    });

    // Envia e-mail se solicitado
    if (sendEmail && buyerEmail) {
      try {
        // Tenta usar o sendTicketEmail exportado; se não disponível, importa direto
        const { sendTicketEmail } = require('../controllers/paymentController');
        await sendTicketEmail(buyerEmail, buyerName, eventoData.name, ticket.code, ticket.qrPayload);
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail do ingresso manual:', emailErr.message);
        // Não falha a request por causa do e-mail
      }
    }

    return res.json({
      message: 'Ingresso emitido com sucesso!',
      orderId: manualOrderId,
      ticketCode: ticket.code,
      ticketPayload: ticket.qrPayload,
      userId,
    });
  } catch (err) {
    console.error('Erro ao emitir ingresso manual:', err);
    return res.status(500).json({ error: 'Erro interno ao emitir ingresso.' });
  }
});

module.exports = router;
