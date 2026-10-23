import {
  EVENT_DATE_DISPLAY,
  EVENT_LOCATION_DISPLAY,
  EVENT_NAME,
} from './constants.js';
import { formatNgnFromKobo } from './pricing.js';

/**
 * Email provider abstraction. Resend is the initial adapter.
 * Delivery status is recorded separately from payment / registration status.
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

function eventTitle() {
  return EVENT_NAME.replace('BUSINESS', 'Business').replace(
    'EMPOWERMENT CHALLENGE',
    'Empowerment Challenge'
  );
}

function participationSummary({
  challengeSelected,
  exhibitionSelected,
  challengeStatus,
  exhibitionStatus,
}) {
  const parts = [];
  if (challengeSelected) {
    parts.push(
      `Business Empowerment Challenge participation: ${challengeStatus || 'selected'}`
    );
  }
  if (exhibitionSelected) {
    parts.push(
      `Business exhibition participation: ${exhibitionStatus || 'selected'}`
    );
  }
  if (!parts.length) {
    parts.push('General event registration only (no paid participation selected).');
  }
  return parts;
}

/** Free event registration confirmation — does not claim paid participation. */
export function buildFreeRegistrationEmail({ publicReference, fullName }) {
  const subject = `${eventTitle()} — Event Registration Confirmed`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const text = [
    greeting,
    '',
    `Your free event registration for the ${EVENT_NAME} is confirmed.`,
    '',
    `Registration reference: ${publicReference}`,
    `Event date: ${EVENT_DATE_DISPLAY}`,
    `Location: ${EVENT_LOCATION_DISPLAY}`,
    '',
    'This confirmation covers general event registration only.',
    'It does not confirm Business Empowerment Challenge participation or business exhibition, which require separate paid selection and verified payment when chosen.',
    '',
    'Next steps:',
    '- Keep this reference for your records.',
    '- SHE CHAMPIONS will share further event information with registered attendees as details are confirmed.',
    '',
    'If you have questions, contact SHE CHAMPIONS via the website contact page.',
    '',
    'SHE CHAMPIONS',
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>Your free event registration for the <strong>${EVENT_NAME}</strong> is confirmed.</p>
    <p><strong>Registration reference:</strong> ${publicReference}<br/>
    <strong>Event date:</strong> ${EVENT_DATE_DISPLAY}<br/>
    <strong>Location:</strong> ${EVENT_LOCATION_DISPLAY}</p>
    <p>This confirmation covers general event registration only. It does not confirm Business Empowerment Challenge participation or business exhibition.</p>
    <p><strong>Next steps</strong></p>
    <ul>
      <li>Keep this reference for your records.</li>
      <li>SHE CHAMPIONS will share further event information with registered attendees as details are confirmed.</li>
    </ul>
    <p>If you have questions, contact SHE CHAMPIONS via the website contact page.</p>
    <p>SHE CHAMPIONS</p>
  `.trim();

  return { subject, text, html, emailType: 'free_registration_confirmation' };
}

/**
 * Paid participation confirmation — only after verified payment.
 * Reflects challenge / exhibition / both based on stored selection.
 */
export function buildParticipationConfirmationEmail({
  publicReference,
  fullName,
  challengeSelected,
  exhibitionSelected,
  challengeStatus,
  exhibitionStatus,
  expectedAmountKobo,
}) {
  const both = challengeSelected && exhibitionSelected;
  let subjectSuffix = 'Participation Confirmed';
  if (both) subjectSuffix = 'Challenge and Exhibition Confirmed';
  else if (challengeSelected) subjectSuffix = 'Challenge Participation Confirmed';
  else if (exhibitionSelected) subjectSuffix = 'Exhibition Participation Confirmed';

  const subject = `${eventTitle()} — ${subjectSuffix}`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const summary = participationSummary({
    challengeSelected,
    exhibitionSelected,
    challengeStatus,
    exhibitionStatus,
  });
  const amountLine = formatNgnFromKobo(expectedAmountKobo);

  const text = [
    greeting,
    '',
    `Your paid participation for the ${EVENT_NAME} has been confirmed after payment verification.`,
    '',
    `Registration reference: ${publicReference}`,
    `Verified participation fee: ${amountLine}`,
    `Event date: ${EVENT_DATE_DISPLAY}`,
    `Location: ${EVENT_LOCATION_DISPLAY}`,
    '',
    'Confirmed selections:',
    ...summary.map((line) => `- ${line}`),
    '',
    'Your free event registration remains on file. Paid participation is confirmed only for the activities listed above.',
    '',
    'Next steps:',
    '- Keep this reference for your records.',
    '- SHE CHAMPIONS will contact participants when further assessment materials or exhibitor instructions are required.',
    '- Payment confirms participation in the selected paid activities only; it does not guarantee a grant award or any unconfirmed benefit.',
    '',
    'If you have questions, contact SHE CHAMPIONS via the website contact page.',
    '',
    'SHE CHAMPIONS',
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>Your paid participation for the <strong>${EVENT_NAME}</strong> has been confirmed after payment verification.</p>
    <p><strong>Registration reference:</strong> ${publicReference}<br/>
    <strong>Verified participation fee:</strong> ${amountLine}<br/>
    <strong>Event date:</strong> ${EVENT_DATE_DISPLAY}<br/>
    <strong>Location:</strong> ${EVENT_LOCATION_DISPLAY}</p>
    <p><strong>Confirmed selections</strong></p>
    <ul>${summary.map((line) => `<li>${line}</li>`).join('')}</ul>
    <p>Your free event registration remains on file. Paid participation is confirmed only for the activities listed above.</p>
    <p><strong>Next steps</strong></p>
    <ul>
      <li>Keep this reference for your records.</li>
      <li>SHE CHAMPIONS will contact participants when further assessment materials or exhibitor instructions are required.</li>
      <li>Payment confirms participation in the selected paid activities only; it does not guarantee a grant award or any unconfirmed benefit.</li>
    </ul>
    <p>If you have questions, contact SHE CHAMPIONS via the website contact page.</p>
    <p>SHE CHAMPIONS</p>
  `.trim();

  return { subject, text, html, emailType: 'participation_confirmation' };
}

/** @deprecated Prefer buildFreeRegistrationEmail / buildParticipationConfirmationEmail. */
export function buildConfirmationEmail(args) {
  if (args?.paymentRequired === false || args?.freeOnly) {
    return buildFreeRegistrationEmail(args);
  }
  return buildParticipationConfirmationEmail(args);
}
