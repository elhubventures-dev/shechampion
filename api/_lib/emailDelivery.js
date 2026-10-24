import { getEventConfig } from './config.js';
import { getSql } from './db.js';
import {
  buildAdminContactMessageEmail,
  buildAdminCustomMessageEmail,
  buildAdminMembershipSignupEmail,
  buildAdminNewFreeRegistrationEmail,
  buildAdminNewPaidParticipationEmail,
  buildAdminPaymentFailedEmail,
  buildChallengeMaterialsEmail,
  buildChallengeNotShortlistedEmail,
  buildChallengeShortlistedEmail,
  buildChallengeUnderReviewEmail,
  buildContactAcknowledgementEmail,
  buildEventDetailsUpdateEmail,
  buildExhibitionInstructionsEmail,
  buildFreeRegistrationEmail,
  buildMembershipAcknowledgementEmail,
  buildParticipationConfirmationEmail,
  buildPaymentFailedEmail,
  buildPaymentPendingEmail,
  buildPaymentReversedEmail,
  buildRegistrationCutoffReminderEmail,
  buildRegistrationOpenAnnouncementEmail,
  buildRegistrationWithdrawnEmail,
  createEmailProvider,
  EMAIL_TYPES,
} from './email.js';

/**
 * Persist + send an email. Idempotent when the same registrationId+emailType
 * (or toEmail+emailType when registrationId is null) already has status SENT,
 * unless forceResend is true.
 */
export async function deliverEmail({
  registrationId = null,
  emailType,
  toEmail,
  content,
  config = getEventConfig(),
  adminContent = null,
  forceResend = false,
}) {
  if (!config.resendApiKey || !config.emailFrom) {
    return { sent: false, reason: 'email_not_configured' };
  }
  if (!toEmail || !emailType || !content) {
    return { sent: false, reason: 'invalid_args' };
  }

  const sql = getSql(config.databaseUrl);
  let existing;
  if (registrationId) {
    existing = await sql`
      SELECT id, status, attempts
      FROM email_deliveries
      WHERE registration_id = ${registrationId}
        AND email_type = ${emailType}
      ORDER BY created_at DESC
      LIMIT 1
    `;
  } else {
    existing = await sql`
      SELECT id, status, attempts
      FROM email_deliveries
      WHERE registration_id IS NULL
        AND email_type = ${emailType}
        AND to_email = ${toEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `;
  }

  if (!forceResend && existing[0]?.status === 'SENT') {
    return { sent: true, alreadySent: true };
  }

  let deliveryId = !forceResend ? existing[0]?.id : null;
  if (!deliveryId || existing[0]?.status === 'SENT') {
    const created = await sql`
      INSERT INTO email_deliveries (
        registration_id, email_type, to_email, status, attempts
      ) VALUES (
        ${registrationId},
        ${emailType},
        ${toEmail},
        'PENDING',
        0
      )
      RETURNING id
    `;
    deliveryId = created[0].id;
  }

  const provider = createEmailProvider(config);
  try {
    const result = await provider.send({
      to: toEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    await sql`
      UPDATE email_deliveries
      SET
        status = 'SENT',
        provider_message_id = ${result.messageId},
        last_error = NULL,
        attempts = attempts + 1,
        updated_at = now()
      WHERE id = ${deliveryId}
    `;

    if (config.adminNotificationEmail && adminContent) {
      try {
        await provider.send({
          to: config.adminNotificationEmail,
          subject: adminContent.subject,
          text: adminContent.text,
          html: adminContent.html,
        });
        await sql`
          INSERT INTO email_deliveries (
            registration_id, email_type, to_email, status, attempts, provider_message_id
          ) VALUES (
            ${registrationId},
            ${adminContent.emailType},
            ${config.adminNotificationEmail},
            'SENT',
            1,
            ${null}
          )
        `;
      } catch {
        // Admin notification failure must not affect applicant confirmation.
      }
    }

    return { sent: true, messageId: result.messageId };
  } catch (error) {
    await sql`
      UPDATE email_deliveries
      SET
        status = 'FAILED',
        last_error = ${String(error.message || 'send failed').slice(0, 500)},
        attempts = attempts + 1,
        updated_at = now()
      WHERE id = ${deliveryId}
    `;
    return { sent: false, reason: 'send_failed' };
  }
}

async function loadRegistration(registrationId, config) {
  const sql = getSql(config.databaseUrl);
  const rows = await sql`
    SELECT id, public_reference, full_name, email_normalized, payment_status,
           challenge_selected, exhibition_selected, challenge_status,
           exhibition_status, expected_amount_kobo, application_status,
           event_registration_status
    FROM registrations
    WHERE id = ${registrationId}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function sendFreeRegistrationEmailSafe(
  registrationId,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  if (reg.payment_status !== 'NOT_REQUIRED') {
    return { sent: false, reason: 'not_free' };
  }
  const content = buildFreeRegistrationEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    config,
  });
  const adminContent = buildAdminNewFreeRegistrationEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    email: reg.email_normalized,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.FREE,
    toEmail: reg.email_normalized,
    content,
    config,
    adminContent,
  });
}

export async function sendParticipationEmailSafe(
  registrationId,
  config = getEventConfig(),
  { paymentReference } = {}
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg || reg.payment_status !== 'SUCCESS') {
    return { sent: false, reason: 'not_paid' };
  }
  const content = buildParticipationConfirmationEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    challengeSelected: reg.challenge_selected,
    exhibitionSelected: reg.exhibition_selected,
    challengeStatus: reg.challenge_status,
    exhibitionStatus: reg.exhibition_status,
    expectedAmountKobo: reg.expected_amount_kobo,
    paymentReference,
    config,
  });
  const adminContent = buildAdminNewPaidParticipationEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    email: reg.email_normalized,
    expectedAmountKobo: reg.expected_amount_kobo,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.PARTICIPATION,
    toEmail: reg.email_normalized,
    content,
    config,
    adminContent,
  });
}

export async function sendPaymentPendingEmailSafe(
  registrationId,
  config = getEventConfig(),
  { checkoutUrl, paymentReference } = {}
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  if (reg.payment_status === 'NOT_REQUIRED' || reg.payment_status === 'SUCCESS') {
    return { sent: false, reason: 'not_pending' };
  }
  const content = buildPaymentPendingEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    expectedAmountKobo: reg.expected_amount_kobo,
    checkoutUrl,
    paymentReference,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.PAYMENT_PENDING,
    toEmail: reg.email_normalized,
    content,
    config,
  });
}

export async function sendPaymentFailedEmailSafe(
  registrationId,
  config = getEventConfig(),
  { paymentReference, statusLabel = 'FAILED' } = {}
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  const content = buildPaymentFailedEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    paymentReference,
    config,
  });
  const adminContent = buildAdminPaymentFailedEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    email: reg.email_normalized,
    statusLabel,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.PAYMENT_FAILED,
    toEmail: reg.email_normalized,
    content,
    config,
    adminContent,
  });
}

export async function sendPaymentReversedEmailSafe(
  registrationId,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  const content = buildPaymentReversedEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    config,
  });
  const adminContent = buildAdminPaymentFailedEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    email: reg.email_normalized,
    statusLabel: 'REVERSED',
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.PAYMENT_REVERSED,
    toEmail: reg.email_normalized,
    content,
    config,
    adminContent,
  });
}

export async function sendAssessmentStatusEmailSafe(
  registrationId,
  nextStatus,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };

  const args = {
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    config,
  };
  let content;
  if (nextStatus === 'UNDER_REVIEW') {
    content = buildChallengeUnderReviewEmail(args);
  } else if (nextStatus === 'SHORTLISTED') {
    content = buildChallengeShortlistedEmail(args);
  } else if (nextStatus === 'NOT_SHORTLISTED') {
    content = buildChallengeNotShortlistedEmail(args);
  } else if (nextStatus === 'WITHDRAWN' || nextStatus === 'CANCELLED') {
    content = buildRegistrationWithdrawnEmail(args);
  } else {
    return { sent: false, reason: 'unsupported_status' };
  }

  return deliverEmail({
    registrationId,
    emailType: content.emailType,
    toEmail: reg.email_normalized,
    content,
    config,
  });
}

export async function sendChallengeMaterialsEmailSafe(
  registrationId,
  message,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  const content = buildChallengeMaterialsEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    message,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.MATERIALS,
    toEmail: reg.email_normalized,
    content,
    config,
    forceResend: true,
  });
}

export async function sendExhibitionInstructionsEmailSafe(
  registrationId,
  message,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  const content = buildExhibitionInstructionsEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    message,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.EXHIBITION,
    toEmail: reg.email_normalized,
    content,
    config,
    forceResend: true,
  });
}

export async function sendAdminCustomMessageEmailSafe(
  registrationId,
  { subject, message },
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  const content = buildAdminCustomMessageEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
    subject,
    message,
    config,
  });
  return deliverEmail({
    registrationId,
    emailType: EMAIL_TYPES.ADMIN_CUSTOM,
    toEmail: reg.email_normalized,
    content,
    config,
    forceResend: true,
  });
}

export async function sendConfirmationEmailSafe(
  registrationId,
  config = getEventConfig()
) {
  const reg = await loadRegistration(registrationId, config);
  if (!reg) return { sent: false, reason: 'not_found' };
  if (reg.payment_status === 'NOT_REQUIRED') {
    return sendFreeRegistrationEmailSafe(registrationId, config);
  }
  return sendParticipationEmailSafe(registrationId, config);
}

export async function sendContactEmails({
  fullName,
  email,
  subject,
  message,
  config = getEventConfig(),
}) {
  const userContent = buildContactAcknowledgementEmail({ fullName, config });
  const adminContent = buildAdminContactMessageEmail({
    fullName,
    email,
    subject,
    message,
    config,
  });
  const userResult = await deliverEmail({
    registrationId: null,
    emailType: EMAIL_TYPES.CONTACT_ACK,
    toEmail: email,
    content: userContent,
    config,
    forceResend: true,
  });
  let adminResult = { sent: false, reason: 'admin_not_configured' };
  if (config.adminNotificationEmail) {
    adminResult = await deliverEmail({
      registrationId: null,
      emailType: EMAIL_TYPES.ADMIN_CONTACT,
      toEmail: config.adminNotificationEmail,
      content: adminContent,
      config,
      forceResend: true,
    });
  }
  return { userResult, adminResult };
}

export async function sendMembershipEmails({
  fullName,
  email,
  phone,
  config = getEventConfig(),
}) {
  const userContent = buildMembershipAcknowledgementEmail({ fullName, config });
  const adminContent = buildAdminMembershipSignupEmail({
    fullName,
    email,
    phone,
    config,
  });
  const userResult = await deliverEmail({
    registrationId: null,
    emailType: EMAIL_TYPES.MEMBER_ACK,
    toEmail: email,
    content: userContent,
    config,
    forceResend: true,
  });
  let adminResult = { sent: false, reason: 'admin_not_configured' };
  if (config.adminNotificationEmail) {
    adminResult = await deliverEmail({
      registrationId: null,
      emailType: EMAIL_TYPES.ADMIN_MEMBER,
      toEmail: config.adminNotificationEmail,
      content: adminContent,
      config,
      forceResend: true,
    });
  }
  return { userResult, adminResult };
}

export async function broadcastAnnouncement({
  announceType,
  message,
  config = getEventConfig(),
}) {
  const sql = getSql(config.databaseUrl);
  let recipients;

  if (announceType === EMAIL_TYPES.OPEN) {
    recipients = await sql`
      SELECT id, public_reference, full_name, email_normalized
      FROM registrations
      WHERE event_registration_status = 'REGISTERED'
      ORDER BY created_at ASC
      LIMIT 2000
    `;
  } else if (announceType === EMAIL_TYPES.CUTOFF) {
    recipients = await sql`
      SELECT id, public_reference, full_name, email_normalized
      FROM registrations
      WHERE event_registration_status = 'REGISTERED'
        AND (
          payment_status = 'NOT_REQUIRED'
          OR payment_status IN ('PENDING', 'FAILED', 'INITIALIZATION_FAILED')
        )
      ORDER BY created_at ASC
      LIMIT 2000
    `;
  } else if (announceType === EMAIL_TYPES.DETAILS) {
    recipients = await sql`
      SELECT id, public_reference, full_name, email_normalized
      FROM registrations
      WHERE event_registration_status = 'REGISTERED'
      ORDER BY created_at ASC
      LIMIT 2000
    `;
  } else {
    return { ok: false, reason: 'unsupported_announce_type', sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const reg of recipients) {
    let content;
    if (announceType === EMAIL_TYPES.OPEN) {
      content = buildRegistrationOpenAnnouncementEmail({
        fullName: reg.full_name,
        message,
        config,
      });
    } else if (announceType === EMAIL_TYPES.CUTOFF) {
      content = buildRegistrationCutoffReminderEmail({
        publicReference: reg.public_reference,
        fullName: reg.full_name,
        message,
        config,
      });
    } else {
      content = buildEventDetailsUpdateEmail({
        publicReference: reg.public_reference,
        fullName: reg.full_name,
        message,
        config,
      });
    }
    const result = await deliverEmail({
      registrationId: reg.id,
      emailType: content.emailType,
      toEmail: reg.email_normalized,
      content,
      config,
      forceResend: true,
    });
    if (result.sent) sent += 1;
    else failed += 1;
  }

  return { ok: true, total: recipients.length, sent, failed };
}

export { EMAIL_TYPES };
