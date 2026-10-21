import {
  APPLICANT_CATEGORIES,
  NIGERIA_STATES,
} from './constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function normalizePhone(phone) {
  return String(phone || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validateRegistrationInput(input) {
  const errors = {};
  const fullName = normalizeName(input.fullName);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const state = String(input.stateOfResidence || '').trim();
  const category = String(input.applicantCategory || '').trim();
  const businessName = input.businessName
    ? String(input.businessName).trim().replace(/\s+/g, ' ')
    : '';
  const briefDescription = String(input.briefDescription || '')
    .trim()
    .replace(/\s+/g, ' ');
  const privacyAccepted = input.privacyAccepted === true;
  const termsAccepted = input.termsAccepted === true;

  if (!fullName || fullName.length < 2) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.length > 120) {
    errors.fullName = 'Full name must be 120 characters or fewer.';
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    errors.email = 'A valid email address is required.';
  }

  if (!phone || !PHONE_RE.test(phone)) {
    errors.phone = 'A valid phone number is required.';
  } else if (phone.length > 30) {
    errors.phone = 'Phone number is too long.';
  }

  if (!NIGERIA_STATES.includes(state)) {
    errors.stateOfResidence = 'Select a valid Nigerian state or FCT.';
  }

  if (!APPLICANT_CATEGORIES.includes(category)) {
    errors.applicantCategory = 'Select a valid applicant category.';
  }

  if (businessName.length > 160) {
    errors.businessName = 'Business name must be 160 characters or fewer.';
  }

  if (!briefDescription || briefDescription.length < 10) {
    errors.briefDescription =
      'Please provide a brief description (at least 10 characters).';
  } else if (briefDescription.length > 1000) {
    errors.briefDescription =
      'Description must be 1000 characters or fewer.';
  }

  if (!privacyAccepted) {
    errors.privacyAccepted = 'You must accept the privacy notice.';
  }
  if (!termsAccepted) {
    errors.termsAccepted = 'You must accept the participation terms.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      fullName,
      email,
      phone,
      stateOfResidence: state,
      applicantCategory: category,
      businessName: businessName || null,
      briefDescription,
      privacyAccepted,
      termsAccepted,
    },
  };
}

export function isValidPaymentReference(ref) {
  return typeof ref === 'string' && /^SCBEC26_[a-f0-9]{32}$/i.test(ref);
}

export function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  let safe = str;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
