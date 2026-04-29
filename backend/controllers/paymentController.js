const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const admin = require('../config/firebaseAdmin');
const { generateTicketCode, normalizeTicketCode, isAdminRequest } = require('../utils/ticketUtils');
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

exports.createPreference = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ error: 'Pagamento não configurado no servidor.' });
    }

    const { evento, excursion, ticket, buyerInfo, carInfo, additionalPassengers, couponCode } = req.body || {};
    console.log('[DEBUG] createPreference payload recebido:', JSON.stringify(req.body, null, 2));

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
    let excursionRef = await db.collection('excursions').doc(String(targetExcursion.id)).get();
    
    if (!excursionRef.exists) {
      excursionRef = await db.collection('eventos').doc(String(targetExcursion.id)).get();
    }

    if (!excursionRef.exists) {
      console.error('[ERROR] Evento não encontrado:', targetExcursion.id);
      return res.status(400).json({ error: 'Evento não encontrado em nenhuma coleção.' });
    }

    const excursionData = excursionRef.data();
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

    const realPrice = realTicket.price;

    const payerEmail = tokenEmail || (buyerInfo && String(buyerInfo.email).trim()) || '';
    if (!payerEmail) {
      return res.status(400).json({ error: 'E-mail do pagador é obrigatório.' });
    }

    if (Number(realPrice) <= 0) {
      return res.status(400).json({ error: 'Ingressos gratuitos ou isentos não podem ser processados via Mercado Pago. O valor deve ser maior que zero.' });
    }

    const preference = new Preference(client);

    const body = {
      items: [
        {
          id: String(targetExcursion.id),
          title: `${excursionData.name} (${ticket.type})`,
          description: excursionData.location || "Evento",
          picture_url: excursionData.image || undefined,
          quantity: totalQtyDemanded,
          currency_id: 'BRL',
          unit_price: Number(realPrice),
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
        coupon_code: couponCode ? String(couponCode).toUpperCase() : '',
        car_info: JSON.stringify(carInfo || {}),
        additional_passengers: additionalPassengers ? JSON.stringify(additionalPassengers).substring(0, 450) : "[]",
      },
    };

    const response = await preference.create({ body });

    if (response && response.id) {
      // Salva o pedido como PENDENTE para rastreio de Carrinho Abandonado
      const orderRef = db.collection('users').doc(uid).collection('orders').doc(String(response.id));
      await orderRef.set({
        eventoId: targetExcursion.id,
        eventoName: excursionData.name,
        ticketType: ticket.type,
        price: Number(realPrice) * totalQtyDemanded,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
        buyerName: payerEmail.split('@')[0],
        buyerEmail: payerEmail,
        abandonedCartSent: false
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
      const existing = await orderRef.get();
      if (existing.exists) return; // já processado (idempotência)

      // Salva o ingresso principal
      const ticketCodeMain = generateTicketCode();
      const eventoNameStr = orderData.additional_info?.items?.[0]?.title?.split(' (')[0] || '';
      
      const batch = db.batch();
      
      batch.set(orderRef, {
        eventoId: eventoId,
        eventoName: eventoNameStr,
        ticketType: ticketType,
        price: Number(orderData.transaction_amount || 0),
        status: 'Pago',
        purchaseDate: new Date().toISOString(),
        buyerName: orderData.payer?.first_name || '',
        buyerEmail: orderData.payer?.email || '',
        paymentId: orderData.id,
        carInfo,
        ticket: {
          code: ticketCodeMain,
          validated: false,
          validatedAt: null,
          validatedBy: null,
        },
      });

      // Salva os ingressos adicionais, se houver
      if (Array.isArray(additionalPassengers)) {
        additionalPassengers.forEach((passenger, idx) => {
          const extraCode = generateTicketCode();
          const extraRef = db.collection('users').doc(userId).collection('orders').doc(`${orderData.id}_${idx + 1}`);
          batch.set(extraRef, {
            eventoId: eventoId,
            eventoName: eventoNameStr,
            ticketType: ticketType,
            price: 0, // o total já foi pago no principal
            status: 'Pago',
            purchaseDate: new Date().toISOString(),
            buyerName: passenger.fullName || 'Acompanhante',
            buyerEmail: passenger.email || '',
            paymentId: orderData.id,
            carInfo: {
              plate: passenger.carPlate || '',
              model: passenger.carModel || '',
              year: passenger.carYear || '',
              color: passenger.carColor || ''
            },
            ticket: {
              code: extraCode,
              validated: false,
              validatedAt: null,
              validatedBy: null,
            },
          });
        });
      }

      await batch.commit();

      // Incrementa usedCount do cupom, se havia cupom aplicado
      const couponCode = orderData.metadata?.coupon_code;
      if (couponCode) {
        try {
          const couponSnap = await db.collection('coupons').where('code', '==', couponCode).limit(1).get();
          if (!couponSnap.empty) {
            await couponSnap.docs[0].ref.update({
              usedCount: admin.firestore.FieldValue.increment(1)
            });
          }
        } catch (couponErr) {
          console.error('Erro ao incrementar cupom:', couponErr.message);
        }
      }

      // Envia os emails de forma assíncrona
      if (orderData.payer?.email) {
        sendTicketEmail(orderData.payer.email, orderData.payer.first_name || 'Comprador', eventoNameStr, ticketCodeMain);
      }
      if (Array.isArray(additionalPassengers)) {
        additionalPassengers.forEach((passenger, idx) => {
          if (passenger.email) {
            sendTicketEmail(passenger.email, passenger.fullName || 'Acompanhante', eventoNameStr, `${orderData.id}_${idx + 1}`);
          }
        });
      }

          if (eventoId) {
            const eventoRef = db.collection('excursions').doc(String(eventoId));
            const eventoSnap = await eventoRef.get();
            const totalTicketsBought = 1 + additionalPassengers.length;
            const updateData = { bookedSlots: admin.firestore.FieldValue.increment(totalTicketsBought) };

            // Incrementar contagem do lote vendido
            if (eventoSnap.exists && ticketType) {
              const eventoData = eventoSnap.data();
              const ticketIndex = (eventoData.tickets || []).findIndex((t) => t.type === ticketType);
              if (ticketIndex >= 0) {
                const currentSoldCount = (eventoData.ticketSoldCounts || {})[String(ticketIndex)] || 0;
                const newSoldCounts = {
                  ...(eventoData.ticketSoldCounts || {}),
                  [String(ticketIndex)]: Number(currentSoldCount) + totalTicketsBought,
                };
                updateData.ticketSoldCounts = newSoldCounts;
              }
            }

            await eventoRef.update(updateData);
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
      return res.status(403).json({ error: `Acesso restrito a administradores. (Sua conta: ${req.user ? req.user.email : 'Nenhuma'})` });
    }
    const { ticketCode, eventoId } = req.body || {};
    const normalized = normalizeTicketCode(ticketCode);
    if (!normalized) {
      return res.status(400).json({ error: 'ticketCode é obrigatório.' });
    }

    const db = admin.firestore();
    let q = db.collectionGroup('orders').where('ticket.code', '==', normalized).limit(1);
    if (eventoId) {
      q = q.where('eventoId', '==', String(eventoId));
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
      eventoName: data.eventoName || '',
      buyerName: data.buyerName || data.buyerInfo?.fullName || '',
      ticketCode: normalized,
    });
  } catch (err) {
    console.error('Erro ao validar ingresso:', err.message || err);
    return res.status(500).json({ error: 'Erro ao validar ingresso.' });
  }
};
