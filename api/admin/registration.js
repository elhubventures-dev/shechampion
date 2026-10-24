import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import {
  APPLICANT_CATEGORIES,
  APPLICATION_STATUSES,
  CHALLENGE_ADMIN_STATUSES,
} from '../_lib/constants.js';
import { getSql } from '../_lib/db.js';
import { sendAssessmentStatusEmailSafe } from '../_lib/emailDelivery.js';
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

const ASSESSMENT_EMAIL_STATUSES = new Set([
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'WITHDRAWN',
  'CANCELLED',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalString(value, max) {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return String(value).trim().slice(0, max);
}

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
        data.adminNotes !== undefined
          ? String(data.adminNotes).slice(0, 4000)
          : undefined;

      const fullName = optionalString(data.fullName, 120);
      const emailRaw =
        data.email !== undefined
          ? String(data.email).trim().toLowerCase().slice(0, 254)
          : undefined;
      const phone = optionalString(data.phone, 40);
      const stateOfResidence = optionalString(data.stateOfResidence, 80);
      const applicantCategory =
        data.applicantCategory !== undefined
          ? String(data.applicantCategory)
          : undefined;
      const businessName =
        data.businessName !== undefined
          ? optionalString(data.businessName, 200)
          : undefined;
      const briefDescription = optionalString(data.briefDescription, 4000);
      const exhibitionBusinessName =
        data.exhibitionBusinessName !== undefined
          ? optionalString(data.exhibitionBusinessName, 200)
          : undefined;
      const exhibitionCategory =
        data.exhibitionCategory !== undefined
          ? optionalString(data.exhibitionCategory, 120)
          : undefined;
      const exhibitionDescription =
        data.exhibitionDescription !== undefined
          ? optionalString(data.exhibitionDescription, 4000)
          : undefined;

      if (applicationStatus && !APPLICATION_STATUSES.includes(applicationStatus)) {
        sendError(res, 400, 'INVALID_STATUS', 'Invalid application status.');
        return;
      }
      if (challengeStatus && !CHALLENGE_ADMIN_STATUSES.includes(challengeStatus)) {
        sendError(res, 400, 'INVALID_CHALLENGE_STATUS', 'Invalid challenge status.');
        return;
      }
      if (
        applicantCategory !== undefined &&
        !APPLICANT_CATEGORIES.includes(applicantCategory)
      ) {
        sendError(res, 400, 'INVALID_CATEGORY', 'Invalid applicant category.');
        return;
      }
      if (fullName !== undefined && fullName.length < 2) {
        sendError(res, 400, 'INVALID_NAME', 'Full name must be at least 2 characters.');
        return;
      }
      if (emailRaw !== undefined && !EMAIL_RE.test(emailRaw)) {
        sendError(res, 400, 'INVALID_EMAIL', 'A valid email address is required.');
        return;
      }
      if (phone !== undefined && phone.length < 7) {
        sendError(res, 400, 'INVALID_PHONE', 'Phone number looks too short.');
        return;
      }
      if (stateOfResidence !== undefined && stateOfResidence.length < 2) {
        sendError(res, 400, 'INVALID_STATE', 'State of residence is required.');
        return;
      }
      if (briefDescription !== undefined && briefDescription.length < 10) {
        sendError(
          res,
          400,
          'INVALID_DESCRIPTION',
          'Brief description must be at least 10 characters.'
        );
        return;
      }

      const current = await sql`
        SELECT
          id, event_id, application_status, challenge_status, admin_notes,
          payment_status, challenge_selected, exhibition_selected,
          full_name, email_normalized, phone, state_of_residence,
          applicant_category, business_name, brief_description,
          exhibition_business_name, exhibition_category, exhibition_description
        FROM registrations WHERE id = ${id} LIMIT 1
      `;
      if (!current[0]) {
        sendError(res, 404, 'NOT_FOUND', 'Registration not found.');
        return;
      }

      const nextEmail =
        emailRaw !== undefined ? emailRaw : current[0].email_normalized;
      if (emailRaw !== undefined && emailRaw !== current[0].email_normalized) {
        const clash = await sql`
          SELECT id FROM registrations
          WHERE event_id = ${current[0].event_id}
            AND email_normalized = ${emailRaw}
            AND id <> ${id}
          LIMIT 1
        `;
        if (clash[0]) {
          sendError(
            res,
            409,
            'EMAIL_IN_USE',
            'Another registration already uses this email for this event.'
          );
          return;
        }
      }

      const nextAppStatus = applicationStatus || current[0].application_status;
      let nextChallenge = challengeStatus || current[0].challenge_status;

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

      const nextNotes =
        adminNotes !== undefined ? adminNotes : current[0].admin_notes;
      const mirroredApp =
        challengeStatus &&
        ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED'].includes(challengeStatus)
          ? challengeStatus
          : nextAppStatus;

      const nextFullName =
        fullName !== undefined ? fullName : current[0].full_name;
      const nextPhone = phone !== undefined ? phone : current[0].phone;
      const nextState =
        stateOfResidence !== undefined
          ? stateOfResidence
          : current[0].state_of_residence;
      const nextCategory =
        applicantCategory !== undefined
          ? applicantCategory
          : current[0].applicant_category;
      const nextBusinessName =
        businessName !== undefined ? businessName || null : current[0].business_name;
      const nextBrief =
        briefDescription !== undefined
          ? briefDescription
          : current[0].brief_description;
      const nextExhibBiz =
        exhibitionBusinessName !== undefined
          ? exhibitionBusinessName || null
          : current[0].exhibition_business_name;
      const nextExhibCat =
        exhibitionCategory !== undefined
          ? exhibitionCategory || null
          : current[0].exhibition_category;
      const nextExhibDesc =
        exhibitionDescription !== undefined
          ? exhibitionDescription || null
          : current[0].exhibition_description;

      const fieldChanges = {};
      if (nextFullName !== current[0].full_name) fieldChanges.fullName = nextFullName;
      if (nextEmail !== current[0].email_normalized) fieldChanges.email = nextEmail;
      if (nextPhone !== current[0].phone) fieldChanges.phone = nextPhone;
      if (nextState !== current[0].state_of_residence) {
        fieldChanges.stateOfResidence = nextState;
      }
      if (nextCategory !== current[0].applicant_category) {
        fieldChanges.applicantCategory = nextCategory;
      }
      if (nextBusinessName !== current[0].business_name) {
        fieldChanges.businessName = nextBusinessName;
      }
      if (nextBrief !== current[0].brief_description) {
        fieldChanges.briefDescription = nextBrief;
      }
      if (nextExhibBiz !== current[0].exhibition_business_name) {
        fieldChanges.exhibitionBusinessName = nextExhibBiz;
      }
      if (nextExhibCat !== current[0].exhibition_category) {
        fieldChanges.exhibitionCategory = nextExhibCat;
      }
      if (nextExhibDesc !== current[0].exhibition_description) {
        fieldChanges.exhibitionDescription = nextExhibDesc;
      }

      const updated = await sql`
        UPDATE registrations
        SET
          full_name = ${nextFullName},
          email_normalized = ${nextEmail},
          phone = ${nextPhone},
          state_of_residence = ${nextState},
          applicant_category = ${nextCategory},
          business_name = ${nextBusinessName},
          brief_description = ${nextBrief},
          exhibition_business_name = ${nextExhibBiz},
          exhibition_category = ${nextExhibCat},
          exhibition_description = ${nextExhibDesc},
          application_status = ${mirroredApp},
          challenge_status = ${nextChallenge},
          admin_notes = ${nextNotes},
          updated_at = now()
        WHERE id = ${id}
        RETURNING
          id, public_reference, event_id, full_name, email_normalized, phone,
          state_of_residence, applicant_category, business_name, brief_description,
          application_status, payment_status, event_registration_status,
          challenge_selected, exhibition_selected, challenge_status,
          exhibition_status, expected_amount_kobo, currency,
          exhibition_business_name, exhibition_category, exhibition_description,
          admin_notes, updated_at
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
          fieldChanges,
        },
        databaseUrl: config.databaseUrl,
      });

      let assessmentEmailStatus = null;
      if (
        nextChallenge !== current[0].challenge_status &&
        ASSESSMENT_EMAIL_STATUSES.has(nextChallenge)
      ) {
        assessmentEmailStatus = nextChallenge;
      } else if (
        mirroredApp !== current[0].application_status &&
        ASSESSMENT_EMAIL_STATUSES.has(mirroredApp)
      ) {
        assessmentEmailStatus = mirroredApp;
      }

      let assessmentEmail = null;
      if (assessmentEmailStatus) {
        assessmentEmail = await sendAssessmentStatusEmailSafe(
          id,
          assessmentEmailStatus,
          config
        );
      }

      sendJson(res, 200, {
        ok: true,
        registration: updated[0],
        assessmentEmail,
      });
      return;
    }

    if (req.method === 'DELETE') {
      assertAdminMutation(req, config);
      const admin = await requireAdmin(req, config);

      const current = await sql`
        SELECT id, public_reference, email_normalized, full_name, payment_status,
               application_status
        FROM registrations
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!current[0]) {
        sendError(res, 404, 'NOT_FOUND', 'Registration not found.');
        return;
      }

      await writeAuditEvent({
        actorEmail: admin.email,
        action: 'registration.delete',
        entityType: 'registration',
        entityId: id,
        detail: {
          publicReference: current[0].public_reference,
          email: current[0].email_normalized,
          fullName: current[0].full_name,
          paymentStatus: current[0].payment_status,
          applicationStatus: current[0].application_status,
        },
        databaseUrl: config.databaseUrl,
      });

      // Child tables use ON DELETE RESTRICT — remove dependents first.
      await sql`DELETE FROM email_deliveries WHERE registration_id = ${id}`;
      await sql`DELETE FROM payment_transactions WHERE registration_id = ${id}`;
      await sql`DELETE FROM registrations WHERE id = ${id}`;

      sendJson(res, 200, {
        ok: true,
        deleted: true,
        publicReference: current[0].public_reference,
      });
      return;
    }

    methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
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
