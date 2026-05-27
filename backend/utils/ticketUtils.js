const crypto = require('crypto');

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ICC-';
  for (let i = 0; i < 10; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 4) code += '-';
  }
  return code;
}

function normalizeTicketCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function getTicketSigningSecret() {
  return (
    process.env.TICKET_SIGNING_SECRET ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.EMAIL_PASS ||
    'dev-only-ticket-secret'
  );
}

function signTicketCode(code) {
  const normalized = normalizeTicketCode(code);
  return crypto
    .createHmac('sha256', getTicketSigningSecret())
    .update(normalized)
    .digest('base64url')
    .slice(0, 32);
}

function buildTicketQrPayload(code, token) {
  const normalized = normalizeTicketCode(code);
  const safeToken = String(token || signTicketCode(normalized));
  const baseUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (baseUrl) {
    return `${baseUrl}/ticket/${encodeURIComponent(normalized)}?s=${encodeURIComponent(safeToken)}`;
  }
  return `ICC:${normalized}:${safeToken}`;
}

function createTicketFields(code) {
  const normalized = normalizeTicketCode(code || generateTicketCode());
  const token = signTicketCode(normalized);
  return {
    code: normalized,
    token,
    qrPayload: buildTicketQrPayload(normalized, token),
    validated: false,
    validatedAt: null,
    validatedBy: null,
    validationHistory: [],
  };
}

function parseTicketInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return { code: '', token: '' };

  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const ticketIndex = parts.findIndex((part) => part.toLowerCase() === 'ticket');
    const codeFromPath = ticketIndex >= 0 ? parts[ticketIndex + 1] : '';
    return {
      code: normalizeTicketCode(decodeURIComponent(codeFromPath || url.searchParams.get('code') || '')),
      token: String(url.searchParams.get('s') || url.searchParams.get('token') || '').trim(),
    };
  } catch (_) {
    // Not a URL; keep parsing below.
  }

  const compactMatch = raw.match(/^ICC:([^:]+):([^:]+)$/i);
  if (compactMatch) {
    return {
      code: normalizeTicketCode(compactMatch[1]),
      token: String(compactMatch[2] || '').trim(),
    };
  }

  return { code: normalizeTicketCode(raw), token: '' };
}

function verifyTicketToken(code, token, storedToken) {
  const received = String(token || '').trim();
  const expected = String(storedToken || signTicketCode(code)).trim();
  if (!received || !expected) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
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
  signTicketCode,
  buildTicketQrPayload,
  createTicketFields,
  parseTicketInput,
  verifyTicketToken,
  isAdminRequest,
};

