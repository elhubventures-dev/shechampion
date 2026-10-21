import { neon } from '@neondatabase/serverless';
import { getEventConfig } from './config.js';

let sqlClient = null;

export function getSql(databaseUrl = getEventConfig().databaseUrl) {
  if (!databaseUrl) {
    const err = new Error('DATABASE_URL is not configured.');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  if (!sqlClient || sqlClient._url !== databaseUrl) {
    const sql = neon(databaseUrl, { fullResults: false });
    sql._url = databaseUrl;
    sqlClient = sql;
  }
  return sqlClient;
}

export async function pingDatabase(databaseUrl) {
  const sql = getSql(databaseUrl);
  await sql`SELECT 1 AS ok`;
  return true;
}

/** Reset cached client (tests). */
export function resetDbClient() {
  sqlClient = null;
}
