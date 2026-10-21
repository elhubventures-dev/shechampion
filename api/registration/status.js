import { getEventConfig } from '../_lib/config.js';
import { methodNotAllowed, sendError, sendJson } from '../_lib/http.js';
import { getPublicRegistrationStatus } from '../_lib/registrationService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const status = await getPublicRegistrationStatus(getEventConfig());
    sendJson(res, 200, status);
  } catch {
    sendError(res, 503, 'STATUS_UNAVAILABLE', 'Registration status unavailable.');
  }
}
