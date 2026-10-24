import {
  EVENT_DATE_DISPLAY,
  EVENT_LOCATION_DISPLAY,
  EVENT_NAME,
} from './constants.js';
import { formatNgnFromKobo } from './pricing.js';
import {
  absoluteUrl,
  buildTextEmail,
  EMAIL_BRAND,
  escapeHtml,
  eventTitle,
  logoUrl,
  plainTextToHtmlParagraphs,
  renderBrandedEmail,
} from './emailLayout.js';

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

function defaultSecondary(config) {
  return [
    {
      label: 'Contact SHE CHAMPIONS',
      href: absoluteUrl(config, '/contact'),
    },
    {
      label: 'Event page',
      href: absoluteUrl(config, '/business-empowerment-challenge-2026'),
    },
  ];
}

function baseDetails(publicReference) {
  return [
    { label: 'Registration reference', value: publicReference || '—' },
    { label: 'Event date', value: EVENT_DATE_DISPLAY },
    { label: 'Location', value: EVENT_LOCATION_DISPLAY },
  ];
}

/** Free event registration confirmation — does not claim paid participation. */
export function buildFreeRegistrationEmail({
  publicReference,
  fullName,
  config = {},
}) {
  const subject = `${eventTitle()} — Event Registration Confirmed`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const bullets = [
    'Keep this reference for your records.',
    'SHE CHAMPIONS will share further event information with registered attendees as details are confirmed.',
    'This does not confirm Challenge or Exhibition participation.',
  ];
  const primaryCta = {
    label: 'View event page',
    href: absoluteUrl(config, '/business-empowerment-challenge-2026'),
  };
  const secondaryCtas = defaultSecondary(config);

  const html = renderBrandedEmail({
    config,
    preheader: 'Your free event registration is confirmed.',
    title: 'Event registration confirmed',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Your free event registration for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> is confirmed. This covers general event registration only.</p>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });

  const text = buildTextEmail({
    greeting,
    introLines: [
      `Your free event registration for the ${EVENT_NAME} is confirmed.`,
      'This confirmation covers general event registration only.',
      'It does not confirm Business Empowerment Challenge participation or business exhibition.',
    ],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });

  return {
    subject,
    text,
    html,
    emailType: 'free_registration_confirmation',
    logoUrl: logoUrl(config),
  };
}

/**
 * Paid participation confirmation — only after verified payment.
 */
export function buildParticipationConfirmationEmail({
  publicReference,
  fullName,
  challengeSelected,
  exhibitionSelected,
  challengeStatus,
  exhibitionStatus,
  expectedAmountKobo,
  paymentReference,
  config = {},
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
  const details = [
    ...baseDetails(publicReference),
    { label: 'Verified participation fee', value: amountLine },
  ];
  const bullets = [
    'Keep this reference for your records.',
    'SHE CHAMPIONS will contact participants when further assessment materials or exhibitor instructions are required.',
    'Payment confirms participation in the selected paid activities only; it does not guarantee a grant award.',
  ];
  const primaryCta = {
    label: 'Open event page',
    href: absoluteUrl(
      config,
      '/business-empowerment-challenge-2026#participation'
    ),
  };
  const secondaryCtas = [
    ...(paymentReference
      ? [
          {
            label: 'Payment result',
            href: absoluteUrl(
              config,
              `/payment/result?reference=${encodeURIComponent(paymentReference)}`
            ),
          },
        ]
      : []),
    ...defaultSecondary(config),
  ];

  const html = renderBrandedEmail({
    config,
    preheader: 'Your paid participation has been verified.',
    title: subjectSuffix,
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Your paid participation for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> has been confirmed after payment verification. Your free event registration remains on file.</p><p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${EMAIL_BRAND.navy};">Confirmed selections</p><ul style="margin:0 0 18px;padding:0 0 0 20px;color:${EMAIL_BRAND.muted};font-size:15px;line-height:1.6;">${summary.map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`).join('')}</ul>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });

  const text = buildTextEmail({
    greeting,
    introLines: [
      `Your paid participation for the ${EVENT_NAME} has been confirmed after payment verification.`,
      'Confirmed selections:',
      ...summary.map((line) => `- ${line}`),
      'Your free event registration remains on file.',
    ],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });

  return {
    subject,
    text,
    html,
    emailType: 'participation_confirmation',
    logoUrl: logoUrl(config),
  };
}

export function buildPaymentPendingEmail({
  publicReference,
  fullName,
  expectedAmountKobo,
  checkoutUrl,
  paymentReference,
  config = {},
}) {
  const subject = `${eventTitle()} — Complete your payment`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = [
    ...baseDetails(publicReference),
    {
      label: 'Amount due',
      value: formatNgnFromKobo(expectedAmountKobo),
    },
  ];
  const primaryCta = {
    label: 'Complete payment',
    href:
      checkoutUrl ||
      absoluteUrl(
        config,
        paymentReference
          ? `/payment/result?reference=${encodeURIComponent(paymentReference)}`
          : '/business-empowerment-challenge-2026#participation'
      ),
  };
  const bullets = [
    'Your free event registration is already saved.',
    'Paid Challenge or Exhibition participation is confirmed only after successful payment verification.',
  ];
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Finish payment to confirm paid participation.',
    title: 'Complete your payment',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">We started checkout for your optional paid participation. Please complete payment to confirm the selected activity.</p>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      'We started checkout for your optional paid participation.',
      'Please complete payment to confirm the selected activity.',
    ],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'payment_pending',
    logoUrl: logoUrl(config),
  };
}

export function buildPaymentFailedEmail({
  publicReference,
  fullName,
  paymentReference,
  config = {},
}) {
  const subject = `${eventTitle()} — Payment not completed`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const primaryCta = {
    label: 'Retry participation payment',
    href: absoluteUrl(
      config,
      paymentReference
        ? `/payment/result?reference=${encodeURIComponent(paymentReference)}`
        : '/business-empowerment-challenge-2026#participation'
    ),
  };
  const bullets = [
    'Your free event registration remains if it was saved.',
    'Paid participation is not confirmed until a successful verified payment.',
  ];
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Payment was not successful.',
    title: 'Payment not completed',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">We could not confirm a successful payment for your selected paid activity. You may retry from the event participation section.</p>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      'We could not confirm a successful payment for your selected paid activity.',
    ],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'payment_failed',
    logoUrl: logoUrl(config),
  };
}

export function buildPaymentReversedEmail({
  publicReference,
  fullName,
  config = {},
}) {
  const subject = `${eventTitle()} — Payment reversed`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const primaryCta = {
    label: 'Contact SHE CHAMPIONS',
    href: absoluteUrl(config, '/contact'),
  };
  const bullets = [
    'Paid participation is no longer confirmed for the reversed payment.',
    'Your free event registration may still remain on file.',
  ];
  const secondaryCtas = [
    {
      label: 'Event page',
      href: absoluteUrl(config, '/business-empowerment-challenge-2026'),
    },
  ];
  const html = renderBrandedEmail({
    config,
    preheader: 'A payment was reversed.',
    title: 'Payment reversed',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">A previously verified payment associated with your registration was reversed. Paid participation is no longer confirmed.</p>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      'A previously verified payment associated with your registration was reversed.',
      'Paid participation is no longer confirmed.',
    ],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'payment_reversed',
    logoUrl: logoUrl(config),
  };
}

function buildStatusEmail({
  emailType,
  subjectSuffix,
  title,
  body,
  bullets,
  publicReference,
  fullName,
  config = {},
}) {
  const subject = `${eventTitle()} — ${subjectSuffix}`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const primaryCta = {
    label: 'View event page',
    href: absoluteUrl(config, '/business-empowerment-challenge-2026'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: subjectSuffix,
    title,
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">${body}</p>`,
    details,
    bullets,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [body.replace(/<\/?strong>/g, '')],
    details,
    bullets,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType,
    logoUrl: logoUrl(config),
  };
}

export function buildChallengeUnderReviewEmail(args) {
  return buildStatusEmail({
    ...args,
    emailType: 'challenge_under_review',
    subjectSuffix: 'Application under review',
    title: 'Application under review',
    body: `Your Challenge application for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> is now under review.`,
    bullets: [
      'No further action is required unless SHE CHAMPIONS contacts you.',
      'Assessment outcomes are communicated separately.',
    ],
  });
}

export function buildChallengeShortlistedEmail(args) {
  return buildStatusEmail({
    ...args,
    emailType: 'challenge_shortlisted',
    subjectSuffix: 'Shortlisted',
    title: 'You have been shortlisted',
    body: `Your Challenge application for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> has been shortlisted for the next stage.`,
    bullets: [
      'SHE CHAMPIONS may request further materials.',
      'Shortlisting is not a grant award.',
    ],
  });
}

export function buildChallengeNotShortlistedEmail(args) {
  return buildStatusEmail({
    ...args,
    emailType: 'challenge_not_shortlisted',
    subjectSuffix: 'Application update',
    title: 'Application update',
    body: `Thank you for applying to the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong>. After assessment, your Challenge application was not shortlisted for the next stage.`,
    bullets: [
      'Your free event registration remains valid if it was saved.',
      'We appreciate your interest in SHE CHAMPIONS.',
    ],
  });
}

export function buildRegistrationWithdrawnEmail(args) {
  return buildStatusEmail({
    ...args,
    emailType: 'registration_withdrawn',
    subjectSuffix: 'Registration withdrawn',
    title: 'Registration withdrawn',
    body: `Your registration record for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> has been marked withdrawn or cancelled.`,
    bullets: [
      'Contact SHE CHAMPIONS if you believe this was made in error.',
    ],
  });
}

export function buildChallengeMaterialsEmail({
  publicReference,
  fullName,
  message,
  config = {},
}) {
  const subject = `${eventTitle()} — Challenge materials requested`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const bodyBlock = message
    ? plainTextToHtmlParagraphs(message)
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">SHE CHAMPIONS is requesting additional Challenge assessment materials. Please reply via the contact page or follow the instructions provided by the organisation.</p>`;
  const primaryCta = {
    label: 'Contact SHE CHAMPIONS',
    href: absoluteUrl(config, '/contact'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Additional Challenge materials requested.',
    title: 'Challenge materials requested',
    greeting,
    bodyHtml: bodyBlock,
    details,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      message ||
        'SHE CHAMPIONS is requesting additional Challenge assessment materials.',
    ],
    details,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'challenge_materials_request',
    logoUrl: logoUrl(config),
  };
}

export function buildExhibitionInstructionsEmail({
  publicReference,
  fullName,
  message,
  config = {},
}) {
  const subject = `${eventTitle()} — Exhibitor instructions`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const bodyBlock = message
    ? plainTextToHtmlParagraphs(message)
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Please find exhibitor participation guidance from SHE CHAMPIONS. Further logistics will be shared when confirmed by the organisation.</p>`;
  const primaryCta = {
    label: 'Open event page',
    href: absoluteUrl(
      config,
      '/business-empowerment-challenge-2026#participation'
    ),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Exhibitor instructions from SHE CHAMPIONS.',
    title: 'Exhibitor instructions',
    greeting,
    bodyHtml: bodyBlock,
    details,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      message || 'Please find exhibitor participation guidance from SHE CHAMPIONS.',
    ],
    details,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'exhibition_instructions',
    logoUrl: logoUrl(config),
  };
}

export function buildRegistrationOpenAnnouncementEmail({
  fullName,
  message,
  config = {},
}) {
  const subject = `${eventTitle()} — Registration is open`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const primaryCta = {
    label: 'Register now',
    href: absoluteUrl(
      config,
      '/business-empowerment-challenge-2026#participation'
    ),
  };
  const bodyBlock = message
    ? plainTextToHtmlParagraphs(message)
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Official online registration for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> is now open. General event registration is free; optional Challenge and Exhibition participation require payment when selected.</p>`;
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Registration is open.',
    title: 'Registration is open',
    greeting,
    bodyHtml: bodyBlock,
    details: [
      { label: 'Event date', value: EVENT_DATE_DISPLAY },
      { label: 'Location', value: EVENT_LOCATION_DISPLAY },
    ],
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      message ||
        `Official online registration for the ${EVENT_NAME} is now open.`,
    ],
    details: [
      { label: 'Event date', value: EVENT_DATE_DISPLAY },
      { label: 'Location', value: EVENT_LOCATION_DISPLAY },
    ],
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'registration_open_announcement',
    logoUrl: logoUrl(config),
  };
}

export function buildRegistrationCutoffReminderEmail({
  publicReference,
  fullName,
  message,
  config = {},
}) {
  const subject = `${eventTitle()} — Registration closing soon`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = publicReference
    ? baseDetails(publicReference)
    : [
        { label: 'Event date', value: EVENT_DATE_DISPLAY },
        { label: 'Location', value: EVENT_LOCATION_DISPLAY },
      ];
  const primaryCta = {
    label: 'Review participation',
    href: absoluteUrl(
      config,
      '/business-empowerment-challenge-2026#participation'
    ),
  };
  const bodyBlock = message
    ? plainTextToHtmlParagraphs(message)
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">This is a reminder that registration for the <strong style="color:${EMAIL_BRAND.navy};">${escapeHtml(EVENT_NAME)}</strong> closes 48 hours before the event start. Complete any pending paid participation while registration remains open.</p>`;
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'Registration is closing soon.',
    title: 'Registration closing soon',
    greeting,
    bodyHtml: bodyBlock,
    details,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      message ||
        `Registration for the ${EVENT_NAME} closes 48 hours before the event start.`,
    ],
    details,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'registration_cutoff_reminder',
    logoUrl: logoUrl(config),
  };
}

export function buildEventDetailsUpdateEmail({
  publicReference,
  fullName,
  message,
  config = {},
}) {
  const subject = `${eventTitle()} — Event update`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = publicReference
    ? baseDetails(publicReference)
    : [
        { label: 'Event date', value: EVENT_DATE_DISPLAY },
        { label: 'Location', value: EVENT_LOCATION_DISPLAY },
      ];
  const bodyBlock = message
    ? plainTextToHtmlParagraphs(message)
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">SHE CHAMPIONS has shared an update about the event. Please review the message and the event page for the latest confirmed information.</p>`;
  const primaryCta = {
    label: 'Open event page',
    href: absoluteUrl(config, '/business-empowerment-challenge-2026'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'An update about the event.',
    title: 'Event update',
    greeting,
    bodyHtml: bodyBlock,
    details,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      message || 'SHE CHAMPIONS has shared an update about the event.',
    ],
    details,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'event_details_update',
    logoUrl: logoUrl(config),
  };
}

export function buildAdminNewFreeRegistrationEmail({
  publicReference,
  fullName,
  email,
  config = {},
}) {
  const subject = `New free registration: ${publicReference}`;
  const details = [
    { label: 'Reference', value: publicReference },
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
  ];
  const primaryCta = {
    label: 'Open admin dashboard',
    href: absoluteUrl(config, '/admin/event-registrations'),
  };
  const html = renderBrandedEmail({
    config,
    eyebrow: 'Admin notification',
    preheader: subject,
    title: 'New free registration',
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">A free event registration was confirmed.</p>`,
    details,
    primaryCta,
  });
  const text = buildTextEmail({
    introLines: ['A free event registration was confirmed.'],
    details,
    ctas: [primaryCta],
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_new_free_registration',
    logoUrl: logoUrl(config),
  };
}

export function buildAdminNewPaidParticipationEmail({
  publicReference,
  fullName,
  email,
  expectedAmountKobo,
  config = {},
}) {
  const subject = `New paid participation: ${publicReference}`;
  const details = [
    { label: 'Reference', value: publicReference },
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Amount', value: formatNgnFromKobo(expectedAmountKobo) },
  ];
  const primaryCta = {
    label: 'Open admin dashboard',
    href: absoluteUrl(config, '/admin/event-registrations'),
  };
  const html = renderBrandedEmail({
    config,
    eyebrow: 'Admin notification',
    preheader: subject,
    title: 'New paid participation',
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">A paid participation payment was verified.</p>`,
    details,
    primaryCta,
  });
  const text = buildTextEmail({
    introLines: ['A paid participation payment was verified.'],
    details,
    ctas: [primaryCta],
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_new_paid_participation',
    logoUrl: logoUrl(config),
  };
}

export function buildAdminPaymentFailedEmail({
  publicReference,
  fullName,
  email,
  statusLabel,
  config = {},
}) {
  const subject = `Payment ${statusLabel || 'issue'}: ${publicReference}`;
  const details = [
    { label: 'Reference', value: publicReference },
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Status', value: statusLabel || 'FAILED' },
  ];
  const primaryCta = {
    label: 'Open admin dashboard',
    href: absoluteUrl(config, '/admin/event-registrations'),
  };
  const html = renderBrandedEmail({
    config,
    eyebrow: 'Admin notification',
    preheader: subject,
    title: 'Payment needs attention',
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">A paid participation payment was marked ${escapeHtml(statusLabel || 'FAILED')}.</p>`,
    details,
    primaryCta,
  });
  const text = buildTextEmail({
    introLines: [
      `A paid participation payment was marked ${statusLabel || 'FAILED'}.`,
    ],
    details,
    ctas: [primaryCta],
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_payment_failed',
    logoUrl: logoUrl(config),
  };
}

export function buildContactAcknowledgementEmail({
  fullName,
  config = {},
}) {
  const subject = 'SHE CHAMPIONS — We received your message';
  const greeting = fullName ? `Dear ${fullName},` : 'Dear friend,';
  const primaryCta = {
    label: 'Visit SHE CHAMPIONS',
    href: absoluteUrl(config, '/'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'We received your message.',
    title: 'Message received',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Thank you for contacting SHE CHAMPIONS. Our team aims to respond within 24 hours during business days.</p>`,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      'Thank you for contacting SHE CHAMPIONS.',
      'Our team aims to respond within 24 hours during business days.',
    ],
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'contact_acknowledgement',
    logoUrl: logoUrl(config),
  };
}

export function buildAdminContactMessageEmail({
  fullName,
  email,
  subject: userSubject,
  message,
  config = {},
}) {
  const subject = `Contact form: ${userSubject || 'New message'}`;
  const details = [
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Subject', value: userSubject || '—' },
  ];
  const html = renderBrandedEmail({
    config,
    eyebrow: 'Admin notification',
    preheader: subject,
    title: 'New contact message',
    bodyHtml: plainTextToHtmlParagraphs(message || ''),
    details,
    primaryCta: {
      label: 'Reply by email',
      href: `mailto:${encodeURIComponent(email || '')}`,
    },
  });
  const text = buildTextEmail({
    introLines: ['New contact form message.', message || ''],
    details,
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_contact_message',
    logoUrl: logoUrl(config),
  };
}

export function buildMembershipAcknowledgementEmail({
  fullName,
  config = {},
}) {
  const subject = 'SHE CHAMPIONS — Membership interest received';
  const greeting = fullName ? `Dear ${fullName},` : 'Dear friend,';
  const primaryCta = {
    label: 'Explore programmes',
    href: absoluteUrl(config, '/programs'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: 'We received your membership interest.',
    title: 'Membership interest received',
    greeting,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">Thank you for sharing your interest in the SHE CHAMPIONS network. Our team will follow up with relevant programme information as appropriate.</p>`,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      'Thank you for sharing your interest in the SHE CHAMPIONS network.',
    ],
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'membership_acknowledgement',
    logoUrl: logoUrl(config),
  };
}

export function buildAdminMembershipSignupEmail({
  fullName,
  email,
  phone,
  config = {},
}) {
  const subject = `Membership interest: ${fullName || email || 'New signup'}`;
  const details = [
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Phone', value: phone || '—' },
  ];
  const html = renderBrandedEmail({
    config,
    eyebrow: 'Admin notification',
    preheader: subject,
    title: 'New membership interest',
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">A visitor submitted membership interest via the website popup.</p>`,
    details,
    primaryCta: {
      label: 'Open website',
      href: absoluteUrl(config, '/'),
    },
  });
  const text = buildTextEmail({
    introLines: ['A visitor submitted membership interest.'],
    details,
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_membership_signup',
    logoUrl: logoUrl(config),
  };
}

/** One-off branded message from admin to a registrant. */
export function buildAdminCustomMessageEmail({
  publicReference,
  fullName,
  subject: rawSubject,
  message,
  config = {},
}) {
  const safeSubject = String(rawSubject || 'Message from SHE CHAMPIONS')
    .trim()
    .slice(0, 200);
  const subject = safeSubject.startsWith('SHE CHAMPIONS')
    ? safeSubject
    : `SHE CHAMPIONS — ${safeSubject}`;
  const greeting = fullName ? `Dear ${fullName},` : 'Dear participant,';
  const details = baseDetails(publicReference);
  const bodyHtml = plainTextToHtmlParagraphs(message || '');
  const primaryCta = {
    label: 'Contact SHE CHAMPIONS',
    href: absoluteUrl(config, '/contact'),
  };
  const secondaryCtas = defaultSecondary(config);
  const html = renderBrandedEmail({
    config,
    preheader: safeSubject,
    title: safeSubject,
    greeting,
    bodyHtml:
      bodyHtml ||
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.muted};">You have a new message from SHE CHAMPIONS.</p>`,
    details,
    primaryCta,
    secondaryCtas,
  });
  const text = buildTextEmail({
    greeting,
    introLines: [
      String(message || '').trim() || 'You have a new message from SHE CHAMPIONS.',
    ],
    details,
    ctas: [primaryCta, ...secondaryCtas],
  });
  return {
    subject,
    text,
    html,
    emailType: 'admin_custom_message',
    logoUrl: logoUrl(config),
  };
}

/** @deprecated Prefer buildFreeRegistrationEmail / buildParticipationConfirmationEmail. */
export function buildConfirmationEmail(args) {
  if (args?.paymentRequired === false || args?.freeOnly) {
    return buildFreeRegistrationEmail(args);
  }
  return buildParticipationConfirmationEmail(args);
}

export const EMAIL_TYPES = Object.freeze({
  FREE: 'free_registration_confirmation',
  PARTICIPATION: 'participation_confirmation',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REVERSED: 'payment_reversed',
  UNDER_REVIEW: 'challenge_under_review',
  SHORTLISTED: 'challenge_shortlisted',
  NOT_SHORTLISTED: 'challenge_not_shortlisted',
  WITHDRAWN: 'registration_withdrawn',
  MATERIALS: 'challenge_materials_request',
  EXHIBITION: 'exhibition_instructions',
  OPEN: 'registration_open_announcement',
  CUTOFF: 'registration_cutoff_reminder',
  DETAILS: 'event_details_update',
  ADMIN_FREE: 'admin_new_free_registration',
  ADMIN_PAID: 'admin_new_paid_participation',
  ADMIN_PAYMENT_FAILED: 'admin_payment_failed',
  CONTACT_ACK: 'contact_acknowledgement',
  ADMIN_CONTACT: 'admin_contact_message',
  MEMBER_ACK: 'membership_acknowledgement',
  ADMIN_MEMBER: 'admin_membership_signup',
  ADMIN_CUSTOM: 'admin_custom_message',
});
