const admin = require('../config/firebaseAdmin');

function sanitizeHeaders(headers = {}) {
  const safe = { ...headers };
  delete safe.authorization;
  delete safe.cookie;
  return safe;
}

async function logServerError(source, err, req, extra = {}) {
  try {
    const db = admin.firestore();
    await db.collection('system_logs').add({
      level: 'error',
      source,
      message: err?.message || String(err || 'Erro desconhecido'),
      stack: err?.stack ? String(err.stack).slice(0, 4000) : '',
      path: req?.originalUrl || req?.url || '',
      method: req?.method || '',
      ip: req?.ip || '',
      headers: req ? sanitizeHeaders(req.headers) : {},
      extra,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logErr) {
    console.warn('Falha ao gravar system_logs:', logErr.message || logErr);
  }
}

module.exports = { logServerError };
