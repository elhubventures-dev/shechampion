import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './RegistrationSuccessModal.css';

export default function RegistrationSuccessModal({
  publicReference,
  emailStatus,
  onClose,
}) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      if (
        previouslyFocused.current &&
        typeof previouslyFocused.current.focus === 'function'
      ) {
        previouslyFocused.current.focus();
      }
    };
  }, [onClose]);

  const emailSent = emailStatus === 'SENT';

  return createPortal(
    <div
      className="reg-success-overlay animate-fade-in"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="reg-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button
          ref={closeRef}
          type="button"
          className="reg-success-modal__close"
          onClick={onClose}
          aria-label="Close confirmation"
        >
          <X size={22} aria-hidden="true" />
        </button>

        <div className="reg-success-modal__brand">
          <img
            src="/assets/logo-horizontal.png"
            alt="SHE CHAMPIONS"
            className="reg-success-modal__logo"
            width={200}
            height={48}
          />
        </div>
        <div className="reg-success-modal__accent" aria-hidden="true" />

        <div className="reg-success-modal__body">
          <p className="reg-success-modal__eyebrow">Business Empowerment Challenge 2026</p>
          <h2 className="reg-success-modal__title" id={titleId}>
            Event registration confirmed
          </h2>
          <div id={descId}>
            <p className="reg-success-modal__lead">
              Your free event registration is confirmed. Reference:{' '}
              <strong className="reg-success-modal__ref">{publicReference}</strong>
            </p>
            <p className="reg-success-modal__note">
              This does not confirm challenge or exhibition participation. Those
              require a separate paid selection and verified payment.
            </p>
            <p className="reg-success-modal__note" role="status" aria-live="polite">
              {emailSent
                ? 'A confirmation email has been sent.'
                : 'A confirmation email could not be confirmed at this time. Keep your registration reference for your records.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary reg-success-modal__cta"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
