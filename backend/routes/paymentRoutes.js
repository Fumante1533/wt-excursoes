const express = require('express');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const paymentProvider = (process.env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();

const router = express.Router();

const paymentController = require('../controllers/paymentController');
const tapResultController = require('../controllers/tapResultController');

let createHandler = paymentController.createPreference;
let webhookHandler = paymentController.receiveWebhook;
let confirmHandler = paymentController.confirmPayment;

if (paymentProvider === 'stripe') {
  const stripeController = require('../controllers/stripeController');
  createHandler = stripeController.createCheckoutSession;
  confirmHandler = async (req, res) => {
    res.status(501).json({ error: 'Confirmação via sessão Stripe no cliente.' });
  };
}

const optionalAuth = require('../middleware/optionalAuth');
router.post('/create-preference', optionalAuth, createHandler);

if (paymentProvider !== 'stripe') {
  router.post('/webhook', express.json({ limit: '256kb' }), webhookHandler);
  router.get('/webhook', webhookHandler); // IPN legado usa GET
}

router.post('/confirm', verifyFirebaseToken, confirmHandler);
router.post('/tap_result', verifyFirebaseToken, tapResultController.saveTapResult);
router.post('/validate-ticket', verifyFirebaseToken, paymentController.validateTicket);

module.exports = router;
