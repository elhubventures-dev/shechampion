import { requireAdmin } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { EVENT_ID } from '../_lib/constants.js';
import { getSql } from '../_lib/db.js';
import { methodNotAllowed, sendError, sendJson, setNoStore } from '../_lib/http.js';
import { assertTrustedBrowserOrigin } from '../_lib/security.js';

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const config = getEventConfig();
  try {
    assertTrustedBrowserOrigin(req, config);
    await requireAdmin(req, config);
    const sql = getSql(config.databaseUrl);
    const url = new URL(req.url, 'http://localhost');
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
    const paymentStatus = url.searchParams.get('paymentStatus') || '';
    const applicationStatus = url.searchParams.get('applicationStatus') || '';
    const participation = url.searchParams.get('participation') || '';
    const challengeStatus = url.searchParams.get('challengeStatus') || '';
    const exhibitionStatus = url.searchParams.get('exhibitionStatus') || '';
    const challengeEligible = url.searchParams.get('challengeEligible') || '';
    const exhibitionCategory = (url.searchParams.get('exhibitionCategory') || '')
      .trim()
      .slice(0, 120);
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 25)));
    const offset = (page - 1) * pageSize;
    const eventId = config.eventId || EVENT_ID;
    const like = q ? `%${q}%` : null;
    const categoryLike = exhibitionCategory ? `%${exhibitionCategory}%` : null;

    const summaryRows = await sql`
      SELECT
        COUNT(*)::int AS total_applications,
        COUNT(*) FILTER (
          WHERE payment_status = 'NOT_REQUIRED'
            AND COALESCE(challenge_selected, false) = false
            AND COALESCE(exhibition_selected, false) = false
        )::int AS free_event_registrations,
        COUNT(*) FILTER (WHERE COALESCE(challenge_selected, false) = true)::int AS challenge_applicants,
        COUNT(*) FILTER (
          WHERE COALESCE(challenge_selected, false) = true
            AND challenge_status IN ('CONFIRMED', 'UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED')
        )::int AS confirmed_challenge_participants,
        COUNT(*) FILTER (WHERE COALESCE(exhibition_selected, false) = true)::int AS exhibition_applicants,
        COUNT(*) FILTER (
          WHERE COALESCE(exhibition_selected, false) = true
            AND exhibition_status = 'CONFIRMED'
        )::int AS confirmed_exhibitors,
        COUNT(*) FILTER (
          WHERE COALESCE(challenge_selected, false) = true
            AND COALESCE(exhibition_selected, false) = true
        )::int AS both_activities,
        COUNT(*) FILTER (WHERE payment_status = 'PENDING')::int AS pending_payments,
        COUNT(*) FILTER (WHERE payment_status = 'SUCCESS')::int AS verified_payments,
        COUNT(*) FILTER (
          WHERE payment_status IN ('FAILED', 'REVERSED', 'INITIALIZATION_FAILED')
        )::int AS failed_or_reversed,
        COUNT(*) FILTER (WHERE payment_status = 'SUCCESS')::int AS paid_registrations,
        COUNT(*) FILTER (WHERE application_status = 'SHORTLISTED' OR challenge_status = 'SHORTLISTED')::int AS shortlisted
      FROM registrations
      WHERE event_id = ${eventId}
    `;

    const rows = await sql`
      SELECT
        r.id,
        r.public_reference,
        r.full_name,
        r.email_normalized,
        r.phone,
        r.state_of_residence,
        r.applicant_category,
        r.business_name,
        r.application_status,
        r.payment_status,
        r.event_registration_status,
        r.challenge_selected,
        r.exhibition_selected,
        r.challenge_status,
        r.exhibition_status,
        r.expected_amount_kobo,
        r.currency,
        r.challenge_women_eligibility_attested,
        r.exhibition_category,
        r.created_at,
        r.updated_at,
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
        ) AS confirmation_email_status
      FROM registrations r
      WHERE r.event_id = ${eventId}
        AND (${like}::text IS NULL OR r.public_reference ILIKE ${like} OR r.full_name ILIKE ${like})
        AND (${paymentStatus || null}::text IS NULL OR r.payment_status = ${paymentStatus || null})
        AND (${applicationStatus || null}::text IS NULL OR r.application_status = ${applicationStatus || null})
        AND (${challengeStatus || null}::text IS NULL OR r.challenge_status = ${challengeStatus || null})
        AND (${exhibitionStatus || null}::text IS NULL OR r.exhibition_status = ${exhibitionStatus || null})
        AND (
          ${challengeEligible || null}::text IS NULL
          OR (
            ${challengeEligible} = 'true'
            AND r.challenge_women_eligibility_attested = true
          )
          OR (
            ${challengeEligible} = 'false'
            AND r.challenge_women_eligibility_attested = false
          )
        )
        AND (
          ${categoryLike}::text IS NULL
          OR r.exhibition_category ILIKE ${categoryLike}
        )
        AND (
          ${participation || null}::text IS NULL
          OR (${participation} = 'free' AND COALESCE(r.challenge_selected, false) = false AND COALESCE(r.exhibition_selected, false) = false)
          OR (${participation} = 'challenge' AND COALESCE(r.challenge_selected, false) = true AND COALESCE(r.exhibition_selected, false) = false)
          OR (${participation} = 'exhibition' AND COALESCE(r.challenge_selected, false) = false AND COALESCE(r.exhibition_selected, false) = true)
          OR (${participation} = 'both' AND COALESCE(r.challenge_selected, false) = true AND COALESCE(r.exhibition_selected, false) = true)
        )
        AND (${from || null}::timestamptz IS NULL OR r.created_at >= ${from || null}::timestamptz)
        AND (${to || null}::timestamptz IS NULL OR r.created_at <= ${to || null}::timestamptz)
      ORDER BY r.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM registrations r
      WHERE r.event_id = ${eventId}
        AND (${like}::text IS NULL OR r.public_reference ILIKE ${like} OR r.full_name ILIKE ${like})
        AND (${paymentStatus || null}::text IS NULL OR r.payment_status = ${paymentStatus || null})
        AND (${applicationStatus || null}::text IS NULL OR r.application_status = ${applicationStatus || null})
        AND (${challengeStatus || null}::text IS NULL OR r.challenge_status = ${challengeStatus || null})
        AND (${exhibitionStatus || null}::text IS NULL OR r.exhibition_status = ${exhibitionStatus || null})
        AND (
          ${challengeEligible || null}::text IS NULL
          OR (
            ${challengeEligible} = 'true'
            AND r.challenge_women_eligibility_attested = true
          )
          OR (
            ${challengeEligible} = 'false'
            AND r.challenge_women_eligibility_attested = false
          )
        )
        AND (
          ${categoryLike}::text IS NULL
          OR r.exhibition_category ILIKE ${categoryLike}
        )
        AND (
          ${participation || null}::text IS NULL
          OR (${participation} = 'free' AND COALESCE(r.challenge_selected, false) = false AND COALESCE(r.exhibition_selected, false) = false)
          OR (${participation} = 'challenge' AND COALESCE(r.challenge_selected, false) = true AND COALESCE(r.exhibition_selected, false) = false)
          OR (${participation} = 'exhibition' AND COALESCE(r.challenge_selected, false) = false AND COALESCE(r.exhibition_selected, false) = true)
          OR (${participation} = 'both' AND COALESCE(r.challenge_selected, false) = true AND COALESCE(r.exhibition_selected, false) = true)
        )
        AND (${from || null}::timestamptz IS NULL OR r.created_at >= ${from || null}::timestamptz)
        AND (${to || null}::timestamptz IS NULL OR r.created_at <= ${to || null}::timestamptz)
    `;

    sendJson(res, 200, {
      ok: true,
      summary: summaryRows[0],
      page,
      pageSize,
      total: countRows[0]?.total || 0,
      registrations: rows,
    });
  } catch (error) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      sendError(res, 401, error.code, error.message);
      return;
    }
    if (error.code === 'FORBIDDEN_ORIGIN' || error.code === 'ORIGIN_NOT_CONFIGURED') {
      sendError(res, 403, error.code, error.message);
      return;
    }
    sendError(res, 500, 'LIST_FAILED', 'Unable to load registrations.');
  }
}
