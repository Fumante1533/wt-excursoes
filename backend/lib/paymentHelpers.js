function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase();
}

function isCouponActive(coupon) {
  return !!coupon && coupon.isActive !== false;
}

function couponAppliesToEvent(coupon, eventId) {
  if (!coupon || !coupon.eventId) return true;
  return String(coupon.eventId) === String(eventId);
}

function couponAppliesToTicket(coupon, ticketType) {
  if (!coupon || !Array.isArray(coupon.ticketTypes) || coupon.ticketTypes.length === 0) {
    return true;
  }
  return coupon.ticketTypes.map(String).includes(String(ticketType));
}

function couponHasUsesLeft(coupon) {
  if (!coupon || coupon.maxUses == null) return true;
  return Number(coupon.usedCount || 0) < Number(coupon.maxUses);
}

function calculateCouponDiscount(subtotal, coupon) {
  const normalizedSubtotal = roundCurrency(subtotal);
  if (!coupon || normalizedSubtotal <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    const percentage = Math.max(0, Math.min(Number(coupon.value || 0), 100));
    discount = normalizedSubtotal * (percentage / 100);
  } else {
    discount = Number(coupon.value || 0);
  }

  return roundCurrency(Math.min(Math.max(discount, 0), normalizedSubtotal));
}

function validateCouponForPurchase(coupon, context) {
  if (!coupon) {
    return { valid: false, reason: 'Cupom inválido.' };
  }
  if (!isCouponActive(coupon)) {
    return { valid: false, reason: 'Este cupom não está mais ativo.' };
  }
  if (!couponHasUsesLeft(coupon)) {
    return { valid: false, reason: 'Este cupom já atingiu o limite de usos.' };
  }
  if (!couponAppliesToEvent(coupon, context.eventId)) {
    return { valid: false, reason: 'Este cupom não é válido para este evento.' };
  }
  if (!couponAppliesToTicket(coupon, context.ticketType)) {
    return { valid: false, reason: 'Este cupom não é válido para este tipo de ingresso.' };
  }

  const discountAmount = calculateCouponDiscount(context.subtotal, coupon);
  if (discountAmount <= 0) {
    return { valid: false, reason: 'Este cupom não gera desconto para esta compra.' };
  }

  return {
    valid: true,
    discountAmount,
    total: roundCurrency(context.subtotal - discountAmount),
  };
}

module.exports = {
  roundCurrency,
  normalizeCouponCode,
  calculateCouponDiscount,
  validateCouponForPurchase,
};
