import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  APPLICANT_CATEGORY_OPTIONS,
  NIGERIA_STATES,
} from '../data/nigeriaStates';
import { submitRegistration } from '../lib/eventApi';

const INITIAL = {
  fullName: '',
  email: '',
  phone: '',
  stateOfResidence: '',
  applicantCategory: '',
  businessName: '',
  briefDescription: '',
  privacyAccepted: false,
  termsAccepted: false,
};

function validateClient(values) {
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
    errors.briefDescription = 'Describe your business, skill, or idea (at least 10 characters).';
  }
  if (!values.privacyAccepted) {
    errors.privacyAccepted = 'Accept the privacy notice to continue.';
  }
  if (!values.termsAccepted) {
    errors.termsAccepted = 'Accept the participation terms to continue.';
  }
  return errors;
}

export default function RegistrationForm({ registrationOpen }) {
  const formId = useId();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );

  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || !registrationOpen) return;

    const nextErrors = validateClient(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

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

      setFormError('Payment could not be started. Please try again shortly.');
    } catch (error) {
      if (error.details && typeof error.details === 'object') {
        setErrors(error.details);
      }
      setFormError(error.message || 'Unable to submit registration.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!registrationOpen) {
    return null;
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
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
            aria-describedby={
              errors.stateOfResidence ? `${formId}-state-err` : undefined
            }
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
            <p className="reg-form__error" id={`${formId}-state-err`} role="alert">
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
            aria-describedby={
              errors.applicantCategory ? `${formId}-category-err` : undefined
            }
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
            <p className="reg-form__error" id={`${formId}-category-err`} role="alert">
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
          {errors.businessName ? (
            <p className="reg-form__error" role="alert">
              {errors.businessName}
            </p>
          ) : null}
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
            aria-describedby={
              errors.briefDescription ? `${formId}-description-err` : undefined
            }
            disabled={submitting}
            required
          />
          {errors.briefDescription ? (
            <p
              className="reg-form__error"
              id={`${formId}-description-err`}
              role="alert"
            >
              {errors.briefDescription}
            </p>
          ) : null}
        </div>
      </div>

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
          {submitting ? 'Starting secure checkout…' : 'Pay ₦5,000 and register'}
        </button>
        <p className="reg-form__note">
          You will be redirected to Paystack&apos;s hosted checkout. Registration is
          confirmed only after payment is verified by the server.
        </p>
      </div>
    </form>
  );
}
