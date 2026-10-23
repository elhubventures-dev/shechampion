import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import { verifyPayment } from '../lib/eventApi';
import './EventChallenge2026.css';

const STATE_COPY = {
  checking: {
    title: 'Verifying your payment',
    body: 'Please wait while we confirm your payment with Paystack. Do not close this page.',
  },
  success: {
    title: 'Paid participation confirmed',
    body: 'Your payment was verified. Selected challenge and/or exhibition participation is now confirmed. Free event registration remains separate from paid activities.',
  },
  pending: {
    title: 'Payment pending',
    body: 'We have not yet received a successful payment confirmation. Your free event registration may already be saved; paid participation remains unconfirmed until payment succeeds.',
  },
  failed: {
    title: 'Payment not completed',
    body: 'The payment was not successful. A failed or abandoned payment does not confirm paid participation. Your free event registration remains if it was already saved.',
  },
  reversed: {
    title: 'Payment reversed',
    body: 'This payment was reversed. Paid participation is no longer confirmed. Contact SHE CHAMPIONS if you need assistance.',
  },
  unavailable: {
    title: 'Verification unavailable',
    body: 'We could not verify this payment right now. You can retry verification, or contact SHE CHAMPIONS with your payment receipt.',
  },
};

export default function PaymentResult() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [state, setState] = useState(reference ? 'checking' : 'unavailable');
  const [publicReference, setPublicReference] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function runVerify() {
    if (!reference) {
      setState('unavailable');
      setMessage('No payment reference was provided.');
      return;
    }
    setBusy(true);
    setState('checking');
    setMessage('');
    try {
      const result = await verifyPayment(reference);
      setPublicReference(result.publicReference || '');
      if (result.state === 'success') setState('success');
      else if (result.state === 'pending') setState('pending');
      else if (result.state === 'reversed') setState('reversed');
      else setState('failed');
    } catch (error) {
      setState('unavailable');
      setMessage(error.message || 'Verification unavailable.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    runVerify();
    // Intentionally once on mount for the reference in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const copy = STATE_COPY[state] || STATE_COPY.unavailable;

  return (
    <div className="event-page payment-result-page">
      <PageMeta
        title="Payment result | SHE CHAMPIONS"
        description="Payment verification result for the SHE CHAMPIONS Business Empowerment Challenge 2026."
        noIndex
      />
      <section className="py-section">
        <div className="container payment-result">
          <p className="section-eyebrow">Payment verification</p>
          <h1 className="section-title">{copy.title}</h1>
          <p className="section-lead">{copy.body}</p>
          {message ? (
            <p className="reg-form__banner" role="status">
              {message}
            </p>
          ) : null}
          {state === 'success' && publicReference ? (
            <p className="payment-result__ref" role="status">
              Your registration reference:{' '}
              <strong>{publicReference}</strong>
            </p>
          ) : null}
          <div className="cta-actions" style={{ justifyContent: 'flex-start' }}>
            {state !== 'success' && reference ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={runVerify}
                disabled={busy}
              >
                {busy ? 'Verifying…' : 'Retry verification'}
              </button>
            ) : null}
            <Link
              to="/business-empowerment-challenge-2026#participation"
              className="btn btn-outline-primary"
            >
              Back to event page
            </Link>
            <Link to="/contact" className="btn btn-outline-primary">
              Contact SHE CHAMPIONS
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
