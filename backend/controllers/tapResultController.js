const admin = require('../config/firebaseAdmin');

const ALLOWED = new Set([
  'order_id',
  'nsu',
  'aut',
  'card_brand',
  'access_id',
  'handle',
  'merchant_document',
  'warning',
  'amount',
]);

exports.saveTapResult = async (req, res) => {
  try {
    const uid = req.user.uid;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.user_id != null && String(body.user_id) !== uid) {
      return res.status(403).json({ error: 'user_id não confere com a sessão' });
    }

    const payload = { receiptDate: new Date().toISOString() };
    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
        payload[key] = body[key];
      }
    }

    const orderDocId = String(body.nsu || body.order_id || `tap_${Date.now()}`);
    const orderRef = admin.firestore().collection('users').doc(uid).collection('tap_receipts').doc(orderDocId);
    await orderRef.set(payload, { merge: true });

    return res.json({ ok: true, id: orderDocId });
  } catch (err) {
    console.error('saveTapResult:', err.message || err);
    return res.status(500).json({ error: 'Falha ao registrar recibo' });
  }
};
