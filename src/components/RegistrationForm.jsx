import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  APPLICANT_CATEGORY_OPTIONS,
  NIGERIA_STATES,
} from '../data/nigeriaStates';
import { submitRegistration } from '../lib/eventApi';
import RegistrationSuccessModal from './RegistrationSuccessModal';

const DEFAULT_PRICING = {
  currency: 'NGN',
  generalRegistrationKobo: 0,
  challengeKobo: 500000,
  exhibitionKobo: 3000000,
  combinedKobo: 3500000,
  generalDisplay: 'Free',
  challengeDisplay: '₦5,000',
  exhibitionDisplay: '₦30,000',
  combinedDisplay: '₦35,000',
  allowCombinedChallengeExhibition: true,
};

const INITIAL = {
  fullName: '',
  email: '',
  phone: '',
  stateOfResidence: '',
  applicantCategory: '',
  businessName: '',
  briefDescription: '',
  challengeSelected: false,
  exhibitionSelected: false,
  challengeWomenEligibilityAttested: false,
  exhibitionBusinessOwnerAttested: false,
  exhibitionBusinessName: '',
  exhibitionCategory: '',
  exhibitionDescription: '',
  privacyAccepted: false,
  termsAccepted: false,
};

function formatKobo(kobo) {
  if (!kobo) return 'Free';
  return `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function validateClient(values, pricing) {
  const errors = {};
  if (!values.fullName.trim() || values.fullName.trim().length < 2) {
    errors.fullName = 'Enter your full name.';
  }
  if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.phone.trim() || values.phone.trim().length < 7) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (!values.stateOfResidence) {
    errors.stateOfResidence = 'Select your state of residence.';
  }
  if (!values.applicantCategory) {
    errors.applicantCategory = 'Select an applicant category.';
  }
  if (!values.briefDescription.trim() || values.briefDescription.trim().length < 10) {
    errors.briefDescription =
      'Describe your business, skill, or idea (at least 10 characters).';
  }
  if (!values.privacyAccepted) {
    errors.privacyAccepted = 'Accept the privacy notice to continue.';
  }
  if (!values.termsAccepted) {
    errors.termsAccepted = 'Accept the participation terms to continue.';
  }
  if (
    values.challengeSelected &&
    values.exhibitionSelected &&
    !pricing.allowCombinedChallengeExhibition
  ) {
    errors.participationSelection =
      'Combined challenge and exhibition selection is not available. Choose one paid activity.';
  }
  if (values.challengeSelected && !values.challengeWomenEligibilityAttested) {
    errors.challengeWomenEligibilityAttested =
      'Confirm eligibility for the women-only challenge.';
  }
  if (values.exhibitionSelected) {
    if (!values.exhibitionBusinessOwnerAttested) {
      errors.exhibitionBusinessOwnerAttested =
        'Confirm that you are applying as a business owner.';
    }
    if (!values.exhibitionBusinessName.trim()) {
      errors.exhibitionBusinessName = 'Enter the business name for exhibition.';
    }
    if (!values.exhibitionCategory.trim()) {
      errors.exhibitionCategory = 'Enter a product or service category.';
    }
    if (
      !values.exhibitionDescription.trim() ||
      values.exhibitionDescription.trim().length < 10
    ) {
      errors.exhibitionDescription =
        'Describe what you will exhibit (at least 10 characters).';
    }
  }
  return errors;
}

export default function RegistrationForm({
  registrationOpen,
  paidCheckoutAvailable = true,
  pricing: pricingProp,
}) {
  const formId = useId();
  const pricing = { ...DEFAULT_PRICING, ...(pricingProp || {}) };
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );

  const participationTotal =
    (values.challengeSelected ? pricing.challengeKobo : 0) +
    (values.exhibitionSelected ? pricing.exhibitionKobo : 0);
  const paymentRequired = participationTotal > 0;
  const combinedBlocked =
    values.challengeSelected &&
    values.exhibitionSelected &&
    !pricing.allowCombinedChallengeExhibition;

  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && name !== 'challengeSelected' && name !== 'exhibitionSelected') {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      delete next.participationSelection;
      return next;
    });
    setSuccess(null);
    setSuccessModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || !registrationOpen) return;

    const nextErrors = validateClient(values, pricing);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    if (paymentRequired && !paidCheckoutAvailable) {
      setFormError(
        'Paid participation checkout is currently unavailable. You can register for the free event without selecting paid activities, or try again later.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitRegistration(
        {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          stateOfResidence: values.stateOfResidence,
          applicantCategory: values.applicantCategory,
          businessName: values.businessName,
          briefDescription: values.briefDescription,
          challengeSelected: values.challengeSelected,
          exhibitionSelected: values.exhibitionSelected,
          challengeWomenEligibilityAttested: values.challengeWomenEligibilityAttested,
          exhibitionBusinessOwnerAttested: values.exhibitionBusinessOwnerAttested,
          exhibitionBusinessName: values.exhibitionBusinessName,
          exhibitionCategory: values.exhibitionCategory,
          exhibitionDescription: values.exhibitionDescription,
          privacyAccepted: values.privacyAccepted,
          termsAccepted: values.termsAccepted,
        },
        idempotencyKey
      );

      if (result.alreadyPaid) {
        setFormError(
          `This email is already registered (reference ${result.publicReference}).`
        );
        return;
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      if (!result.paymentRequired) {
        setSuccess({
          publicReference: result.publicReference,
          emailStatus: result.emailStatus,
        });
        setSuccessModalOpen(true);
        return;
      }

      setFormError(
        result.publicReference
          ? `Payment could not be started. Your event registration reference is ${result.publicReference}. Paid participation remains unconfirmed — please try again.`
          : 'Payment could not be started. Please try again shortly.'
      );
    } catch (error) {
      if (error.details && typeof error.details === 'object') {
        setErrors(error.details);
      }
      if (error.code === 'PAYMENT_INIT_FAILED' && error.details?.publicReference) {
        setFormError(
          `${error.message} Reference: ${error.details.publicReference}.`
        );
      } else {
        setFormError(error.message || 'Unable to submit registration.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!registrationOpen) {
    return null;
  }

  if (success) {
    return (
      <>
        {successModalOpen ? (
          <RegistrationSuccessModal
            publicReference={success.publicReference}
            emailStatus={success.emailStatus}
            onClose={() => setSuccessModalOpen(false)}
          />
        ) : null}
        <div className="reg-form reg-form--success" role="status">
          <h3 className="reg-form__success-title">Event registration confirmed</h3>
          <p>
            Your free event registration is confirmed. Reference:{' '}
            <strong>{success.publicReference}</strong>
          </p>
          <p className="reg-form__note">
            This does not confirm challenge or exhibition participation. Those
            require a separate paid selection and verified payment.
          </p>
          {success.emailStatus === 'SENT' ? (
            <p className="reg-form__note">A confirmation email has been sent.</p>
          ) : (
            <p className="reg-form__note">
              A confirmation email could not be confirmed at this time. Keep your
              registration reference for your records.
            </p>
          )}
          {!successModalOpen ? (
            <button
              type="button"
              className="btn btn-secondary reg-form__success-reopen"
              onClick={() => setSuccessModalOpen(true)}
            >
              View confirmation
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      <p className="reg-form__intro">
        General event registration is free. Optional challenge and exhibition
        participation may be selected below and require payment only when chosen.
      </p>

      <fieldset className="reg-form__fieldset">
        <legend>Step 1 — Event registration details</legend>
        <div className="reg-form__grid">
          <div className="reg-form__field">
            <label htmlFor={`${formId}-fullName`}>Full name</label>
            <input
              id={`${formId}-fullName`}
              name="fullName"
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? `${formId}-fullName-err` : undefined}
              disabled={submitting}
              required
            />
            {errors.fullName ? (
              <p className="reg-form__error" id={`${formId}-fullName-err`} role="alert">
                {errors.fullName}
              </p>
            ) : null}
          </div>

          <div className="reg-form__field">
            <label htmlFor={`${formId}-email`}>Email address</label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => updateField('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${formId}-email-err` : undefined}
              disabled={submitting}
              required
            />
            {errors.email ? (
              <p className="reg-form__error" id={`${formId}-email-err`} role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="reg-form__field">
            <label htmlFor={`${formId}-phone`}>Phone number</label>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${formId}-phone-err` : undefined}
              disabled={submitting}
              required
            />
            {errors.phone ? (
              <p className="reg-form__error" id={`${formId}-phone-err`} role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>

          <div className="reg-form__field">
            <label htmlFor={`${formId}-state`}>State of residence</label>
            <select
              id={`${formId}-state`}
              name="stateOfResidence"
              value={values.stateOfResidence}
              onChange={(e) => updateField('stateOfResidence', e.target.value)}
              aria-invalid={Boolean(errors.stateOfResidence)}
              disabled={submitting}
              required
            >
              <option value="">Select state</option>
              {NIGERIA_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.stateOfResidence ? (
              <p className="reg-form__error" role="alert">
                {errors.stateOfResidence}
              </p>
            ) : null}
          </div>

          <div className="reg-form__field reg-form__field--full">
            <label htmlFor={`${formId}-category`}>Applicant category</label>
            <select
              id={`${formId}-category`}
              name="applicantCategory"
              value={values.applicantCategory}
              onChange={(e) => updateField('applicantCategory', e.target.value)}
              aria-invalid={Boolean(errors.applicantCategory)}
              disabled={submitting}
              required
            >
              <option value="">Select category</option>
              {APPLICANT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.applicantCategory ? (
              <p className="reg-form__error" role="alert">
                {errors.applicantCategory}
              </p>
            ) : null}
          </div>

          <div className="reg-form__field reg-form__field--full">
            <label htmlFor={`${formId}-business`}>
              Business name <span className="reg-form__optional">(optional)</span>
            </label>
            <input
              id={`${formId}-business`}
              name="businessName"
              value={values.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="reg-form__field reg-form__field--full">
            <label htmlFor={`${formId}-description`}>
              Brief description of your business, skill, or idea
            </label>
            <textarea
              id={`${formId}-description`}
              name="briefDescription"
              rows={4}
              maxLength={1000}
              value={values.briefDescription}
              onChange={(e) => updateField('briefDescription', e.target.value)}
              aria-invalid={Boolean(errors.briefDescription)}
              disabled={submitting}
              required
            />
            {errors.briefDescription ? (
              <p className="reg-form__error" role="alert">
                {errors.briefDescription}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="reg-form__fieldset">
        <legend>Step 2 — Optional paid participation</legend>
        <p className="reg-form__note">
          Event registration is free and always included. Selecting challenge or
          exhibition participation does not replace free registration; those
          activities remain unconfirmed until payment is verified.
        </p>

        <div className="reg-form__options" role="group" aria-label="Participation options">
          <label className="reg-form__option reg-form__option--included">
            <input type="checkbox" checked disabled readOnly />
            <span>
              <strong>General event registration</strong> — {pricing.generalDisplay}{' '}
              (always included)
            </span>
          </label>

          <label className="reg-form__option">
            <input
              type="checkbox"
              checked={values.challengeSelected}
              onChange={(e) => {
                updateField('challengeSelected', e.target.checked);
                if (!e.target.checked) {
                  updateField('challengeWomenEligibilityAttested', false);
                }
              }}
              disabled={submitting || !paidCheckoutAvailable}
            />
            <span>
              <strong>Business Empowerment Challenge</strong> —{' '}
              {pricing.challengeDisplay} (women only)
            </span>
          </label>

          <label className="reg-form__option">
            <input
              type="checkbox"
              checked={values.exhibitionSelected}
              onChange={(e) => {
                updateField('exhibitionSelected', e.target.checked);
                if (!e.target.checked) {
                  updateField('exhibitionBusinessOwnerAttested', false);
                  updateField('exhibitionBusinessName', '');
                  updateField('exhibitionCategory', '');
                  updateField('exhibitionDescription', '');
                }
              }}
              disabled={submitting || !paidCheckoutAvailable}
            />
            <span>
              <strong>Business exhibition</strong> — {pricing.exhibitionDisplay}{' '}
              (business owners)
            </span>
          </label>

          {pricing.allowCombinedChallengeExhibition ? (
            <p className="reg-form__note">
              Eligible women business owners may select both challenge and exhibition
              ({pricing.combinedDisplay} total).
            </p>
          ) : (
            <p className="reg-form__note" role="status">
              Combined challenge and exhibition selection is currently disabled.
              Choose only one paid activity.
            </p>
          )}
        </div>

        {!paidCheckoutAvailable ? (
          <p className="reg-form__banner" role="status">
            Paid participation checkout is unavailable right now. Free event
            registration remains available without selecting paid activities.
          </p>
        ) : null}

        {values.challengeSelected ? (
          <div className="reg-form__conditional">
            <label className="reg-form__check">
              <input
                type="checkbox"
                checked={values.challengeWomenEligibilityAttested}
                onChange={(e) =>
                  updateField('challengeWomenEligibilityAttested', e.target.checked)
                }
                disabled={submitting}
                required
              />
              <span>
                I confirm that I am eligible to participate in the women-only Business
                Empowerment Challenge.
              </span>
            </label>
            {errors.challengeWomenEligibilityAttested ? (
              <p className="reg-form__error" role="alert">
                {errors.challengeWomenEligibilityAttested}
              </p>
            ) : null}
          </div>
        ) : null}

        {values.exhibitionSelected ? (
          <div className="reg-form__conditional reg-form__grid">
            <div className="reg-form__field reg-form__field--full">
              <label className="reg-form__check">
                <input
                  type="checkbox"
                  checked={values.exhibitionBusinessOwnerAttested}
                  onChange={(e) =>
                    updateField('exhibitionBusinessOwnerAttested', e.target.checked)
                  }
                  disabled={submitting}
                  required
                />
                <span>I confirm that I am applying as a business owner to exhibit.</span>
              </label>
              {errors.exhibitionBusinessOwnerAttested ? (
                <p className="reg-form__error" role="alert">
                  {errors.exhibitionBusinessOwnerAttested}
                </p>
              ) : null}
            </div>
            <div className="reg-form__field">
              <label htmlFor={`${formId}-exhibit-name`}>Exhibition business name</label>
              <input
                id={`${formId}-exhibit-name`}
                value={values.exhibitionBusinessName}
                onChange={(e) => updateField('exhibitionBusinessName', e.target.value)}
                disabled={submitting}
                required
              />
              {errors.exhibitionBusinessName ? (
                <p className="reg-form__error" role="alert">
                  {errors.exhibitionBusinessName}
                </p>
              ) : null}
            </div>
            <div className="reg-form__field">
              <label htmlFor={`${formId}-exhibit-cat`}>Product / service category</label>
              <input
                id={`${formId}-exhibit-cat`}
                value={values.exhibitionCategory}
                onChange={(e) => updateField('exhibitionCategory', e.target.value)}
                disabled={submitting}
                required
              />
              {errors.exhibitionCategory ? (
                <p className="reg-form__error" role="alert">
                  {errors.exhibitionCategory}
                </p>
              ) : null}
            </div>
            <div className="reg-form__field reg-form__field--full">
              <label htmlFor={`${formId}-exhibit-desc`}>
                Brief description of what you will exhibit
              </label>
              <textarea
                id={`${formId}-exhibit-desc`}
                rows={3}
                maxLength={1000}
                value={values.exhibitionDescription}
                onChange={(e) => updateField('exhibitionDescription', e.target.value)}
                disabled={submitting}
                required
              />
              {errors.exhibitionDescription ? (
                <p className="reg-form__error" role="alert">
                  {errors.exhibitionDescription}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="reg-form__totals" aria-live="polite">
          <p>
            Free registration: <strong>{pricing.generalDisplay}</strong>
          </p>
          <p>
            Challenge fee:{' '}
            <strong>
              {values.challengeSelected ? pricing.challengeDisplay : 'Not selected'}
            </strong>
          </p>
          <p>
            Exhibition fee:{' '}
            <strong>
              {values.exhibitionSelected ? pricing.exhibitionDisplay : 'Not selected'}
            </strong>
          </p>
          <p className="reg-form__total-line">
            Total due now: <strong>{formatKobo(participationTotal)}</strong>
          </p>
          <p className="reg-form__note">
            Free event registration does not purchase challenge or exhibition
            participation.
          </p>
          {combinedBlocked ? (
            <p className="reg-form__error" role="alert">
              {errors.participationSelection ||
                'Combined selection is not available. Choose one paid activity.'}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="reg-form__legal">
        <label className="reg-form__check">
          <input
            type="checkbox"
            checked={values.privacyAccepted}
            onChange={(e) => updateField('privacyAccepted', e.target.checked)}
            disabled={submitting}
            required
          />
          <span>
            I have read and accept the{' '}
            <Link to="/legal/event-privacy-notice" target="_blank" rel="noreferrer">
              event privacy notice
            </Link>
            .
          </span>
        </label>
        {errors.privacyAccepted ? (
          <p className="reg-form__error" role="alert">
            {errors.privacyAccepted}
          </p>
        ) : null}

        <label className="reg-form__check">
          <input
            type="checkbox"
            checked={values.termsAccepted}
            onChange={(e) => updateField('termsAccepted', e.target.checked)}
            disabled={submitting}
            required
          />
          <span>
            I have read and accept the{' '}
            <Link
              to="/legal/event-participation-terms"
              target="_blank"
              rel="noreferrer"
            >
              participation terms
            </Link>
            .
          </span>
        </label>
        {errors.termsAccepted ? (
          <p className="reg-form__error" role="alert">
            {errors.termsAccepted}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="reg-form__banner" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="reg-form__actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? paymentRequired
              ? 'Starting secure checkout…'
              : 'Submitting registration…'
            : paymentRequired
              ? `Register and pay ${formatKobo(participationTotal)}`
              : 'Complete free registration'}
        </button>
        <p className="reg-form__note">
          {paymentRequired
            ? 'You will be redirected to Paystack for paid participation. Event registration is saved even if payment is abandoned; paid activities are confirmed only after server-side verification.'
            : 'No payment is required for general event registration.'}
        </p>
      </div>
    </form>
  );
}
