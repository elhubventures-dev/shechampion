import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { EVENT_ID } from '../_lib/constants.js';
import { getSql } from '../_lib/db.js';
import { methodNotAllowed, sendError, setNoStore } from '../_lib/http.js';
import { assertAdminMutation } from '../_lib/security.js';
import { escapeCsvCell } from '../_lib/validation.js';

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  try {
    assertAdminMutation(req, config);
    const admin = await requireAdmin(req, config);
    const sql = getSql(config.databaseUrl);
    const eventId = config.eventId || EVENT_ID;

    const rows = await sql`
      SELECT
        r.public_reference,
        r.full_name,
        r.email_normalized,
        r.phone,
        r.state_of_residence,
        r.applicant_category,
        r.business_name,
        r.brief_description,
        r.event_registration_status,
        r.application_status,
        r.challenge_selected,
        r.exhibition_selected,
        r.challenge_status,
        r.exhibition_status,
        r.expected_amount_kobo,
        r.currency,
        r.payment_status,
        r.challenge_women_eligibility_attested,
        r.exhibition_business_owner_attested,
        r.exhibition_business_name,
        r.exhibition_category,
        r.exhibition_description,
        r.created_at,
        (
          SELECT ed.status
          FROM email_deliveries ed
          WHERE ed.registration_id = r.id
            AND ed.email_type IN (
              'registration_confirmation',
              'free_registration_confirmation',
              'participation_confirmation'
            )
          ORDER BY ed.created_at DESC
          LIMIT 1
        ) AS confirmation_email_status,
        (
          SELECT pt.amount_kobo
          FROM payment_transactions pt
          WHERE pt.registration_id = r.id AND pt.status = 'SUCCESS'
          ORDER BY pt.verified_at DESC NULLS LAST
          LIMIT 1
        ) AS verified_amount_kobo,
        (
          SELECT pt.payment_reference
          FROM payment_transactions pt
          WHERE pt.registration_id = r.id AND pt.status = 'SUCCESS'
          ORDER BY pt.verified_at DESC NULLS LAST
          LIMIT 1
        ) AS verified_payment_reference
      FROM registrations r
      WHERE r.event_id = ${eventId}
      ORDER BY r.created_at DESC
    `;

    const header = [
      'public_reference',
      'full_name',
      'email',
      'phone',
      'state_of_residence',
      'applicant_category',
      'business_name',
      'brief_description',
      'event_registration_status',
      'application_status',
      'challenge_selected',
      'exhibition_selected',
      'challenge_status',
      'exhibition_status',
      'expected_amount_kobo',
      'currency',
      'payment_status',
      'verified_amount_kobo',
      'verified_payment_reference',
      'challenge_eligibility_attested',
      'exhibition_owner_attested',
      'exhibition_business_name',
      'exhibition_category',
      'exhibition_description',
      'confirmation_email_status',
      'created_at',
    ];

    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.public_reference,
          row.full_name,
          row.email_normalized,
          row.phone,
          row.state_of_residence,
          row.applicant_category,
          row.business_name,
          row.brief_description,
          row.event_registration_status,
          row.application_status,
          row.challenge_selected,
          row.exhibition_selected,
          row.challenge_status,
          row.exhibition_status,
          row.expected_amount_kobo,
          row.currency,
          row.payment_status,
          row.verified_amount_kobo,
          row.verified_payment_reference,
          row.challenge_women_eligibility_attested,
          row.exhibition_business_owner_attested,
          row.exhibition_business_name,
          row.exhibition_category,
          row.exhibition_description,
          row.confirmation_email_status,
          row.created_at,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }

    await writeAuditEvent({
      actorEmail: admin.email,
      action: 'registrations.export_csv',
      entityType: 'registrations',
      detail: { count: rows.length },
      databaseUrl: config.databaseUrl,
    });

    const csv = `\uFEFF${lines.join('\n')}`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="she-champions-registrations.csv"'
    );
    res.setHeader('Cache-Control', 'no-store');
    res.end(csv);
  } catch (error) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      sendError(res, 401, error.code, error.message);
      return;
    }
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'CSRF_FAILED' ||
      error.code === 'ORIGIN_NOT_CONFIGURED'
    ) {
      sendError(res, 403, error.code, error.message);
      return;
    }
    sendError(res, 500, 'EXPORT_FAILED', 'Unable to export registrations.');
  }
}
