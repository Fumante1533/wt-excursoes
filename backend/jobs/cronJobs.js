const cron = require('node-cron');
const admin = require('../config/firebaseAdmin');
const nodemailer = require('nodemailer');

const sendReminderEmail = async (email, name, eventName, ticketCode) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🚨 É amanhã! Seu ingresso para o ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2 style="color: #eab308;">O Grande Dia Chegou!</h2>
          <p>Olá <strong>${name}</strong>, estamos muito animados para o evento de amanhã.</p>
          <p>Lembre-se de levar seu documento de identidade e o seu QR Code impresso ou salvo no celular.</p>
          <div style="margin: 20px auto; padding: 20px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <p style="font-size: 18px; margin: 0;">Código do Ingresso:</p>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${ticketCode}</p>
          </div>
          <p>Apresente este código na entrada.</p>
          <p>Acelere com cuidado e nos vemos lá!</p>
        </div>
      `
    });
    console.log(`Lembrete enviado para ${email}`);
  } catch (err) {
    console.error(`Erro ao enviar lembrete para ${email}:`, err);
  }
};

const sendNPSEmail = async (email, name, eventName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Como foi o ${eventName}? Avalie sua experiência! ⭐`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2 style="color: #eab308;">Obrigado por comparecer!</h2>
          <p>Olá <strong>${name}</strong>, esperamos que você tenha curtido muito o <strong>${eventName}</strong>.</p>
          <p>Para continuarmos melhorando, gostaríamos muito de ouvir a sua opinião.</p>
          <div style="margin: 20px auto; padding: 20px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <p style="font-size: 18px; margin: 0; margin-bottom: 15px;">De 1 a 5 estrelas, como você avalia o evento?</p>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0; letter-spacing: 5px;">⭐⭐⭐⭐⭐</p>
            <p style="font-size: 14px; margin-top: 15px; color: #666;">(Apenas responda este e-mail com seus comentários e sugestões!)</p>
          </div>
          <p>Até a próxima aceleração!</p>
        </div>
      `
    });
    console.log(`NPS enviado para ${email}`);
  } catch (err) {
    console.error(`Erro ao enviar NPS para ${email}:`, err);
  }
};

const sendAbandonedCartEmail = async (email, name, eventName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Você esqueceu o seu ingresso do ${eventName}? 🏎️`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2 style="color: #eab308;">Falta pouco para acelerar com a gente!</h2>
          <p>Olá <strong>${name}</strong>, vimos que você tentou comprar um ingresso para o <strong>${eventName}</strong>, mas não finalizou o pagamento.</p>
          <p>Sua vaga está quase garantida, volte ao site e finalize sua inscrição antes que os lotes virem!</p>
          <div style="margin: 20px auto;">
            <a href="${process.env.FRONTEND_URL || 'https://itajobicarsclub.com.br'}" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Finalizar Compra</a>
          </div>
        </div>
      `
    });
    console.log(`Carrinho abandonado enviado para ${email}`);
  } catch (err) {
    console.error(`Erro ao enviar Carrinho abandonado para ${email}:`, err);
  }
};

const initCronJobs = () => {
  // Lembrete 24h
  cron.schedule('0 10 * * *', async () => {
    console.log('Executando Cron Job: Lembretes de Eventos 24h...');
    try {
      const db = admin.firestore();
      
      const today = new Date();
      const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const tomorrowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
      
      const eventosSnap = await db.collection('eventos').get();
      
      const upcomingEvents = eventosSnap.docs.filter(doc => {
        const data = doc.data();
        if (!data.date) return false;
        const eventDate = new Date(data.date);
        return eventDate >= tomorrowStart && eventDate < tomorrowEnd;
      });

      if (upcomingEvents.length === 0) {
        console.log('Nenhum evento agendado para amanhã.');
        return;
      }

      const eventIds = upcomingEvents.map(e => e.id);
      
      const ordersSnap = await db.collectionGroup('orders').get();
      
      const ordersToRemind = ordersSnap.docs.filter(doc => {
        const data = doc.data();
        return eventIds.includes(String(data.eventoId)) && data.status === 'Pago' && !data.reminderSent;
      });

      console.log(`Encontrados ${ordersToRemind.length} ingressos para enviar lembrete.`);

      const batch = db.batch();
      for (const orderDoc of ordersToRemind) {
        const data = orderDoc.data();
        await sendReminderEmail(
          data.buyerEmail, 
          data.buyerName || 'Participante', 
          data.eventoName || 'Evento Itajobi', 
          data.ticket?.code || 'N/A'
        );
        batch.update(orderDoc.ref, { reminderSent: true });
      }

      if (ordersToRemind.length > 0) {
        await batch.commit();
      }

    } catch (err) {
      console.error('Erro ao processar lembretes 24h:', err);
    }
  }, { scheduled: true, timezone: "America/Sao_Paulo" });

  // NPS Pós-Evento (1 dia após)
  cron.schedule('0 12 * * *', async () => {
    console.log('Executando Cron Job: NPS Pós-Evento...');
    try {
      const db = admin.firestore();
      
      const today = new Date();
      const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const yesterdayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const eventosSnap = await db.collection('eventos').get();
      
      const pastEvents = eventosSnap.docs.filter(doc => {
        const data = doc.data();
        if (!data.date) return false;
        const eventDate = new Date(data.date);
        return eventDate >= yesterdayStart && eventDate < yesterdayEnd;
      });

      if (pastEvents.length === 0) {
        console.log('Nenhum evento ocorreu ontem.');
        return;
      }

      const eventIds = pastEvents.map(e => e.id);
      
      const ordersSnap = await db.collectionGroup('orders').get();
      
      const ordersToNPS = ordersSnap.docs.filter(doc => {
        const data = doc.data();
        return eventIds.includes(String(data.eventoId)) && data.status === 'Pago' && !data.npsSent;
      });

      console.log(`Encontrados ${ordersToNPS.length} participantes para enviar NPS.`);

      const batch = db.batch();
      for (const orderDoc of ordersToNPS) {
        const data = orderDoc.data();
        if(data.buyerEmail) {
          await sendNPSEmail(
            data.buyerEmail, 
            data.buyerName || 'Participante', 
            data.eventoName || 'Evento Itajobi'
          );
        }
        batch.update(orderDoc.ref, { npsSent: true });
      }

      if (ordersToNPS.length > 0) {
        await batch.commit();
      }

    } catch (err) {
      console.error('Erro ao processar NPS:', err);
    }
  }, { scheduled: true, timezone: "America/Sao_Paulo" });

  // Carrinho Abandonado (Rodando a cada hora)
  cron.schedule('0 * * * *', async () => {
    console.log('Executando Cron Job: Carrinho Abandonado...');
    try {
      const db = admin.firestore();
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const ordersSnap = await db.collectionGroup('orders').get();
      
      const abandonedOrders = ordersSnap.docs.filter(doc => {
        const data = doc.data();
        if (data.status !== 'Pendente' || data.abandonedCartSent || !data.createdAt) return false;
        const orderDate = new Date(data.createdAt);
        return orderDate < twoHoursAgo && orderDate > twentyFourHoursAgo;
      });

      console.log(`Encontrados ${abandonedOrders.length} carrinhos abandonados.`);

      const batch = db.batch();
      for (const orderDoc of abandonedOrders) {
        const data = orderDoc.data();
        if(data.buyerEmail) {
          await sendAbandonedCartEmail(
            data.buyerEmail, 
            data.buyerName || 'Comprador', 
            data.eventoName || 'Evento Itajobi'
          );
        }
        batch.update(orderDoc.ref, { abandonedCartSent: true });
      }

      if (abandonedOrders.length > 0) {
        await batch.commit();
      }

    } catch (err) {
      console.error('Erro ao processar Carrinho Abandonado:', err);
    }
  }, { scheduled: true, timezone: "America/Sao_Paulo" });
  
  console.log('Cron jobs inicializados.');
};

module.exports = { initCronJobs };
