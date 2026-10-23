import { hmacSha512Hex, safeEqualHex } from './crypto.js';
import { EVENT_CURRENCY } from './constants.js';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function initializePaystackTransaction({
  secretKey,
  email,
  amountKobo,
  reference,
  callbackUrl,
  metadata,
}) {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      currency: EVENT_CURRENCY,
      reference,
      callback_url: callbackUrl,
      metadata: {
        custom_fields: [],
        ...metadata,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.status) {
    const err = new Error(
      payload.message || 'Paystack initialization failed.'
    );
    err.code = 'PAYSTACK_INIT_FAILED';
    err.provider = payload;
    throw err;
  }
  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    reference: payload.data.reference,
    raw: sanitizeProviderPayload(payload),
  };
}

export async function verifyPaystackTransaction({ secretKey, reference }) {
  const response = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.status) {
    const err = new Error(payload.message || 'Paystack verification failed.');
    err.code = 'PAYSTACK_VERIFY_FAILED';
    err.provider = payload;
    throw err;
  }
  return {
    data: payload.data,
    raw: sanitizeProviderPayload(payload),
  };
}

export function validatePaystackSuccess({
  data,
  expectedReference,
  expectedAmountKobo,
  expectedCurrency = EVENT_CURRENCY,
}) {
  if (expectedAmountKobo === undefined || expectedAmountKobo === null) {
    return { ok: false, reason: 'Expected amount was not provided.' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Missing provider data.' };
  }
  if (data.status !== 'success') {
    return { ok: false, reason: `Transaction status is ${data.status}.` };
  }
  if (String(data.reference) !== String(expectedReference)) {
    return { ok: false, reason: 'Reference mismatch.' };
  }
  // Prefer requested_amount: when Paystack passes fees to the customer,
  // data.amount is fee-inclusive while requested_amount is the initialize amount.
  const comparableAmount = resolveComparableAmountKobo(data);
  if (comparableAmount === null) {
    return { ok: false, reason: 'Amount mismatch.' };
  }
  if (Number(comparableAmount) !== Number(expectedAmountKobo)) {
    return { ok: false, reason: 'Amount mismatch.' };
  }
  if (String(data.currency).toUpperCase() !== expectedCurrency) {
    return { ok: false, reason: 'Currency mismatch.' };
  }
  return { ok: true };
}

/**
 * Amount to compare against our stored expected_amount_kobo.
 * @param {{ amount?: unknown, requested_amount?: unknown, fees?: unknown }} data
 * @returns {number | null}
 */
export function resolveComparableAmountKobo(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.requested_amount !== undefined && data.requested_amount !== null) {
    const requested = Number(data.requested_amount);
    return Number.isFinite(requested) ? requested : null;
  }
  const amount = Number(data.amount);
  if (!Number.isFinite(amount)) return null;
  if (data.fees !== undefined && data.fees !== null) {
    const fees = Number(data.fees);
    if (Number.isFinite(fees) && fees >= 0) {
      return amount - fees;
    }
  }
  return amount;
}

export function verifyPaystackSignature(secretKey, rawBody, signatureHeader) {
  if (!secretKey || !signatureHeader) return false;
  const computed = hmacSha512Hex(secretKey, rawBody);
  return safeEqualHex(computed, String(signatureHeader));
}

/** Strip card PAN / authorization sensitive fields if present. */
export function sanitizeProviderPayload(payload) {
  try {
    const clone = JSON.parse(JSON.stringify(payload));
    const auth = clone?.data?.authorization;
    if (auth && typeof auth === 'object') {
      delete auth.authorization_code;
      delete auth.bin;
      delete auth.last4;
      delete auth.exp_month;
      delete auth.exp_year;
      delete auth.account_name;
      delete auth.receiver_bank_account_number;
    }
    return clone;
  } catch {
    return { sanitized: false };
  }
}

export function mapPaystackStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'SUCCESS';
  if (s === 'failed' || s === 'reversed') {
    return s === 'reversed' ? 'REVERSED' : 'FAILED';
  }
  if (s === 'abandoned' || s === 'ongoing' || s === 'pending') return 'PENDING';
  return 'FAILED';
}
