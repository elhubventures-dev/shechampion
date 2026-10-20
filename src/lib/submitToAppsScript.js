/**
 * Submits form payloads to the existing Google Apps Script web app.
 *
 * The deployment is called with mode: "no-cors", so the browser returns an
 * opaque response. Delivery cannot be confirmed from the client; callers must
 * not present an unverified "success" state as confirmed delivery.
 */
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwZdScWgTk1CqNI0SiOHfzaG6ZhpNVA7ARYLJpJIi84kOlMbof6WArMcRCL1hXzG6Te/exec';

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<'sent' | 'error'>}
 */
export async function submitToAppsScript(payload) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    // Opaque response: request left the browser, but status/body are unreadable.
    return 'sent';
  } catch {
    return 'error';
  }
}
