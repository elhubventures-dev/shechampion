import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { EVENT_ID } from '../_lib/constants.js';
import { getSql } from '../_lib/db.js';
import { methodNotAllowed, sendError, setNoStore } from '../_lib/http.js';
import { assertAdminMutation } from '../_lib/security.js';
import { escapeCsvCell } from '../_lib/validation.js';

export default async function handler(req, res) {
  setNoStore(res);
  // POST avoids cookie CSRF via top-level GET navigation / forged links.
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
        r.application_status,
        r.payment_status,
        r.created_at,
        (
          SELECT ed.status
          FROM email_deliveries ed
          WHERE ed.registration_id = r.id
            AND ed.email_type = 'registration_confirmation'
          ORDER BY ed.created_at DESC
          LIMIT 1
        ) AS confirmation_email_status
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
      'application_status',
      'payment_status',
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
          row.application_status,
          row.payment_status,
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
