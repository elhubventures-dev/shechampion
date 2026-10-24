function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function csrfHeaders() {
  const token = readCookie('sc_admin_csrf');
  return token ? { 'X-CSRF-Token': token } : {};
}

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  return data;
}

export async function fetchRegistrationStatus() {
  const response = await fetch('/api/registration/status', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to load registration status.');
  }
  return data;
}

export async function submitRegistration(payload, idempotencyKey) {
  const response = await fetch('/api/registration/create', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Registration failed.');
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    if (data?.error?.details?.publicReference) {
      error.publicReference = data.error.details.publicReference;
    }
    throw error;
  }
  return data;
}

/** Prefer POST for state-changing verification; GET remains for provider return URLs. */
export async function verifyPayment(reference) {
  const response = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ reference }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Verification failed.');
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function adminLogin(email, password) {
  let response;
  try {
    response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      'Could not reach the login API. Use `npx vercel dev` (not Vite alone) for local admin.'
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Login API is not available on this host. Local staging needs `npx vercel dev`; production needs admin env vars in Vercel.'
    );
  }

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || `Login failed (${response.status}).`);
  }
  return data;
}

export async function adminLogout() {
  await fetch('/api/admin/session?action=logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      ...csrfHeaders(),
    },
  });
}

export async function adminMe() {
  const response = await fetch('/api/admin/session', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Unauthorized');
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function adminListRegistrations(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const response = await fetch(`/api/admin/registrations?${qs}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Failed to load.');
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function adminGetRegistration(id) {
  const response = await fetch(
    `/api/admin/registration?id=${encodeURIComponent(id)}`,
    {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }
  );
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to load registration.');
  }
  return data;
}

export async function adminUpdateRegistration(id, body) {
  const response = await fetch(
    `/api/admin/registration?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...csrfHeaders(),
      },
      body: JSON.stringify(body),
    }
  );
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Update failed.');
  }
  return data;
}

export async function adminRetryEmail(registrationId) {
  const response = await fetch('/api/admin/email', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({ action: 'retry', registrationId }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Retry failed.');
  }
  return data;
}

export async function adminSendRegistrationEmail({
  registrationId,
  emailType,
  message = '',
}) {
  const response = await fetch('/api/admin/email', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({
      action: 'send',
      registrationId,
      emailType,
      message,
    }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Send email failed.');
  }
  return data;
}

export async function adminAnnounce({ announceType, message = '' }) {
  const response = await fetch('/api/admin/email', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({ action: 'announce', announceType, message }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Announcement failed.');
  }
  return data;
}

export async function adminNotifyApplicant({
  registrationId,
  subject,
  message,
}) {
  const response = await fetch('/api/admin/email', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({
      action: 'notify',
      registrationId,
      subject,
      message,
    }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Notification failed.');
  }
  return data;
}

export async function submitContactForm(payload) {
  const response = await fetch('/api/forms', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ ...payload, form: 'contact' }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to send message.');
  }
  return data;
}

export async function submitMembershipInterest(payload) {
  const response = await fetch('/api/forms', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ ...payload, form: 'membership' }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to submit membership interest.');
  }
  return data;
}

export async function adminExportCsv() {
  const response = await fetch('/api/admin/export', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'text/csv',
      ...csrfHeaders(),
    },
  });
  if (!response.ok) {
    const data = await parseJson(response);
    throw new Error(data?.error?.message || 'Export failed.');
  }
  return response.blob();
}
