// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

exports.sendConfirmationEmail = functions.firestore
  .document("users/{userId}/orders/{orderId}")
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const userId = context.params.userId;

    if (orderData.status && orderData.status !== "Pago") {
      return null;
    }

    let userEmail;
    let userName;
    try {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      if (userDoc.exists) {
        userEmail = userDoc.data().email;
        userName = userDoc.data().fullName;
      } else {
        console.log(`Usuário com ID ${userId} não encontrado.`);
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      return null;
    }

    if (!userEmail) {
      console.log(
        `Não foi possível encontrar o e-mail para o usuário ${userId}`
      );
      return null;
    }

    const eventoName = escapeHtml(orderData.eventoName || "");
    const ticketType = escapeHtml(orderData.ticketType || "");
    const priceNum = Number(orderData.price || 0);
    const priceStr = escapeHtml(Number.isFinite(priceNum) ? priceNum.toFixed(2) : "0.00");

    let dateStr = "";
    try {
      if (orderData.eventoDate) {
        const d = orderData.eventoDate.toDate
          ? orderData.eventoDate.toDate()
          : new Date(orderData.eventoDate);
        dateStr = escapeHtml(d.toLocaleDateString("pt-BR"));
      }
    } catch (e) {
      dateStr = "";
    }

    const msg = {
      to: userEmail,
      from: "itacars237@admin.com",
      subject: "Sua inscrição está confirmada! 🚗💨",
      html: `
                <h1>Olá, ${escapeHtml(userName || "Membro")}!</h1>
                <p>Obrigado por se inscrever conosco. Seu evento está confirmado!</p>
                <h2>Detalhes da Inscrição:</h2>
                <ul>
                    <li><strong>Evento:</strong> ${eventoName}</li>
                    <li><strong>Tipo de Ingresso:</strong> ${ticketType}</li>
                    ${
                      dateStr
                        ? `<li><strong>Data do Evento:</strong> ${dateStr}</li>`
                        : ""
                    }
                    <li><strong>Valor Pago:</strong> R$ ${priceStr}</li>
                </ul>
                <p>Mal podemos esperar para acelerar com você!</p>
                <p>Atenciosamente,<br>Equipe Itajobi Cars Club</p>
            `,
    };

    try {
      await sgMail.send(msg);
      console.log(`E-mail de confirmação enviado para ${userEmail}`);
      return null;
    } catch (error) {
      console.error("Erro ao enviar e-mail via SendGrid:", error);
      if (error.response) {
        console.error(error.response.body);
      }
      return null;
    }
  });
