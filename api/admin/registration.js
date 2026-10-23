import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import {
  APPLICATION_STATUSES,
  CHALLENGE_ADMIN_STATUSES,
} from '../_lib/constants.js';
import { getSql } from '../_lib/db.js';
import {
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
  setNoStore,
} from '../_lib/http.js';
import {
  assertAdminMutation,
  assertJsonContentType,
  assertTrustedBrowserOrigin,
  isUuid,
} from '../_lib/security.js';

export default async function handler(req, res) {
  setNoStore(res);
  const config = getEventConfig();

  try {
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');
    if (!isUuid(id)) {
      sendError(res, 400, 'MISSING_ID', 'A valid registration id is required.');
      return;
    }

    const sql = getSql(config.databaseUrl);

    if (req.method === 'GET') {
      assertTrustedBrowserOrigin(req, config);
      await requireAdmin(req, config);

      const rows = await sql`
        SELECT
          id, public_reference, event_id, full_name, email_normalized, phone,
          state_of_residence, applicant_category, business_name, brief_description,
          privacy_accepted_at, terms_accepted_at, application_status, payment_status,
          event_registration_status, challenge_selected, exhibition_selected,
          challenge_status, exhibition_status, expected_amount_kobo, currency,
          challenge_women_eligibility_attested, challenge_eligibility_attested_at,
          exhibition_business_owner_attested, exhibition_owner_attested_at,
          exhibition_business_name, exhibition_category, exhibition_description,
          admin_notes, created_at, updated_at
        FROM registrations
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!rows[0]) {
        sendError(res, 404, 'NOT_FOUND', 'Registration not found.');
        return;
      }

      const payments = await sql`
        SELECT
          id, payment_reference, provider_transaction_id, amount_kobo, currency,
          provider, payment_mode, status, verified_at, created_at, updated_at
        FROM payment_transactions
        WHERE registration_id = ${id}
        ORDER BY created_at DESC
      `;

      const emails = await sql`
        SELECT id, email_type, to_email, status, provider_message_id, last_error,
               attempts, created_at, updated_at
        FROM email_deliveries
        WHERE registration_id = ${id}
        ORDER BY created_at DESC
      `;

      const audit = await sql`
        SELECT id, actor_email, action, entity_type, entity_id, detail, created_at
        FROM admin_audit_events
        WHERE entity_type = 'registration' AND entity_id = ${id}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      sendJson(res, 200, {
        ok: true,
        registration: rows[0],
        payments,
        emails,
        audit,
      });
      return;
    }

    if (req.method === 'PATCH') {
      assertAdminMutation(req, config);
      assertJsonContentType(req);
      const admin = await requireAdmin(req, config);
      const { data } = await readJsonBody(req);
      const applicationStatus = data.applicationStatus
        ? String(data.applicationStatus)
        : null;
      const challengeStatus = data.challengeStatus
        ? String(data.challengeStatus)
        : null;
      const adminNotes =
        data.adminNotes !== undefined ? String(data.adminNotes).slice(0, 4000) : undefined;

      if (applicationStatus && !APPLICATION_STATUSES.includes(applicationStatus)) {
        sendError(res, 400, 'INVALID_STATUS', 'Invalid application status.');
        return;
      }
      if (challengeStatus && !CHALLENGE_ADMIN_STATUSES.includes(challengeStatus)) {
        sendError(res, 400, 'INVALID_CHALLENGE_STATUS', 'Invalid challenge status.');
        return;
      }

      const current = await sql`
        SELECT id, application_status, challenge_status, admin_notes, payment_status,
               challenge_selected
        FROM registrations WHERE id = ${id} LIMIT 1
      `;
      if (!current[0]) {
        sendError(res, 404, 'NOT_FOUND', 'Registration not found.');
        return;
      }

      const nextAppStatus = applicationStatus || current[0].application_status;
      let nextChallenge = challengeStatus || current[0].challenge_status;

      // Keep challenge assessment aligned when admin updates legacy application_status.
      if (
        applicationStatus &&
        current[0].challenge_selected &&
        ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED', 'WITHDRAWN'].includes(
          applicationStatus
        )
      ) {
        if (applicationStatus === 'WITHDRAWN') nextChallenge = 'CANCELLED';
        else if (!challengeStatus) nextChallenge = applicationStatus;
      }

      if (
        challengeStatus &&
        current[0].challenge_selected &&
        ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED'].includes(challengeStatus) &&
        !applicationStatus
      ) {
        // Mirror into application_status for legacy list filters.
      }

      const nextNotes = adminNotes !== undefined ? adminNotes : current[0].admin_notes;
      const mirroredApp =
        challengeStatus &&
        ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED'].includes(challengeStatus)
          ? challengeStatus
          : nextAppStatus;

      const updated = await sql`
        UPDATE registrations
        SET
          application_status = ${mirroredApp},
          challenge_status = ${nextChallenge},
          admin_notes = ${nextNotes},
          updated_at = now()
        WHERE id = ${id}
        RETURNING id, public_reference, application_status, challenge_status,
                  payment_status, admin_notes, updated_at
      `;

      await writeAuditEvent({
        actorEmail: admin.email,
        action: 'registration.update',
        entityType: 'registration',
        entityId: id,
        detail: {
          previousApplicationStatus: current[0].application_status,
          applicationStatus: mirroredApp,
          previousChallengeStatus: current[0].challenge_status,
          challengeStatus: nextChallenge,
          notesUpdated: adminNotes !== undefined,
        },
        databaseUrl: config.databaseUrl,
      });

      sendJson(res, 200, { ok: true, registration: updated[0] });
      return;
    }

    methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (error) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      sendError(res, 401, error.code, error.message);
      return;
    }
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'CSRF_FAILED' ||
      error.code === 'ORIGIN_NOT_CONFIGURED' ||
      error.code === 'UNSUPPORTED_MEDIA_TYPE'
    ) {
      sendError(
        res,
        error.code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 403,
        error.code,
        error.message
      );
      return;
    }
    sendError(res, 500, 'ADMIN_REGISTRATION_ERROR', 'Unable to process request.');
  }
}
