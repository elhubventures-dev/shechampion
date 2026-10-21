import {
  EVENT_DATE_DISPLAY,
  EVENT_LOCATION_DISPLAY,
  EVENT_NAME,
} from './constants.js';

/**
 * Email provider abstraction. Resend is the initial adapter.
 * Delivery status is recorded separately from payment status.
 */
export function createEmailProvider(config) {
  if (!config.resendApiKey || !config.emailFrom) {
    return {
      name: 'none',
      async send() {
        const err = new Error('Email provider is not configured.');
        err.code = 'EMAIL_NOT_CONFIGURED';
        throw err;
      },
    };
  }

  return {
    name: 'resend',
    async send({ to, subject, html, text }) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [to],
          subject,
          html,
          text,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(
          payload.message || 'Email provider rejected the request.'
        );
        err.code = 'EMAIL_SEND_FAILED';
        err.provider = payload;
        throw err;
      }
      if (!payload.id) {
        const err = new Error(
          'Email provider did not return a message id; delivery not confirmed.'
        );
        err.code = 'EMAIL_UNCONFIRMED';
        err.provider = payload;
        throw err;
      }
      return { messageId: payload.id, provider: 'resend' };
    },
  };
}

export function buildConfirmationEmail({ publicReference, fullName }) {
  const subject = `${EVENT_NAME.replace('BUSINESS', 'Business').replace(
    'EMPOWERMENT CHALLENGE',
    'Empowerment Challenge'
  )} — Registration Confirmed`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const text = [
    greeting,
    '',
    `Your registration for the ${EVENT_NAME} is confirmed.`,
    '',
    `Registration reference: ${publicReference}`,
    `Event date: ${EVENT_DATE_DISPLAY}`,
    `Location: ${EVENT_LOCATION_DISPLAY}`,
    '',
    'Next steps:',
    '- Keep this reference for your records.',
    '- SHE CHAMPIONS will contact shortlisted applicants for further assessment materials when required.',
    '- Paying the participation fee confirms registration only; it does not guarantee a grant award.',
    '',
    'If you have questions, contact SHE CHAMPIONS via the website contact page.',
    '',
    'SHE CHAMPIONS',
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>Your registration for the <strong>${EVENT_NAME}</strong> is confirmed.</p>
    <p><strong>Registration reference:</strong> ${publicReference}<br/>
    <strong>Event date:</strong> ${EVENT_DATE_DISPLAY}<br/>
    <strong>Location:</strong> ${EVENT_LOCATION_DISPLAY}</p>
    <p><strong>Next steps</strong></p>
    <ul>
      <li>Keep this reference for your records.</li>
      <li>SHE CHAMPIONS will contact shortlisted applicants for further assessment materials when required.</li>
      <li>Paying the participation fee confirms registration only; it does not guarantee a grant award.</li>
    </ul>
    <p>If you have questions, contact SHE CHAMPIONS via the website contact page.</p>
    <p>SHE CHAMPIONS</p>
  `.trim();

  return { subject, text, html };
}
