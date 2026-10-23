import { getEventConfig } from './_lib/config.js';
import { sendContactEmails } from './_lib/emailDelivery.js';
import {
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
  setCors,
  setNoStore,
} from './_lib/http.js';
import { enforceRateLimit } from './_lib/rateLimit.js';
import {
  assertJsonContentType,
  assertTrustedBrowserOrigin,
} from './_lib/security.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  setNoStore(res);
  const config = getEventConfig();
  const origin = req.headers.origin || '';
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST', 'OPTIONS']);
    return;
  }

  try {
    assertTrustedBrowserOrigin(req, config);
    assertJsonContentType(req);
    if (!config.databaseUrl) {
      sendError(res, 503, 'UNAVAILABLE', 'Contact form is temporarily unavailable.');
      return;
    }

    await enforceRateLimit({
      key: `contact:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
      databaseUrl: config.databaseUrl,
    });

    const { data } = await readJsonBody(req);
    if (data.website || data.companyUrl) {
      // Honeypot — pretend success.
      sendJson(res, 200, { ok: true });
      return;
    }

    const fullName = String(data.name || data.fullName || '').trim().slice(0, 120);
    const email = String(data.email || '').trim().toLowerCase().slice(0, 254);
    const subject = String(data.subject || 'Website contact').trim().slice(0, 200);
    const message = String(data.message || '').trim().slice(0, 4000);

    if (!fullName || fullName.length < 2) {
      sendError(res, 400, 'INVALID_NAME', 'Please enter your full name.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      sendError(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address.');
      return;
    }
    if (!message || message.length < 10) {
      sendError(res, 400, 'INVALID_MESSAGE', 'Please enter a longer message.');
      return;
    }

    const result = await sendContactEmails({
      fullName,
      email,
      subject,
      message,
      config,
    });

    if (!result.userResult.sent && result.userResult.reason === 'email_not_configured') {
      sendError(
        res,
        503,
        'EMAIL_NOT_CONFIGURED',
        'Messaging is temporarily unavailable. Please email info@shechampion-bbf.org.'
      );
      return;
    }
    if (!result.userResult.sent) {
      sendError(
        res,
        502,
        'EMAIL_SEND_FAILED',
        'We could not send your message right now. Please try again or email info@shechampion-bbf.org.'
      );
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      sendError(res, 429, error.code, error.message);
      return;
    }
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'ORIGIN_NOT_CONFIGURED' ||
      error.code === 'UNSUPPORTED_MEDIA_TYPE' ||
      error.code === 'INVALID_JSON' ||
      error.code === 'PAYLOAD_TOO_LARGE'
    ) {
      sendError(
        res,
        error.code === 'UNSUPPORTED_MEDIA_TYPE'
          ? 415
          : error.code === 'PAYLOAD_TOO_LARGE'
            ? 413
            : 403,
        error.code,
        error.message
      );
      return;
    }
    sendError(res, 500, 'CONTACT_FAILED', 'Unable to submit contact form.');
  }
}
