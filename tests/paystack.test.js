import { describe, expect, it } from 'vitest';
import {
  validatePaystackSuccess,
  verifyPaystackSignature,
} from '../api/_lib/paystack.js';
import { hmacSha512Hex, hashPassword, verifyPassword } from '../api/_lib/crypto.js';
import { EVENT_FEE_KOBO } from '../api/_lib/constants.js';

describe('Paystack verification rules', () => {
  const good = {
    status: 'success',
    reference: 'SCBEC26_' + 'b'.repeat(32),
    amount: EVENT_FEE_KOBO,
    currency: 'NGN',
  };

  it('accepts successful matching transactions', () => {
    expect(
      validatePaystackSuccess({
        data: good,
        expectedReference: good.reference,
        expectedAmountKobo: EVENT_FEE_KOBO,
      }).ok
    ).toBe(true);
  });

  it('rejects incorrect amount or currency', () => {
    expect(
      validatePaystackSuccess({
        data: { ...good, amount: 5000 },
        expectedReference: good.reference,
        expectedAmountKobo: EVENT_FEE_KOBO,
      }).ok
    ).toBe(false);
    expect(
      validatePaystackSuccess({
        data: { ...good, currency: 'USD' },
        expectedReference: good.reference,
        expectedAmountKobo: EVENT_FEE_KOBO,
      }).ok
    ).toBe(false);
  });

  it('rejects incorrect transaction reference', () => {
    expect(
      validatePaystackSuccess({
        data: good,
        expectedReference: 'SCBEC26_' + 'c'.repeat(32),
        expectedAmountKobo: EVENT_FEE_KOBO,
      }).ok
    ).toBe(false);
  });

  it('requires an expected amount from the server', () => {
    expect(
      validatePaystackSuccess({
        data: good,
        expectedReference: good.reference,
      }).ok
    ).toBe(false);
  });

  it('accepts exhibition and combined amounts when expected', () => {
    expect(
      validatePaystackSuccess({
        data: { ...good, amount: 3000000 },
        expectedReference: good.reference,
        expectedAmountKobo: 3000000,
      }).ok
    ).toBe(true);
    expect(
      validatePaystackSuccess({
        data: { ...good, amount: 3500000 },
        expectedReference: good.reference,
        expectedAmountKobo: 3500000,
      }).ok
    ).toBe(true);
    expect(
      validatePaystackSuccess({
        data: { ...good, amount: 500000 },
        expectedReference: good.reference,
        expectedAmountKobo: 3500000,
      }).ok
    ).toBe(false);
  });
});

describe('webhook signature', () => {
  it('accepts valid HMAC-SHA512 signatures', () => {
    const body = Buffer.from('{"event":"charge.success"}');
    const secret = 'sk_test_secret';
    const signature = hmacSha512Hex(secret, body);
    expect(verifyPaystackSignature(secret, body, signature)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const body = Buffer.from('{"event":"charge.success"}');
    expect(
      verifyPaystackSignature('sk_test_secret', body, 'deadbeef')
    ).toBe(false);
  });
});

describe('admin password hashing', () => {
  it('verifies scrypt hashes and rejects wrong passwords', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
    expect(verifyPassword('wrong-password-value', hash)).toBe(false);
  });
});
