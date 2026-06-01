const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const admin = require('../config/firebaseAdmin');
const {
  createTicketFields,
  isAdminRequest,
  normalizeTicketCode,
  parseTicketInput,
  verifyTicketToken,
} = require('../utils/ticketUtils');
const { buildTicketSalesUpdate, findEventRef } = require('../lib/firestoreInventory');
const { logServerError } = require('../lib/errorLogger');
const {
  normalizeCouponCode,
  roundCurrency,
  validateCouponForPurchase,
} = require('../lib/paymentHelpers');
const nodemailer = require('nodemailer');

const sendTicketEmail = exports.sendTicketEmail = async (email, name, eventName, ticketCode, ticketPayload) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const ticketLink = String(ticketPayload || '').startsWith('http') ? ticketPayload : '';
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Seu Ingresso: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2 style="color: #eab308;">Acelere com a gente!</h2>
          <p>Olá <strong>${name}</strong>, seu pagamento foi aprovado.</p>
          <p>Seu ingresso para o <strong>${eventName}</strong> está garantido.</p>
          <div style="margin: 20px auto; padding: 20px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <p style="font-size: 18px; margin: 0;">Código do Ingresso:</p>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${ticketCode}</p>
          </div>
          ${ticketLink ? `<p><a href="${ticketLink}" style="display: inline-block; background: #eab308; color: #111; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Abrir ingresso com QR Code</a></p>` : ''}
          <p>Apresente este código na entrada do evento.</p>
          <p>Nos vemos lá!</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Erro ao enviar email:', err);
  }
};
let client;
if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
}

async function resolveCouponForPurchase(db, couponCode, context) {
  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode) return null;

  const couponSnap = await db.collection('coupons').where('code', '==', normalizedCode).limit(1).get();
  if (couponSnap.empty) {
    const err = new Error('Cupom inválido.');
    err.statusCode = 400;
    throw err;
  }

  const couponDoc = couponSnap.docs[0];
  const coupon = { id: couponDoc.id, ...couponDoc.data(), code: normalizedCode };
  const validation = validateCouponForPurchase(coupon, context);
  if (!validation.valid) {
    const err = new Error(validation.reason);
    err.statusCode = 400;
    throw err;
  }

  return {
    docId: couponDoc.id,
    code: normalizedCode,
    data: coupon,
    discountAmount: validation.discountAmount,
    total: validation.total,
  };
}

exports.createPreference = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ error: 'Pagamento não configurado no servidor.' });
    }

    const { evento, excursion, ticket, buyerInfo, carInfo, additionalPassengers, couponCode, paymentMethod } = req.body || {};
    console.log('[DEBUG] createPreference payload recebido:', JSON.stringify(req.body, null, 2));

    const isGuest = !req.user;
    const uid = req.user ? req.user.uid : `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const tokenEmail = req.user && req.user.email ? req.user.email.trim().toLowerCase() : null;

    const targetExcursion = evento || excursion;
    
    // Log detalhado para depuração
    if (!targetExcursion) console.warn('[DEBUG] targetExcursion ausente');
    if (!ticket) console.warn('[DEBUG] ticket ausente');
    if (targetExcursion && !targetExcursion.id && !targetExcursion._id) {
        console.warn('[DEBUG] targetExcursion sem ID:', targetExcursion);
    }

    if (!targetExcursion || !ticket || (!targetExcursion.id && !targetExcursion._id)) {
      console.error('[ERROR] Falha na validação do payload de pagamento');
      return res.status(400).json({ 
        error: 'Dados do evento ou ingresso ausentes ou inválidos.',
        receivedKeys: Object.keys(req.body || {}),
        hasEvento: !!evento,
        hasExcursion: !!excursion,
        hasTicket: !!ticket,
        eventoId: targetExcursion ? (targetExcursion.id || targetExcursion._id) : null
      });
    }

    if (!isGuest && tokenEmail && buyerInfo && buyerInfo.email) {
      const formEmail = String(buyerInfo.email).trim().toLowerCase();
      if (formEmail !== tokenEmail) {
        return res.status(400).json({ error: 'O e-mail do formulário deve ser o mesmo da conta logada.' });
      }
    }

    const db = admin.firestore();

    // Verificação de dupla compra (apenas para usuários logados)
    if (!isGuest && uid) {
      const existingOrders = await db.collection('users').doc(uid).collection('orders')
        .where('eventoId', '==', String(targetExcursion.id))
        .where('status', 'in', ['Pago', 'approved'])
        .limit(1)
        .get();

      if (!existingOrders.empty) {
        return res.status(409).json({ 
          error: 'Você já possui um ingresso pago para este evento. Acesse "Minhas Inscrições" para visualizá-lo.' 
        });
      }
    }
    const locatedEvent = await findEventRef(db, targetExcursion.id);

    if (!locatedEvent) {
      console.error('[ERROR] Evento não encontrado:', targetExcursion.id);
      return res.status(400).json({ error: 'Evento não encontrado em nenhuma coleção.' });
    }

    const excursionData = locatedEvent.snap.data();
    const realTicketIndex = excursionData.tickets.findIndex((t) => t.type === ticket.type);
    const realTicket = realTicketIndex >= 0 ? excursionData.tickets[realTicketIndex] : null;

    if (!realTicket) return res.status(400).json({ error: 'Tipo de ingresso inválido.' });

    // Verificar disponibilidade do lote
    const qty = Number(realTicket.quantity || 0);
    const totalQtyDemanded = 1 + (Array.isArray(additionalPassengers) ? additionalPassengers.length : 0);
    if (qty > 0) {
      const soldCounts = excursionData.ticketSoldCounts || {};
      const sold = Number(soldCounts[String(realTicketIndex)] || 0);
      if (sold + totalQtyDemanded > qty) {
        return res.status(400).json({ error: `Vagas insuficientes no lote "${ticket.type}". Restam ${Math.max(0, qty - sold)}.` });
      }
    }

    if (buyerInfo?.cpf) {
      const cpfClean = String(buyerInfo.cpf).replace(/\D/g, '');
      const validCpf = (cpf) => {
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
        let sum = 0, remainder;
        for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1]) * (11 - i);
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf[9])) return false;
        sum = 0;
        for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i - 1]) * (12 - i);
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cpf[10]);
      };
      if (!validCpf(cpfClean)) {
        return res.status(400).json({ error: 'CPF inválido.' });
      }
    }

    const realPrice = Number(realTicket.price || 0);

    const payerEmail = tokenEmail || (buyerInfo && String(buyerInfo.email).trim()) || '';
    if (!payerEmail) {
      return res.status(400).json({ error: 'E-mail do pagador é obrigatório.' });
    }

    if (realPrice <= 0) {
      return res.status(400).json({ error: 'Ingressos gratuitos ou isentos não podem ser processados via Mercado Pago. O valor deve ser maior que zero.' });
    }

    const subtotal = roundCurrency(realPrice * totalQtyDemanded);
    let coupon = null;
    try {
      coupon = await resolveCouponForPurchase(db, couponCode, {
        eventId: String(targetExcursion.id),
        ticketType: ticket.type,
        subtotal,
      });
    } catch (couponErr) {
      return res.status(couponErr.statusCode || 400).json({ error: couponErr.message || 'Cupom inválido.' });
    }

    const discountAmount = roundCurrency(coupon ? coupon.discountAmount : 0);
    const amountToCharge = roundCurrency(subtotal - discountAmount);
    if (amountToCharge <= 0) {
      return res.status(400).json({ error: 'O valor final da compra precisa ser maior que zero para pagamento online.' });
    }

    const preference = new Preference(client);

    const body = {
      items: [
        {
          id: String(targetExcursion.id),
          title: `${excursionData.name} (${ticket.type})${totalQtyDemanded > 1 ? ` x${totalQtyDemanded}` : ''}`,
          description: excursionData.location || "Evento",
          picture_url: excursionData.image || undefined,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amountToCharge,
        },
      ],
      payer: {
        name: (buyerInfo && buyerInfo.fullName) || (req.user && req.user.name) || 'Comprador',
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
        is_guest: String(isGuest),
        evento_id: String(targetExcursion.id),
        ticket_type: ticket.type,
        coupon_code: coupon ? coupon.code : '',
        coupon_doc_id: coupon ? coupon.docId : '',
        amount_before_discount: String(subtotal),
        discount_amount: String(discountAmount),
        car_info: JSON.stringify(carInfo || {}),
        additional_passengers: additionalPassengers ? JSON.stringify(additionalPassengers).substring(0, 450) : "[]",
      },
    };

    if (paymentMethod === 'pix') {
      const payment = new Payment(client);
      
      const nameParts = String((buyerInfo && buyerInfo.fullName) || 'Comprador').trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Silva';
      const cleanCpf = String((buyerInfo && buyerInfo.cpf) || '').replace(/\D/g, '');

      const paymentBody = {
        transaction_amount: amountToCharge,
        description: `${excursionData.name} (${ticket.type})`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cleanCpf || undefined,
          },
        },
        metadata: {
          user_id: uid,
          is_guest: String(isGuest),
          evento_id: String(targetExcursion.id),
          ticket_type: ticket.type,
          coupon_code: coupon ? coupon.code : '',
          coupon_doc_id: coupon ? coupon.docId : '',
          amount_before_discount: String(subtotal),
          discount_amount: String(discountAmount),
          car_info: JSON.stringify(carInfo || {}),
          additional_passengers: additionalPassengers ? JSON.stringify(additionalPassengers).substring(0, 450) : "[]",
        },
      };

      const response = await payment.create({ body: paymentBody });

      if (response && response.id) {
        const orderRef = db.collection('users').doc(uid).collection('orders').doc(String(response.id));
        await orderRef.set({
          eventoId: targetExcursion.id,
          eventoName: excursionData.name,
          ticketType: ticket.type,
          price: amountToCharge,
          originalPrice: subtotal,
          discountAmount,
          couponCode: coupon ? coupon.code : null,
          status: 'Pendente',
          createdAt: new Date().toISOString(),
          buyerName: payerEmail.split('@')[0],
          buyerEmail: payerEmail,
          buyerEmailLower: String(payerEmail || '').trim().toLowerCase(),
          abandonedCartSent: false,
          paymentMethod: 'pix',
          paymentId: response.id,
          qrCode: response.point_of_interaction?.transaction_data?.qr_code || '',
          qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64 || ''
        });

        return res.json({
          id: response.id,
          qrCode: response.point_of_interaction?.transaction_data?.qr_code || '',
          qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64 || '',
          paymentMethod: 'pix'
        });
      }
      return res.status(500).json({ error: 'Não foi possível obter os dados do Pix.' });
    }

    const response = await preference.create({ body });

    if (response && response.id) {
      const orderRef = db.collection('users').doc(uid).collection('orders').doc(String(response.id));
      await orderRef.set({
        eventoId: targetExcursion.id,
        eventoName: excursionData.name,
        ticketType: ticket.type,
        price: amountToCharge,
        originalPrice: subtotal,
        discountAmount,
        couponCode: coupon ? coupon.code : null,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
        buyerName: payerEmail.split('@')[0],
        buyerEmail: payerEmail,
        buyerEmailLower: String(payerEmail || '').trim().toLowerCase(),
        abandonedCartSent: false,
        preferenceId: response.id
      });

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
  // Suporta: Webhooks (POST JSON) e IPN legado (topic=payment querystring)
  res.status(200).send('Webhook recebido.');

  try {
    // IPN: ?topic=payment&id=123  |  Webhooks: body.type = "payment", body.data.id
    const paymentId = req.query['data.id'] || req.query.id || (req.body && req.body.data && req.body.data.id);
    const type = req.query.type || req.query.topic || (req.body && req.body.type);

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
      const eventoId = metadata && metadata.evento_id;
      const ticketType = metadata && metadata.ticket_type;
      let carInfo = {};
      let additionalPassengers = [];
      try {
        carInfo = JSON.parse((metadata && metadata.car_info) || '{}');
      } catch (_) { carInfo = {}; }
      try {
        additionalPassengers = JSON.parse((metadata && metadata.additional_passengers) || '[]');
      } catch (_) { additionalPassengers = []; }

      if (!userId) {
        console.error('Webhook MP: user_id ausente no metadata');
        return;
      }

      const db = admin.firestore();
      const orderRef = db.collection('users').doc(userId).collection('orders').doc(String(orderData.id));
      const mainTicket = createTicketFields();
      const eventoNameStr = orderData.additional_info?.items?.[0]?.title?.split(' (')[0] || '';
      const couponCode = normalizeCouponCode(metadata && metadata.coupon_code);
      const couponDocId = metadata && metadata.coupon_doc_id;
      const amountBeforeDiscount = roundCurrency(Number((metadata && metadata.amount_before_discount) || orderData.transaction_amount || 0));
      const discountAmount = roundCurrency(Number((metadata && metadata.discount_amount) || 0));
      const totalTicketsBought = 1 + additionalPassengers.length;
      const extraTicketEmails = additionalPassengers.map((passenger, idx) => ({
        passenger,
        ticket: createTicketFields(),
        ref: db.collection('users').doc(userId).collection('orders').doc(`${orderData.id}_${idx + 1}`),
      }));
      const locatedEvent = eventoId ? await findEventRef(db, eventoId) : null;
      const couponRef = couponDocId ? db.collection('coupons').doc(String(couponDocId)) : null;
      let processed = false;

      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(orderRef);
        const eventSnap = locatedEvent ? await transaction.get(locatedEvent.ref) : null;
        const couponSnap = couponRef ? await transaction.get(couponRef) : null;

        if (existing.exists) {
          const existingData = existing.data();
          if (existingData.status === 'Pago' || existingData.status === 'approved') {
            return;
          }
        }

        if (eventoId) {
          if (!locatedEvent || !eventSnap.exists) {
            throw new Error('Evento não encontrado para confirmar pagamento.');
          }
          const { updateData } = buildTicketSalesUpdate(eventSnap.data(), ticketType, totalTicketsBought);
          transaction.update(locatedEvent.ref, updateData);
        }

        if (couponCode && couponRef && couponSnap.exists) {
          transaction.update(couponRef, {
            usedCount: admin.firestore.FieldValue.increment(1),
          });
        }

        transaction.set(orderRef, {
        eventoId: eventoId,
        eventoName: eventoNameStr,
        ticketType: ticketType,
        price: roundCurrency(Number(orderData.transaction_amount || 0)),
        originalPrice: amountBeforeDiscount,
        discountAmount,
        couponCode: couponCode || null,
        status: 'Pago',
        purchaseDate: new Date().toISOString(),
        buyerName: orderData.payer?.first_name || '',
        buyerEmail: orderData.payer?.email || '',
        buyerEmailLower: String(orderData.payer?.email || '').trim().toLowerCase(),
        paymentId: orderData.id,
        carInfo,
        ticket: mainTicket,
      });

      // Salva os ingressos adicionais, se houver
        extraTicketEmails.forEach(({ passenger, ticket, ref }) => {
          transaction.set(ref, {
            eventoId: eventoId,
            eventoName: eventoNameStr,
            ticketType: ticketType,
            price: 0,
            originalPrice: 0,
            discountAmount: 0,
            couponCode: couponCode || null,
            status: 'Pago',
            purchaseDate: new Date().toISOString(),
            buyerName: passenger.fullName || 'Acompanhante',
            buyerEmail: passenger.email || '',
            buyerEmailLower: String(passenger.email || '').trim().toLowerCase(),
            paymentId: orderData.id,
            carInfo: {
              plate: passenger.carPlate || '',
              model: passenger.carModel || '',
              year: passenger.carYear || '',
              color: passenger.carColor || ''
            },
            ticket,
          });
        });

        processed = true;
      });

      if (!processed) return;

      // Envia os emails de forma assíncrona
      if (orderData.payer?.email) {
        sendTicketEmail(orderData.payer.email, orderData.payer.first_name || 'Comprador', eventoNameStr, mainTicket.code, mainTicket.qrPayload);
      }
      if (Array.isArray(extraTicketEmails)) {
        extraTicketEmails.forEach(({ passenger, ticket }) => {
          if (passenger.email) {
            sendTicketEmail(passenger.email, passenger.fullName || 'Acompanhante', eventoNameStr, ticket.code, ticket.qrPayload);
          }
        });
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
    const isGuestPayment = metaUid && String(metaUid).startsWith('guest_');
    const isOwnPayment = req.user && metaUid === req.user.uid;
    if (!metaUid || (!isOwnPayment && !isGuestPayment)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return res.json({
      id: orderData.id,
      status: orderData.status,
      transaction_amount: orderData.transaction_amount,
      payer: isOwnPayment ? orderData.payer : undefined,
      metadata: isOwnPayment ? orderData.metadata : undefined,
    });
  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err.message || err);
    return res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
};

function isFirestoreIndexError(err) {
  const message = String(err && err.message ? err.message : err || '');
  return err && (err.code === 9 || message.includes('requires an index') || message.includes('FAILED_PRECONDITION'));
}

async function findOrderDocByTicketCode(db, normalizedTicketCode, eventoId) {
  const expectedEventId = eventoId ? String(eventoId) : '';
  const matches = (docSnap) => {
    const data = docSnap.data() || {};
    const storedCode = normalizeTicketCode(data.ticket && data.ticket.code);
    const storedEventId = String(data.eventoId || '');
    return storedCode === normalizedTicketCode && (!expectedEventId || storedEventId === expectedEventId);
  };

  try {
    const snap = await db.collectionGroup('orders').where('ticket.code', '==', normalizedTicketCode).limit(10).get();
    if (!snap.empty) {
      const found = snap.docs.find(matches);
      if (found) return found;
    }
  } catch (err) {
    if (!isFirestoreIndexError(err)) throw err;
    console.warn('validateTicket: collectionGroup index unavailable; falling back to full order scan.', err.message || err);
  }

  try {
    const allOrdersSnap = await db.collectionGroup('orders').get();
    const found = allOrdersSnap.docs.find(matches);
    if (found) return found;
  } catch (err) {
    console.warn('validateTicket: full collectionGroup order scan failed; falling back to user order scan.', err.message || err);
  }

  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const ordersSnap = await userDoc.ref.collection('orders').get();
    const found = ordersSnap.docs.find(matches);
    if (found) return found;
  }

  return null;
}

exports.getTicketPublic = async (req, res) => {
  try {
    const parsedTicket = parseTicketInput(
      `${req.protocol}://${req.get('host')}/ticket/${encodeURIComponent(req.params.code || '')}?s=${encodeURIComponent(req.query.s || req.query.token || '')}`
    );
    if (!parsedTicket.code) {
      return res.status(400).json({ error: 'Codigo do ingresso obrigatorio.' });
    }

    const db = admin.firestore();
    const docSnap = await findOrderDocByTicketCode(db, parsedTicket.code);
    if (!docSnap) {
      return res.status(404).json({ error: 'Ingresso nao encontrado.' });
    }

    const data = docSnap.data() || {};
    const ticket = data.ticket || {};
    if (ticket.token && !verifyTicketToken(parsedTicket.code, parsedTicket.token, ticket.token)) {
      return res.status(403).json({ error: 'Link do ingresso invalido.' });
    }

    return res.json({
      orderId: docSnap.id,
      eventoId: data.eventoId || '',
      eventoName: data.eventoName || '',
      eventoDate: data.eventoDate || null,
      ticketType: data.ticketType || '',
      buyerName: data.buyerName || data.buyerInfo?.fullName || '',
      buyerEmail: data.buyerEmail || '',
      status: data.status || '',
      carInfo: data.carInfo || data.buyerInfo || null,
      ticket: {
        code: ticket.code || parsedTicket.code,
        qrPayload: ticket.qrPayload || '',
        validated: !!ticket.validated,
        validatedAt: ticket.validatedAt || null,
        validationHistory: Array.isArray(ticket.validationHistory) ? ticket.validationHistory : [],
      },
    });
  } catch (err) {
    console.error('Erro ao consultar ingresso publico:', err.message || err);
    return res.status(500).json({ error: 'Erro ao consultar ingresso.' });
  }
};

exports.validateTicket = async (req, res) => {
  try {
    if (!isAdminRequest(req.user)) {
      return res.status(403).json({ error: `Acesso restrito a administradores. (Sua conta: ${req.user ? req.user.email : 'Nenhuma'})` });
    }
    const { ticketCode, eventoId } = req.body || {};
    const parsedTicket = parseTicketInput(ticketCode);
    const normalized = parsedTicket.code;
    if (!normalized) {
      return res.status(400).json({ error: 'ticketCode é obrigatório.' });
    }

    const db = admin.firestore();
    const docSnap = await findOrderDocByTicketCode(db, normalized, eventoId);
    if (!docSnap) {
      return res.status(404).json({
        error: eventoId ? 'Ingresso não encontrado para este evento.' : 'Ingresso não encontrado.',
      });
    }
    const initialData = docSnap.data() || {};
    const storedTicket = initialData.ticket || {};
    if (storedTicket.token && !verifyTicketToken(normalized, parsedTicket.token, storedTicket.token)) {
      return res.status(403).json({
        error: parsedTicket.token
          ? 'QR Code do ingresso invalido.'
          : 'Este ingresso usa QR Code seguro. Escaneie o QR ou cole o link completo do ingresso.',
      });
    }
    let validatedData;
    let alreadyValidated = false;
    const validationEntry = {
      at: new Date().toISOString(),
      by: req.user.uid,
      byEmail: req.user.email || '',
    };

    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(docSnap.ref);
      if (!freshSnap.exists) {
        throw new Error('Ingresso não encontrado.');
      }

      const data = freshSnap.data();
      if (data.ticket && data.ticket.validated) {
        validatedData = data;
        alreadyValidated = true;
        return;
      }

      validatedData = data;
      transaction.set(
        docSnap.ref,
        {
          ticket: {
            ...(data.ticket || {}),
            code: normalized,
            validated: true,
            validatedAt: admin.firestore.FieldValue.serverTimestamp(),
            validatedBy: req.user.uid,
            validationHistory: [
              ...((data.ticket && Array.isArray(data.ticket.validationHistory)) ? data.ticket.validationHistory : []),
              validationEntry,
            ],
          },
        },
        { merge: true }
      );
    });

    const data = validatedData || docSnap.data();
    if (alreadyValidated) {
      return res.status(409).json({
        error: 'Ingresso já validado.',
        ticket: data.ticket,
        orderId: docSnap.id,
        buyerName: data.buyerName || data.buyerInfo?.fullName || '',
        eventoName: data.eventoName || '',
        carInfo: data.carInfo || data.buyerInfo || null,
      });
    }

    db.collection('activity_logs').add({
      adminEmail: req.user.email || '',
      action: 'VALIDAR_INGRESSO',
      details: `Validou ingresso ${normalized} (${data.eventoName || 'Evento'})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      orderId: docSnap.id,
    }).catch((logErr) => console.warn('Falha ao registrar log de validacao:', logErr.message || logErr));

    return res.json({
      ok: true,
      orderId: docSnap.id,
      eventoName: data.eventoName || '',
      buyerName: data.buyerName || data.buyerInfo?.fullName || '',
      ticketCode: normalized,
      ticket: {
        ...(data.ticket || {}),
        code: normalized,
        validated: true,
        validationHistory: [
          ...((data.ticket && Array.isArray(data.ticket.validationHistory)) ? data.ticket.validationHistory : []),
          validationEntry,
        ],
      },
      carInfo: data.carInfo || data.buyerInfo || null,
    });
  } catch (err) {
    console.error('Erro ao validar ingresso:', err.message || err);
    logServerError('validate_ticket', err, req).catch(() => {});
    return res.status(500).json({ error: 'Erro ao validar ingresso.' });
  }
};
