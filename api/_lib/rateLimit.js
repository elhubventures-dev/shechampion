import { getSql } from './db.js';

/**
 * Persistent rate limiter using PostgreSQL (suitable for serverless).
 * Falls back to fail-closed when DB is unavailable for protected routes
 * that already require DB; callers should catch errors.
 */
export async function enforceRateLimit({
  key,
  limit,
  windowMs,
  databaseUrl,
}) {
  const sql = getSql(databaseUrl);
  const now = new Date();
  const windowStartIso = new Date(
    now.getTime() - (now.getTime() % windowMs)
  ).toISOString();

  const rows = await sql`
    INSERT INTO rate_limits (bucket_key, window_start, hit_count)
    VALUES (${key}, ${windowStartIso}::timestamptz, 1)
    ON CONFLICT (bucket_key) DO UPDATE
      SET
        hit_count = CASE
          WHEN rate_limits.window_start = EXCLUDED.window_start
            THEN rate_limits.hit_count + 1
          ELSE 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start = EXCLUDED.window_start
            THEN rate_limits.window_start
          ELSE EXCLUDED.window_start
        END
    RETURNING hit_count, window_start
  `;

  const hitCount = Number(rows[0]?.hit_count || 0);
  if (hitCount > limit) {
    const err = new Error('Too many requests. Please try again later.');
    err.code = 'RATE_LIMITED';
    err.retryAfter = Math.ceil(windowMs / 1000);
    throw err;
  }
  return { hitCount, remaining: Math.max(0, limit - hitCount) };
}
