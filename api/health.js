import { evaluateReadiness, getEventConfig } from './_lib/config.js';
import { pingDatabase } from './_lib/db.js';
import { sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const config = getEventConfig();
  const readiness = evaluateReadiness(config);
  let databaseOk = false;
  if (config.databaseUrl) {
    try {
      await pingDatabase(config.databaseUrl);
      databaseOk = true;
    } catch {
      databaseOk = false;
    }
  }

  // Coarse public health only — no secret presence details beyond readiness.
  sendJson(res, 200, {
    ok: true,
    service: 'she-champions-event-api',
    publicStatus: readiness.ready && databaseOk ? 'open' : readiness.publicStatus,
  });
}
