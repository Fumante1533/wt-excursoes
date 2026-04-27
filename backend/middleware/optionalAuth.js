const admin = require('../config/firebaseAdmin');

module.exports = async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      req.user = null;
      return next();
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // contains uid, email, etc.
    return next();
  } catch (err) {
    console.warn('optionalAuth error:', err.message || err);
    req.user = null;
    return next();
  }
};
