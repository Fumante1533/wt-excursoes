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

    const excursionName = escapeHtml(orderData.excursionName || "");
    const ticketType = escapeHtml(orderData.ticketType || "");
    const priceNum = Number(orderData.price || 0);
    const priceStr = escapeHtml(Number.isFinite(priceNum) ? priceNum.toFixed(2) : "0.00");

    let dateStr = "";
    try {
      if (orderData.excursionDate) {
        const d = orderData.excursionDate.toDate
          ? orderData.excursionDate.toDate()
          : new Date(orderData.excursionDate);
        dateStr = escapeHtml(d.toLocaleDateString("pt-BR"));
      }
    } catch (e) {
      dateStr = "";
    }

    const msg = {
      to: userEmail,
      from: "contato@wtexcursoes.com",
      subject: "Sua próxima aventura está confirmada!",
      html: `
                <h1>Olá, ${escapeHtml(userName || "Aventureiro(a)")}!</h1>
                <p>Obrigado por comprar conosco. Sua excursão está confirmada!</p>
                <h2>Detalhes do Pedido:</h2>
                <ul>
                    <li><strong>Excursão:</strong> ${excursionName}</li>
                    <li><strong>Ingresso:</strong> ${ticketType}</li>
                    ${
                      dateStr
                        ? `<li><strong>Data da Viagem:</strong> ${dateStr}</li>`
                        : ""
                    }
                    <li><strong>Valor Pago:</strong> R$ ${priceStr}</li>
                </ul>
                <p>Mal podemos esperar para viajar com você!</p>
                <p>Atenciosamente,<br>Equipe WT Excursões</p>
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
