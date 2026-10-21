import { requireAdmin } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
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
    const admin = await requireAdmin(req, config);
    sendJson(res, 200, { ok: true, email: admin.email });
  } catch (error) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      sendError(res, 401, error.code, error.message);
      return;
    }
    if (error.code === 'FORBIDDEN_ORIGIN' || error.code === 'ORIGIN_NOT_CONFIGURED') {
      sendError(res, 403, error.code, error.message);
      return;
    }
    sendError(res, 500, 'AUTH_CHECK_FAILED', 'Unable to verify session.');
  }
}
