import { describe, expect, it } from 'vitest';
import {
  buildAdminContactMessageEmail,
  buildAdminCustomMessageEmail,
  buildAdminMembershipSignupEmail,
  buildAdminNewFreeRegistrationEmail,
  buildAdminNewPaidParticipationEmail,
  buildAdminPaymentFailedEmail,
  buildChallengeMaterialsEmail,
  buildChallengeNotShortlistedEmail,
  buildChallengeShortlistedEmail,
  buildChallengeUnderReviewEmail,
  buildContactAcknowledgementEmail,
  buildEventDetailsUpdateEmail,
  buildExhibitionInstructionsEmail,
  buildFreeRegistrationEmail,
  buildMembershipAcknowledgementEmail,
  buildParticipationConfirmationEmail,
  buildPaymentFailedEmail,
  buildPaymentPendingEmail,
  buildPaymentReversedEmail,
  buildRegistrationCutoffReminderEmail,
  buildRegistrationOpenAnnouncementEmail,
  buildRegistrationWithdrawnEmail,
  EMAIL_TYPES,
} from '../api/_lib/email.js';
import { logoUrl } from '../api/_lib/emailLayout.js';

const config = {
  publicSiteUrl: 'https://www.shechampion-bbf.org',
};

function expectBranded(content, { emailType, ctaPathFragment }) {
  expect(content.emailType).toBe(emailType);
  expect(content.subject).toBeTruthy();
  expect(content.text).toBeTruthy();
  expect(content.html).toContain('SHE CHAMPIONS');
  expect(content.html).toContain(logoUrl(config));
  expect(content.html).toContain('alt="SHE CHAMPIONS"');
  expect(content.html).toContain('#0b1f3a');
  expect(content.html).toContain('#8b3db8');
  if (ctaPathFragment) {
    expect(content.html).toContain(ctaPathFragment);
    expect(content.text).toContain(ctaPathFragment);
  }
}

describe('branded email templates', () => {
  it('builds free registration confirmation with logo and event CTA', () => {
    const content = buildFreeRegistrationEmail({
      publicReference: 'BEC-FREE-1',
      fullName: 'Ada Lovelace',
      config,
    });
    expectBranded(content, {
      emailType: EMAIL_TYPES.FREE,
      ctaPathFragment: '/business-empowerment-challenge-2026',
    });
    expect(content.html.toLowerCase()).not.toMatch(/you (have been|are) awarded a grant|grant award confirmed/);
    expect(content.text.toLowerCase()).not.toMatch(/challenge confirmed|exhibition confirmed/);
  });

  it('builds participation confirmation variants without inventing grants', () => {
    const challenge = buildParticipationConfirmationEmail({
      publicReference: 'BEC-PAID-1',
      fullName: 'Ada Lovelace',
      challengeSelected: true,
      exhibitionSelected: false,
      challengeStatus: 'CONFIRMED',
      exhibitionStatus: null,
      expectedAmountKobo: 500000,
      config,
    });
    expectBranded(challenge, {
      emailType: EMAIL_TYPES.PARTICIPATION,
      ctaPathFragment: '/business-empowerment-challenge-2026',
    });
    expect(challenge.html.toLowerCase()).toContain('does not guarantee a grant');
    expect(challenge.html.toLowerCase()).not.toMatch(/you (have been|are) awarded a grant/);

    const both = buildParticipationConfirmationEmail({
      publicReference: 'BEC-PAID-2',
      fullName: 'Ada Lovelace',
      challengeSelected: true,
      exhibitionSelected: true,
      challengeStatus: 'CONFIRMED',
      exhibitionStatus: 'CONFIRMED',
      expectedAmountKobo: 3500000,
      config,
    });
    expect(both.html.toLowerCase()).toContain('exhibition');
    expect(both.emailType).toBe(EMAIL_TYPES.PARTICIPATION);
  });

  it('builds payment lifecycle emails with payment result CTA when reference present', () => {
    const pending = buildPaymentPendingEmail({
      publicReference: 'BEC-P1',
      fullName: 'Ada',
      expectedAmountKobo: 500000,
      paymentReference: 'pay_ref_1',
      config,
    });
    expectBranded(pending, {
      emailType: EMAIL_TYPES.PAYMENT_PENDING,
      ctaPathFragment: '/payment/result?reference=pay_ref_1',
    });

    const failed = buildPaymentFailedEmail({
      publicReference: 'BEC-P1',
      fullName: 'Ada',
      paymentReference: 'pay_ref_1',
      config,
    });
    expectBranded(failed, {
      emailType: EMAIL_TYPES.PAYMENT_FAILED,
      ctaPathFragment: '/payment/result?reference=pay_ref_1',
    });

    const reversed = buildPaymentReversedEmail({
      publicReference: 'BEC-P1',
      fullName: 'Ada',
      config,
    });
    expectBranded(reversed, {
      emailType: EMAIL_TYPES.PAYMENT_REVERSED,
      ctaPathFragment: '/contact',
    });
  });

  it('builds assessment status emails', () => {
    expectBranded(
      buildChallengeUnderReviewEmail({
        publicReference: 'BEC-A1',
        fullName: 'Ada',
        config,
      }),
      { emailType: EMAIL_TYPES.UNDER_REVIEW }
    );
    expectBranded(
      buildChallengeShortlistedEmail({
        publicReference: 'BEC-A1',
        fullName: 'Ada',
        config,
      }),
      { emailType: EMAIL_TYPES.SHORTLISTED }
    );
    expectBranded(
      buildChallengeNotShortlistedEmail({
        publicReference: 'BEC-A1',
        fullName: 'Ada',
        config,
      }),
      { emailType: EMAIL_TYPES.NOT_SHORTLISTED }
    );
    expectBranded(
      buildRegistrationWithdrawnEmail({
        publicReference: 'BEC-A1',
        fullName: 'Ada',
        config,
      }),
      { emailType: EMAIL_TYPES.WITHDRAWN }
    );
  });

  it('builds materials, exhibitor, and broadcast templates', () => {
    expectBranded(
      buildChallengeMaterialsEmail({
        publicReference: 'BEC-M1',
        fullName: 'Ada',
        message: 'Please complete the materials form.',
        config,
      }),
      { emailType: EMAIL_TYPES.MATERIALS }
    );
    expectBranded(
      buildExhibitionInstructionsEmail({
        publicReference: 'BEC-E1',
        fullName: 'Ada',
        message: 'Bring your table materials.',
        config,
      }),
      { emailType: EMAIL_TYPES.EXHIBITION }
    );
    expectBranded(
      buildRegistrationOpenAnnouncementEmail({
        fullName: 'Ada',
        message: 'Registration is open.',
        config,
      }),
      {
        emailType: EMAIL_TYPES.OPEN,
        ctaPathFragment: '/business-empowerment-challenge-2026',
      }
    );
    expectBranded(
      buildRegistrationCutoffReminderEmail({
        publicReference: 'BEC-C1',
        fullName: 'Ada',
        message: 'Cutoff approaching.',
        config,
      }),
      { emailType: EMAIL_TYPES.CUTOFF }
    );
    const details = buildEventDetailsUpdateEmail({
      publicReference: 'BEC-D1',
      fullName: 'Ada',
      message: 'Venue confirmed at the published location.',
      config,
    });
    expectBranded(details, { emailType: EMAIL_TYPES.DETAILS });
    expect(details.html).toContain('Venue confirmed');
    expect(details.html).not.toContain('<script');
  });

  it('builds staff and public-form templates', () => {
    expectBranded(
      buildAdminNewFreeRegistrationEmail({
        publicReference: 'BEC-F1',
        fullName: 'Ada',
        email: 'ada@example.com',
        config,
      }),
      { emailType: EMAIL_TYPES.ADMIN_FREE }
    );
    expectBranded(
      buildAdminNewPaidParticipationEmail({
        publicReference: 'BEC-P1',
        fullName: 'Ada',
        email: 'ada@example.com',
        expectedAmountKobo: 500000,
        config,
      }),
      { emailType: EMAIL_TYPES.ADMIN_PAID }
    );
    expectBranded(
      buildAdminPaymentFailedEmail({
        publicReference: 'BEC-P1',
        fullName: 'Ada',
        email: 'ada@example.com',
        statusLabel: 'FAILED',
        config,
      }),
      { emailType: EMAIL_TYPES.ADMIN_PAYMENT_FAILED }
    );
    expectBranded(
      buildContactAcknowledgementEmail({
        fullName: 'Ada',
        subject: 'Hello',
        config,
      }),
      { emailType: EMAIL_TYPES.CONTACT_ACK, ctaPathFragment: '/contact' }
    );
    expectBranded(
      buildAdminContactMessageEmail({
        fullName: 'Ada',
        email: 'ada@example.com',
        subject: 'Hello',
        message: 'I need help with registration.',
        config,
      }),
      { emailType: EMAIL_TYPES.ADMIN_CONTACT }
    );
    expectBranded(
      buildMembershipAcknowledgementEmail({
        fullName: 'Ada',
        config,
      }),
      { emailType: EMAIL_TYPES.MEMBER_ACK }
    );
    expectBranded(
      buildAdminMembershipSignupEmail({
        fullName: 'Ada',
        email: 'ada@example.com',
        phone: '',
        config,
      }),
      { emailType: EMAIL_TYPES.ADMIN_MEMBER }
    );
  });

  it('escapes HTML in event details admin message', () => {
    const content = buildEventDetailsUpdateEmail({
      publicReference: 'BEC-X',
      fullName: 'Ada',
      message: '<img src=x onerror=alert(1)> Venue update',
      config,
    });
    expect(content.html).not.toContain('<img src=x');
    expect(content.html).toContain('&lt;img');
  });

  it('builds admin custom notify email with escaped body', () => {
    const content = buildAdminCustomMessageEmail({
      publicReference: 'BEC-N1',
      fullName: 'Ada',
      subject: 'Booth reminder',
      message: 'Bring your <script>alert(1)</script> materials.',
      config,
    });
    expectBranded(content, {
      emailType: EMAIL_TYPES.ADMIN_CUSTOM,
      ctaPathFragment: '/contact',
    });
    expect(content.subject).toContain('Booth reminder');
    expect(content.html).not.toContain('<script>');
    expect(content.html).toContain('&lt;script&gt;');
  });

  it('exposes the full catalogue of email_type keys', () => {
    expect(Object.values(EMAIL_TYPES)).toEqual(
      expect.arrayContaining([
        'free_registration_confirmation',
        'participation_confirmation',
        'payment_pending',
        'payment_failed',
        'payment_reversed',
        'challenge_under_review',
        'challenge_shortlisted',
        'challenge_not_shortlisted',
        'registration_withdrawn',
        'challenge_materials_request',
        'exhibition_instructions',
        'registration_open_announcement',
        'registration_cutoff_reminder',
        'event_details_update',
        'admin_new_free_registration',
        'admin_new_paid_participation',
        'admin_payment_failed',
        'admin_contact_message',
        'admin_membership_signup',
        'admin_custom_message',
        'contact_acknowledgement',
        'membership_acknowledgement',
      ])
    );
  });
});
