const admin = require('../config/firebaseAdmin');

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'No token' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // contains uid, email, etc.
    return next();
  } catch (err) {
    console.error('verifyFirebaseToken error:', err.message || err);
    return res.status(401).json({ error: 'invalid_token' });
  }
};
