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
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();
  return !!(adminEmail && userEmail && adminEmail === userEmail);
}

module.exports = {
  generateTicketCode,
  normalizeTicketCode,
  isAdminRequest,
};

