import { describe, expect, it } from 'vitest';
import {
  escapeCsvCell,
  isValidPaymentReference,
  validateRegistrationInput,
} from '../api/_lib/validation.js';
import { PRICING } from '../api/_lib/pricing.js';

describe('validateRegistrationInput', () => {
  const valid = {
    fullName: 'Ada Okafor',
    email: 'Ada.Okafor@Example.com',
    phone: '+234 801 234 5678',
    stateOfResidence: 'Lagos',
    applicantCategory: 'BUSINESS_IDEA',
    businessName: '',
    briefDescription: 'A skills-based catering idea for local markets.',
    privacyAccepted: true,
    termsAccepted: true,
  };

  it('accepts and normalizes valid free registration input', () => {
    const result = validateRegistrationInput(valid);
    expect(result.ok).toBe(true);
    expect(result.value.email).toBe('ada.okafor@example.com');
    expect(result.value.fullName).toBe('Ada Okafor');
    expect(result.value.expectedAmountKobo).toBe(0);
    expect(result.value.paymentRequired).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = validateRegistrationInput({});
    expect(result.ok).toBe(false);
    expect(result.errors.fullName).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.privacyAccepted).toBeTruthy();
  });

  it('rejects invalid category and state', () => {
    const result = validateRegistrationInput({
      ...valid,
      applicantCategory: 'OTHER',
      stateOfResidence: 'California',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.applicantCategory).toBeTruthy();
    expect(result.errors.stateOfResidence).toBeTruthy();
  });
});

describe('payment reference and pricing constants', () => {
  it('keeps challenge fee at 500000 kobo', () => {
    expect(PRICING.CHALLENGE_KOBO).toBe(500000);
    expect(PRICING.EXHIBITION_KOBO).toBe(3000000);
    expect(PRICING.COMBINED_KOBO).toBe(3500000);
  });

  it('validates payment reference format', () => {
    expect(isValidPaymentReference('SCBEC26_' + 'a'.repeat(32))).toBe(true);
    expect(isValidPaymentReference('pay_123')).toBe(false);
  });
});

describe('CSV formula injection', () => {
  it('prefixes dangerous cells', () => {
    expect(escapeCsvCell('=cmd()')).toBe("'=cmd()");
    expect(escapeCsvCell('+1+1')).toBe("'+1+1");
    expect(escapeCsvCell('-2+3')).toBe("'-2+3");
    expect(escapeCsvCell('@sum')).toBe("'@sum");
  });

  it('quotes cells with commas', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });
});
