import {
  APPLICANT_CATEGORIES,
  NIGERIA_STATES,
} from './constants.js';
import { calculateParticipationAmount } from './pricing.js';

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

function normalizeOptionalText(value, maxLen) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (text.length > maxLen) return { tooLong: true, text };
  return { tooLong: false, text };
}

/**
 * Validate basic event registration fields plus optional paid participation.
 * Client-supplied amount / currency / discounts are ignored (never accepted).
 */
export function validateRegistrationInput(input, options = {}) {
  const allowCombined =
    options.allowCombinedChallengeExhibition !== undefined
      ? Boolean(options.allowCombinedChallengeExhibition)
      : false;

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

  const challengeSelected =
    input.challengeSelected === true || input.participateChallenge === true;
  const exhibitionSelected =
    input.exhibitionSelected === true || input.exhibitBusiness === true;

  const challengeEligible =
    input.challengeWomenEligibilityAttested === true ||
    input.challengeEligibilityConfirmed === true;
  const exhibitionOwner =
    input.exhibitionBusinessOwnerAttested === true ||
    input.businessOwnerConfirmed === true;

  const exhibitionBusinessNameRaw = normalizeOptionalText(
    input.exhibitionBusinessName ?? input.exhibitBusinessName,
    160
  );
  const exhibitionCategoryRaw = normalizeOptionalText(
    input.exhibitionCategory ?? input.exhibitCategory,
    120
  );
  const exhibitionDescriptionRaw = normalizeOptionalText(
    input.exhibitionDescription ?? input.exhibitDescription,
    1000
  );

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

  if (challengeSelected && !challengeEligible) {
    errors.challengeWomenEligibilityAttested =
      'Confirm that you are eligible for the women-only Business Empowerment Challenge.';
  }

  if (exhibitionSelected) {
    if (!exhibitionOwner) {
      errors.exhibitionBusinessOwnerAttested =
        'Confirm that you are applying as a business owner to exhibit.';
    }
    if (
      !exhibitionBusinessNameRaw ||
      exhibitionBusinessNameRaw.tooLong ||
      !exhibitionBusinessNameRaw.text
    ) {
      errors.exhibitionBusinessName =
        exhibitionBusinessNameRaw?.tooLong
          ? 'Exhibition business name must be 160 characters or fewer.'
          : 'Exhibition business name is required.';
    }
    if (
      !exhibitionCategoryRaw ||
      exhibitionCategoryRaw.tooLong ||
      !exhibitionCategoryRaw.text ||
      exhibitionCategoryRaw.text.length < 2
    ) {
      errors.exhibitionCategory =
        exhibitionCategoryRaw?.tooLong
          ? 'Product/service category must be 120 characters or fewer.'
          : 'Product or service category is required.';
    }
    if (
      !exhibitionDescriptionRaw ||
      exhibitionDescriptionRaw.tooLong ||
      !exhibitionDescriptionRaw.text ||
      exhibitionDescriptionRaw.text.length < 10
    ) {
      errors.exhibitionDescription =
        exhibitionDescriptionRaw?.tooLong
          ? 'Exhibition description must be 1000 characters or fewer.'
          : 'Briefly describe what you will exhibit (at least 10 characters).';
    }
  }

  const pricing = calculateParticipationAmount({
    challengeSelected,
    exhibitionSelected,
    allowCombined,
  });
  if (!pricing.ok) {
    errors.participationSelection = pricing.error;
  }

  // Explicitly reject client-supplied pricing fields rather than trusting them.
  if (
    input.amountKobo !== undefined ||
    input.amount !== undefined ||
    input.feeKobo !== undefined ||
    input.currency !== undefined ||
    input.discount !== undefined ||
    input.discountCode !== undefined
  ) {
    errors.amount = 'Payment amount and currency are determined by the server.';
  }

  const ok = Object.keys(errors).length === 0;

  return {
    ok,
    errors,
    value: ok
      ? {
          fullName,
          email,
          phone,
          stateOfResidence: state,
          applicantCategory: category,
          businessName: businessName || null,
          briefDescription,
          privacyAccepted,
          termsAccepted,
          challengeSelected,
          exhibitionSelected,
          challengeWomenEligibilityAttested: challengeSelected
            ? challengeEligible
            : false,
          exhibitionBusinessOwnerAttested: exhibitionSelected
            ? exhibitionOwner
            : false,
          exhibitionBusinessName: exhibitionSelected
            ? exhibitionBusinessNameRaw.text
            : null,
          exhibitionCategory: exhibitionSelected
            ? exhibitionCategoryRaw.text
            : null,
          exhibitionDescription: exhibitionSelected
            ? exhibitionDescriptionRaw.text
            : null,
          expectedAmountKobo: pricing.amountKobo,
          currency: pricing.currency,
          paymentRequired: pricing.paymentRequired,
        }
      : null,
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
