const admin = require('../config/firebaseAdmin');

async function findEventRef(db, eventId) {
  const id = String(eventId);
  const collections = ['excursions', 'eventos'];

  for (const collectionName of collections) {
    const ref = db.collection(collectionName).doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, snap, collectionName };
    }
  }

  return null;
}

function buildTicketSalesUpdate(eventData, ticketType, quantity) {
  const amount = Number(quantity || 0);
  const data = eventData || {};
  const tickets = Array.isArray(data.tickets) ? data.tickets : [];
  const ticketIndex = tickets.findIndex((ticket) => ticket.type === ticketType);
  if (ticketType && ticketIndex < 0) {
    throw new Error('Tipo de ingresso não encontrado para atualizar vagas.');
  }

  const updateData = {
    bookedSlots: admin.firestore.FieldValue.increment(amount),
  };

  if (ticketIndex >= 0) {
    const ticketLimit = Number(tickets[ticketIndex].quantity || 0);
    const soldCounts = data.ticketSoldCounts || {};
    const currentSold = Number(soldCounts[String(ticketIndex)] || 0);

    if (ticketLimit > 0 && currentSold + amount > ticketLimit) {
      throw new Error(`Vagas insuficientes no lote "${ticketType}". Restam ${Math.max(0, ticketLimit - currentSold)}.`);
    }

    updateData[`ticketSoldCounts.${ticketIndex}`] = admin.firestore.FieldValue.increment(amount);
  }

  return { updateData, ticketIndex };
}

async function incrementTicketSales(db, { eventId, ticketType, quantity }) {
  const amount = Number(quantity || 0);
  if (!eventId || amount <= 0) {
    throw new Error('Dados inválidos para atualizar vagas.');
  }

  const located = await findEventRef(db, eventId);
  if (!located) {
    throw new Error('Evento não encontrado para atualizar vagas.');
  }

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(located.ref);
    if (!snap.exists) {
      throw new Error('Evento não encontrado para atualizar vagas.');
    }

    const { updateData, ticketIndex } = buildTicketSalesUpdate(snap.data(), ticketType, amount);

    transaction.update(located.ref, updateData);
    return { eventRef: located.ref, collectionName: located.collectionName, ticketIndex };
  });
}

module.exports = {
  buildTicketSalesUpdate,
  findEventRef,
  incrementTicketSales,
};
