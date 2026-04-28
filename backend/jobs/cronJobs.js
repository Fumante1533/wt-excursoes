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

const initCronJobs = () => {
  // Roda todos os dias às 10:00 AM (horário de Brasília)
  cron.schedule('0 10 * * *', async () => {
    console.log('Executando Cron Job: Lembretes de Eventos 24h...');
    try {
      const db = admin.firestore();
      
      // 1. Buscar todos os eventos que vão acontecer amanhã
      const today = new Date();
      const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const tomorrowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
      
      const excursionsSnap = await db.collection('excursions').get();
      
      const upcomingEvents = excursionsSnap.docs.filter(doc => {
        const data = doc.data();
        if (!data.date) return false;
        const eventDate = new Date(data.date);
        // Verifica se o evento cai em qualquer hora de "amanhã"
        return eventDate >= tomorrowStart && eventDate < tomorrowEnd;
      });

      if (upcomingEvents.length === 0) {
        console.log('Nenhum evento agendado para amanhã.');
        return;
      }

      const eventIds = upcomingEvents.map(e => e.id);
      
      // 2. Buscar todos os pedidos (ingressos) desses eventos
      const ordersSnap = await db.collectionGroup('orders').get();
      
      const ordersToRemind = ordersSnap.docs.filter(doc => {
        const data = doc.data();
        return eventIds.includes(String(data.excursionId)) && data.status === 'Pago' && !data.reminderSent;
      });

      console.log(`Encontrados ${ordersToRemind.length} ingressos para enviar lembrete.`);

      // 3. Enviar e-mails
      const batch = db.batch();
      for (const orderDoc of ordersToRemind) {
        const data = orderDoc.data();
        await sendReminderEmail(
          data.buyerEmail, 
          data.buyerName || 'Participante', 
          data.excursionName || 'Evento Itajobi', 
          data.ticket?.code || 'N/A'
        );
        // Marca o pedido para não enviar de novo caso a cron rode 2x
        batch.update(orderDoc.ref, { reminderSent: true });
      }

      if (ordersToRemind.length > 0) {
        await batch.commit();
      }

    } catch (err) {
      console.error('Erro ao processar lembretes 24h:', err);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
  
  console.log('Cron jobs inicializados.');
};

module.exports = { initCronJobs };
