const crypto = require('crypto');

function generateTicketCode() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ITC-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function normalizeTicketCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function isAdminRequest(user) {
  if (!user) return false;
  if (user.admin === true) return true;
  const adminEmailEnv = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();
  
  if (adminEmailEnv && userEmail && adminEmailEnv === userEmail) return true;
  if (userEmail === 'itacars237@admin.com') return true;
  if (userEmail === 'aryelgamerbrs2@gmail.com') return true;
  if (user.uid === 'EhJOQzxkHOUjRTbmdNDDIqe7XEy2') return true;
  
  return false;
}

module.exports = {
  generateTicketCode,
  normalizeTicketCode,
  isAdminRequest,
};

