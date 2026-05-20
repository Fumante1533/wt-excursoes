const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateCouponDiscount,
  normalizeCouponCode,
  roundCurrency,
  validateCouponForPurchase,
} = require('../lib/paymentHelpers');

test('roundCurrency keeps two decimal places safely', () => {
  assert.equal(roundCurrency(10.235), 10.24);
  assert.equal(roundCurrency('9.991'), 9.99);
  assert.equal(roundCurrency(null), 0);
});

test('normalizeCouponCode trims and uppercases codes', () => {
  assert.equal(normalizeCouponCode(' ita20 '), 'ITA20');
});

test('calculateCouponDiscount supports percentage and fixed coupons', () => {
  assert.equal(calculateCouponDiscount(200, { discountType: 'percentage', value: 15 }), 30);
  assert.equal(calculateCouponDiscount(200, { discountType: 'fixed', value: 25.5 }), 25.5);
});

test('calculateCouponDiscount never exceeds subtotal', () => {
  assert.equal(calculateCouponDiscount(50, { discountType: 'fixed', value: 80 }), 50);
  assert.equal(calculateCouponDiscount(50, { discountType: 'percentage', value: 150 }), 50);
});

test('validateCouponForPurchase rejects inactive, exhausted, event and ticket mismatches', () => {
  const context = { eventId: 'event-1', ticketType: 'VIP', subtotal: 100 };

  assert.equal(validateCouponForPurchase({ isActive: false }, context).valid, false);
  assert.equal(validateCouponForPurchase({ isActive: true, maxUses: 1, usedCount: 1 }, context).valid, false);
  assert.equal(validateCouponForPurchase({ isActive: true, eventId: 'other', value: 10 }, context).valid, false);
  assert.equal(validateCouponForPurchase({ isActive: true, ticketTypes: ['Pista'], value: 10 }, context).valid, false);
});

test('validateCouponForPurchase returns final total for a valid coupon', () => {
  const result = validateCouponForPurchase(
    { isActive: true, discountType: 'percentage', value: 20, eventId: 'event-1', ticketTypes: ['VIP'] },
    { eventId: 'event-1', ticketType: 'VIP', subtotal: 250 },
  );

  assert.deepEqual(result, {
    valid: true,
    discountAmount: 50,
    total: 200,
  });
});
