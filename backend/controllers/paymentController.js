const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const admin = require('../config/firebaseAdmin');
const { generateTicketCode, normalizeTicketCode, isAdminRequest } = require('../utils/ticketUtils');

let client;
if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
}

exports.createPreference = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ error: 'Pagamento não configurado no servidor.' });
    }

    const { excursion, ticket, buyerInfo, carInfo } = req.body || {};
    const uid = req.user.uid;
    const tokenEmail = (req.user.email || '').trim().toLowerCase();

    if (!excursion || !ticket) {
      return res.status(400).json({ error: 'Dados da excursão ou ingresso ausentes.' });
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
    const realTicketIndex = excursionData.tickets.findIndex((t) => t.type === ticket.type);
    const realTicket = realTicketIndex >= 0 ? excursionData.tickets[realTicketIndex] : null;
    if (!realTicket) return res.status(400).json({ error: 'Tipo de ingresso inválido.' });

    // Verificar disponibilidade do lote
    const qty = Number(realTicket.quantity || 0);
    if (qty > 0) {
      const soldCounts = excursionData.ticketSoldCounts || {};
      const sold = Number(soldCounts[String(realTicketIndex)] || 0);
      if (sold >= qty) {
        return res.status(400).json({ error: `Inscrição "${ticket.type}" esgotada. Aguarde o próximo lote.` });
      }
    }

    const realPrice = realTicket.price;

    const payerEmail =
      tokenEmail || (buyerInfo && String(buyerInfo.email).trim()) || '';
    if (!payerEmail) {
      return res.status(400).json({ error: 'E-mail do pagador é obrigatório.' });
    }

    if (Number(realPrice) <= 0) {
      // Ingresso gratuito: para simplificar, apenas retornamos erro solicitando registro direto ou contate admin.
      // Futuro: implementação de checkout gratuito direto sem o MP.
      return res.status(400).json({ error: 'Ingressos gratuitos ou isentos não podem ser processados via Mercado Pago. O valor deve ser maior que zero.' });
    }

    const preference = new Preference(client);

    const body = {
      items: [
        {
          id: String(excursion.id),
          title: `${excursionData.name} (${ticket.type})`,
          description: excursionData.location || "Evento",
          picture_url: excursionData.image || undefined,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(realPrice),
        },
      ],
      payer: {
        name: (buyerInfo && buyerInfo.fullName) || req.user.name || 'Comprador',
        email: payerEmail,
      },
      back_urls: {
        success: `${(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '')}/success`,
        failure: `${(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '')}/error`,
        pending: `${(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '')}/pending`,
      },
      auto_return: 'approved',
      metadata: {
        user_id: uid,
        excursion_id: String(excursion.id),
        ticket_type: ticket.type,
        car_info: JSON.stringify(carInfo || {}),
      },
    };

    const response = await preference.create({ body });

    if (response && response.id) {
      return res.json({ id: response.id, checkout_url: response.init_point });
    }
    return res.status(500).json({ error: 'Não foi possível obter a URL de checkout.' });
  } catch (error) {
    console.error('Mercado Pago createPreference:', error);
    // Extrai a causa raiz do erro do MercadoPago, se existir.
    const mpErrorDetails = error.cause && error.cause.length > 0 ? error.cause[0] : null;
    let errorMessage = 'Erro ao processar pagamento.';
    if (mpErrorDetails && mpErrorDetails.description) {
      errorMessage = `Mercado Pago recusou: ${mpErrorDetails.description}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return res.status(500).json({ error: errorMessage });
  }
};

exports.receiveWebhook = async (req, res) => {
  // IMPORTANTE: Mercado Pago exige resposta 200 imediata.
  // Processamos de forma assíncrona e sempre devolvemos 200.
  res.status(200).send('Webhook recebido.');

  try {
    const paymentId = req.query['data.id'] || req.query.id || (req.body && req.body.data && req.body.data.id);
    const type = req.query.type || (req.body && req.body.type);

    if (type !== 'payment' || !paymentId) return;
    if (!client) {
      console.warn('Webhook MP: client não configurado.');
      return;
    }

    let orderData;
    try {
      const payment = new Payment(client);
      orderData = await payment.get({ id: paymentId });
    } catch (mpErr) {
      // ID fictício (ex: teste do painel MP) ou pagamento não encontrado
      console.warn(`Webhook MP: pagamento ${paymentId} não encontrado ou erro na API:`, mpErr.message || mpErr);
      return;
    }

    if (orderData && (orderData.status === 'approved' || orderData.status === 'paid')) {
      const { metadata } = orderData;
      const userId = metadata && metadata.user_id;
      const excursionId = metadata && metadata.excursion_id;
      const ticketType = metadata && metadata.ticket_type;
      let carInfo = {};
      try {
        carInfo = JSON.parse((metadata && metadata.car_info) || '{}');
      } catch (_) {
        carInfo = {};
      }

      if (!userId) {
        console.error('Webhook MP: user_id ausente no metadata');
        return;
      }

      const db = admin.firestore();
      const orderRef = db.collection('users').doc(userId).collection('orders').doc(String(orderData.id));
      const existing = await orderRef.get();
      if (existing.exists) return; // já processado (idempotência)

      const ticketCode = generateTicketCode();
      await orderRef.set({
        excursionId: excursionId,
        excursionName: orderData.additional_info?.items?.[0]?.title?.split(' (')[0] || '',
        ticketType: ticketType,
        price: Number(orderData.transaction_amount || 0),
        status: 'Pago',
        purchaseDate: new Date().toISOString(),
        buyerName: orderData.payer?.first_name || '',
        buyerEmail: orderData.payer?.email || '',
        paymentId: orderData.id,
        carInfo,
        ticket: {
          code: ticketCode,
          validated: false,
          validatedAt: null,
          validatedBy: null,
        },
      });

          if (excursionId) {
            const excursionRef = db.collection('excursions').doc(String(excursionId));
            const excursionSnap = await excursionRef.get();
            const updateData = { bookedSlots: admin.firestore.FieldValue.increment(1) };

            // Incrementar contagem do lote vendido
            if (excursionSnap.exists && ticketType) {
              const excursionData = excursionSnap.data();
              const ticketIndex = (excursionData.tickets || []).findIndex((t) => t.type === ticketType);
              if (ticketIndex >= 0) {
                updateData[`ticketSoldCounts.${ticketIndex}`] = admin.firestore.FieldValue.increment(1);
              }
            }

            await excursionRef.update(updateData);
          }
    }
  } catch (error) {
    // Resposta 200 já foi enviada. Apenas loga o erro internamente.
    console.error('Erro interno no webhook MP:', error.message || error);
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ error: 'Pagamento não configurado.' });
    }
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });

    const payment = new Payment(client);
    const orderData = await payment.get({ id });

    const metaUid = orderData.metadata && orderData.metadata.user_id;
    if (!metaUid || metaUid !== req.user.uid) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return res.json({
      id: orderData.id,
      status: orderData.status,
      transaction_amount: orderData.transaction_amount,
      payer: orderData.payer,
      metadata: orderData.metadata,
    });
  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err.message || err);
    return res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
};

exports.validateTicket = async (req, res) => {
  try {
    if (!isAdminRequest(req.user)) {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    const { ticketCode, excursionId } = req.body || {};
    const normalized = normalizeTicketCode(ticketCode);
    if (!normalized) {
      return res.status(400).json({ error: 'ticketCode é obrigatório.' });
    }

    const db = admin.firestore();
    let q = db.collectionGroup('orders').where('ticket.code', '==', normalized).limit(1);
    if (excursionId) {
      q = q.where('excursionId', '==', String(excursionId));
    }
    const snap = await q.get();
    if (snap.empty) {
      return res.status(404).json({ error: 'Ingresso não encontrado.' });
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();
    if (data.ticket && data.ticket.validated) {
      return res.status(409).json({
        error: 'Ingresso já validado.',
        ticket: data.ticket,
        orderId: docSnap.id,
      });
    }

    await docSnap.ref.set(
      {
        ticket: {
          ...(data.ticket || {}),
          code: normalized,
          validated: true,
          validatedAt: admin.firestore.FieldValue.serverTimestamp(),
          validatedBy: req.user.uid,
        },
      },
      { merge: true }
    );

    return res.json({
      ok: true,
      orderId: docSnap.id,
      excursionName: data.excursionName || '',
      buyerName: data.buyerName || data.buyerInfo?.fullName || '',
      ticketCode: normalized,
    });
  } catch (err) {
    console.error('Erro ao validar ingresso:', err.message || err);
    return res.status(500).json({ error: 'Erro ao validar ingresso.' });
  }
};
