const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createTicketFields,
  parseTicketInput,
  verifyTicketToken,
} = require('../utils/ticketUtils');

test('createTicketFields signs and parses secure ticket payloads', () => {
  process.env.TICKET_SIGNING_SECRET = 'test-secret';
  process.env.FRONTEND_URL = 'https://itajobicarsclub.com.br';

  const ticket = createTicketFields('ICC-AB123-CD456');
  const parsed = parseTicketInput(ticket.qrPayload);

  assert.equal(parsed.code, ticket.code);
  assert.equal(parsed.token, ticket.token);
  assert.equal(verifyTicketToken(parsed.code, parsed.token, ticket.token), true);
  assert.equal(verifyTicketToken(parsed.code, 'wrong-token', ticket.token), false);
});

test('parseTicketInput keeps legacy plain codes compatible', () => {
  const parsed = parseTicketInput(' icc-acde1-23456 ');

  assert.equal(parsed.code, 'ICC-ACDE1-23456');
  assert.equal(parsed.token, '');
});
