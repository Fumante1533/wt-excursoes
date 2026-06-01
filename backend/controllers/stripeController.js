require('dotenv').config();
const admin = require('../config/firebaseAdmin');
const { createTicketFields } = require('../utils/ticketUtils');
const { buildTicketSalesUpdate, findEventRef } = require('../lib/firestoreInventory');

let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (e) {
  console.warn('Pacote stripe não disponível ou chave ausente.');
}

exports.createCheckoutSession = async (req, res) => {
  if (!stripe || !process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor.' });
  }

  const { cart, buyerInfo, carInfo } = req.body || {};
  const isGuest = !req.user;
  const uid = req.user ? req.user.uid : `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = (req.user && req.user.email ? req.user.email : (buyerInfo && buyerInfo.email) || '').trim();

  if (!email) {
    return res.status(400).json({ error: 'E-mail obrigatório para checkout.' });
  }
  if (req.user && req.user.email && buyerInfo && buyerInfo.email) {
    if (String(buyerInfo.email).trim().toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'O e-mail do formulário deve ser o mesmo da conta logada.' });
    }
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Carrinho inválido.' });
  }

  const isValidUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  };

  try {
    const db = admin.firestore();
    let subtotal = 0;
    const line_items = [];

    for (const item of cart) {
      const eventoRef = await db.collection('eventos').doc(String(item.evento.id)).get();
      if (!eventoRef.exists) {
        return res.status(400).json({ error: `Evento ${item.evento.id} não encontrado.` });
      }

      const eventoData = eventoRef.data();
      const ticketIndex = eventoData.tickets.findIndex((t) => t.type === item.ticket.type);
      const realTicket = ticketIndex >= 0 ? eventoData.tickets[ticketIndex] : null;

      if (!realTicket) {
        return res.status(400).json({ error: `Ingresso do tipo ${item.ticket.type} inválido.` });
      }

      const realPrice = realTicket.price;
      const qty = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 100);
      const ticketLimit = Number(realTicket.quantity || 0);
      if (ticketLimit > 0) {
        const sold = Number((eventoData.ticketSoldCounts || {})[String(ticketIndex)] || 0);
        if (sold + qty > ticketLimit) {
          return res.status(400).json({ error: `Vagas insuficientes no lote "${item.ticket.type}". Restam ${Math.max(0, ticketLimit - sold)}.` });
        }
      }
      subtotal += realPrice * qty;

      line_items.push({
        price_data: {
          currency: 'brl',
          product_data: {
            name: `${eventoData.name} - ${item.ticket.type}`,
            ...(isValidUrl(eventoData.image) && { images: [eventoData.image] }),
          },
          unit_amount: Math.round(realPrice * 100),
        },
        quantity: qty,
      });
    }

    const feeCents = Math.round(subtotal * 100 * 0.029 + 30);
    if (feeCents > 0) {
      line_items.push({
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Taxa de Serviço',
          },
          unit_amount: feeCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/error`,
      customer_email: email,
      metadata: {
        userId: uid,
        cart: JSON.stringify(
          cart.map((item) => ({
            eventoId: item.evento.id,
            ticketType: item.ticket.type,
            quantity: Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 100),
          }))
        ),
        buyerInfo: JSON.stringify(buyerInfo || {}),
        carInfo: JSON.stringify(carInfo || {}),
      },
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe createCheckoutSession:', error.message || error);
    return res.status(500).json({ error: 'Não foi possível criar a sessão de pagamento.' });
  }
};

exports.retrieveCheckoutSession = async (req, res) => {
  res.status(501).json({ error: 'Não implementado' });
};

exports.handleWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).send('Stripe indisponível');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET ausente');
    return res.status(500).send('Configuração incompleta');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook verify:', err.message || err);
    return res.status(400).send(`Webhook Error`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};

    try {
      const db = admin.firestore();
      const userId = metadata.userId;
      if (!userId) {
        console.error('Stripe webhook: userId ausente');
      } else {
        let cart;
        let buyerInfo;
        let carInfo;
        try {
          cart = JSON.parse(metadata.cart || '[]');
          buyerInfo = JSON.parse(metadata.buyerInfo || '{}');
          carInfo = JSON.parse(metadata.carInfo || '{}');
        } catch (e) {
          console.error('Stripe webhook: metadata JSON inválido');
          return res.status(400).json({ error: 'metadata inválido' });
        }

        const orderRef = db.collection('users').doc(userId).collection('orders').doc(session.id);
        const locatedEvents = await Promise.all(cart.map((item) => findEventRef(db, item.eventoId)));
        const ticket = createTicketFields();
        let processed = false;

        await db.runTransaction(async (transaction) => {
          const existing = await transaction.get(orderRef);
          const eventSnaps = [];
          for (const locatedEvent of locatedEvents) {
            eventSnaps.push(locatedEvent ? await transaction.get(locatedEvent.ref) : null);
          }

          if (existing.exists) return;

          const eventosData = eventSnaps.map((snap) => (snap && snap.exists ? snap.data() : null));
          cart.forEach((item, index) => {
            const locatedEvent = locatedEvents[index];
            const eventSnap = eventSnaps[index];
            if (!locatedEvent || !eventSnap || !eventSnap.exists) {
              throw new Error(`Evento ${item.eventoId} não encontrado para confirmar pagamento.`);
            }
            const { updateData } = buildTicketSalesUpdate(eventSnap.data(), item.ticketType, item.quantity || 1);
            transaction.update(locatedEvent.ref, updateData);
          });

          transaction.set(orderRef, {
            id: session.id,
            userId,
            buyerInfo,
            buyerName: buyerInfo?.fullName || '',
            buyerEmail: buyerInfo?.email || session.customer_details?.email || '',
            buyerEmailLower: String(buyerInfo?.email || session.customer_details?.email || '').trim().toLowerCase(),
            carInfo: carInfo || {},
            items: cart.map((item, index) => ({
              ...item,
              eventoName: eventosData[index]?.name || 'Evento Desconhecida',
              eventoDate: eventosData[index]?.date || null,
            })),
            eventoId: cart[0]?.eventoId || null,
            eventoName: eventosData[0]?.name || 'Evento Desconhecida',
            eventoDate: eventosData[0]?.date || null,
            ticketType: cart[0]?.ticketType || '',
            totalPrice: session.amount_total / 100,
            status: 'Pago',
            paymentMethod: session.payment_method_types && session.payment_method_types[0],
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            ticket,
          });

          processed = true;
        });

        if (!processed) return res.status(200).json({ received: true });
      }
    } catch (dbError) {
      console.error('Erro ao salvar pedido (Stripe):', dbError.message || dbError);
      return res.status(500).json({ error: 'Erro ao processar o pedido no banco de dados.' });
    }
  }

  return res.status(200).json({ received: true });
};
