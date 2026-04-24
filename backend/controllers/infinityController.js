const fetch = require('node-fetch');
const admin = require('../config/firebaseAdmin');
const { generateTicketCode } = require('../utils/ticketUtils');

exports.createPayment = async (req, res) => {
  try {
    const { excursion, ticket, buyerInfo, carInfo } = req.body || {};
    const uid = req.user.uid;
    const tokenEmail = (req.user.email || '').trim().toLowerCase();

    if (!excursion || !ticket) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }

    if (tokenEmail && buyerInfo && buyerInfo.email) {
      const formEmail = String(buyerInfo.email).trim().toLowerCase();
      if (formEmail !== tokenEmail) {
        return res.status(400).json({ error: 'O e-mail do formulário deve ser o mesmo da conta logada.' });
      }
    }

    const db = admin.firestore();
    const excursionRef = await db.collection('excursions').doc(String(excursion.id)).get();
    if (!excursionRef.exists) return res.status(400).json({ error: 'Excursão não encontrada.' });

    const excursionData = excursionRef.data();
    const realTicket = excursionData.tickets.find((t) => t.type === ticket.type);
    if (!realTicket) return res.status(400).json({ error: 'Tipo de ingresso inválido.' });

    const realPrice = realTicket.price;

    const payerEmail =
      tokenEmail || (buyerInfo && String(buyerInfo.email).trim()) || '';
    if (!payerEmail) {
      return res.status(400).json({ error: 'E-mail do pagador é obrigatório.' });
    }

    const payload = {
      amount: Math.round(realPrice * 100),
      currency: 'BRL',
      description: `${excursionData.name} (${ticket.type})`,
      metadata: {
        userId: uid,
        excursionId: excursion.id,
        ticketType: ticket.type,
        carInfo: JSON.stringify(carInfo || {}),
      },
      customer: {
        name: (buyerInfo && buyerInfo.fullName) || req.user.name || 'Cliente',
        email: payerEmail,
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/error`,
      webhook_url: `${process.env.BACKEND_URL}/api/payment/webhook`,
    };

    const infinityUrl = process.env.INFINITY_API_URL || 'https://api.infinitypay.com/v1/payments';
    const infinityKey = process.env.INFINITY_API_KEY;

    if (!infinityKey) {
      console.warn('INFINITY_API_KEY não definido — não é possível criar pagamento.');
      return res.status(500).json({ error: 'Pagamento não configurado.' });
    }

    const response = await fetch(infinityUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${infinityKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Infinity Pay error:', response.status, text);
      return res.status(500).json({ error: 'Erro ao criar pagamento com Infinity Pay' });
    }

    const data = await response.json();

    return res.json({ id: data.id, checkout_url: data.checkout_url || data.payment_url || null });
  } catch (err) {
    console.error('Erro createPayment (infinity):', err.message || err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

exports.receiveWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.INFINITY_WEBHOOK_SECRET;
    const incomingSecret = req.headers['x-webhook-secret'] || req.query.secret;
    if (webhookSecret && incomingSecret !== webhookSecret) {
      console.warn('Tentativa de webhook Infinity não autorizada.');
      return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    if (event && event.type === 'payment.paid') {
      const metadata = event.data && event.data.metadata;
      const paymentId = event.data && event.data.id;
      const amount = event.data && event.data.amount;
      const status = event.data && event.data.status;

      if (status === 'paid' && metadata && metadata.userId) {
        const db = admin.firestore();
        const orderRef = db
          .collection('users')
          .doc(metadata.userId)
          .collection('orders')
          .doc(paymentId.toString());

        const existing = await orderRef.get();
        if (!existing.exists) {
          let carInfo = {};
          try {
            carInfo = JSON.parse(metadata.carInfo || '{}');
          } catch (_) {
            carInfo = {};
          }
          await orderRef.set({
            excursionId: metadata.excursionId,
            excursionName: event.data.description || '',
            ticketType: metadata.ticketType,
            price: amount / 100,
            status: 'Pago',
            purchaseDate: new Date().toISOString(),
            buyerName: event.data.customer && event.data.customer.name,
            buyerEmail: event.data.customer && event.data.customer.email,
            paymentId,
            carInfo,
            ticket: {
              code: generateTicketCode(),
              validated: false,
              validatedAt: null,
              validatedBy: null,
            },
          });

          if (metadata.excursionId) {
            await db
              .collection('excursions')
              .doc(String(metadata.excursionId))
              .update({
                bookedSlots: admin.firestore.FieldValue.increment(1),
              });
          }
        }
      }
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('Erro no webhook infinity:', err.message || err);
    res.status(500).send('erro');
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });

    const infinityKey = process.env.INFINITY_API_KEY;
    const infinityUrl = `${process.env.INFINITY_API_URL}/${id}`;
    const resp = await fetch(infinityUrl, {
      headers: { Authorization: `Bearer ${infinityKey}` },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Erro ao consultar Infinity:', resp.status, txt);
      return res.status(500).json({ error: 'Erro ao consultar pagamento' });
    }
    const data = await resp.json();

    const metaUid = data.metadata && data.metadata.userId;
    if (!metaUid || metaUid !== req.user.uid) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return res.json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      metadata: data.metadata,
      customer: data.customer,
    });
  } catch (err) {
    console.error('Erro confirmPayment (infinity):', err.message || err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
