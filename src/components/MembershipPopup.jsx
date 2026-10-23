import { useState, useEffect, useId } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import { submitMembershipInterest } from '../lib/eventApi';
import './MembershipPopup.css';

const MembershipPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    // idle | loading | sent | error
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const titleId = useId();
    const descId = useId();
    const emailId = useId();

    useEffect(() => {
        const hasSeenPopup = sessionStorage.getItem('shechampion_popup_seen');

        if (!hasSeenPopup) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('shechampion_popup_seen', 'true');
        setStatus('idle');
        setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'loading') return;

        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setStatus('error');
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            await submitMembershipInterest({
                name: 'Prospective Member',
                email: trimmed,
                website,
            });
            setStatus('sent');
            setEmail('');
            setTimeout(() => {
                handleClose();
            }, 4000);
        } catch (err) {
            setStatus('error');
            setErrorMessage(
                err.message ||
                    'We could not submit your request. Please try again or email info@shechampion-bbf.org.'
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="popup-overlay animate-fade-in">
            <div
                className="popup-container"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
            >
                <button type="button" className="popup-close" onClick={handleClose} aria-label="Close membership dialog">
                    <X size={24} aria-hidden="true" />
                </button>

                <div className="popup-content">
                    <div className="popup-icon-wrapper" aria-hidden="true">
                        <Mail size={32} className="text-secondary" />
                    </div>
                    <h3 className="popup-title" id={titleId}>Join the Network</h3>
                    <p className="popup-desc" id={descId}>
                        Enter your email to join the SheChampions Membership and get access to exclusive opportunities.
                    </p>

                    {status === 'sent' ? (
                        <div className="popup-success animate-fade-in" role="status" aria-live="polite">
                            <CheckCircle size={48} className="success-icon" aria-hidden="true" />
                            <h4>Request received</h4>
                            <p>
                                Thank you. A confirmation email is sent when delivery succeeds.
                                If you do not hear from us, email info@shechampion-bbf.org.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="popup-form" noValidate>
                            <label htmlFor={emailId} className="visually-hidden">
                                Email address
                            </label>
                            <input
                                id={emailId}
                                type="email"
                                name="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (status === 'error') {
                                        setStatus('idle');
                                        setErrorMessage('');
                                    }
                                }}
                                required
                                autoComplete="email"
                                className="popup-input"
                                disabled={status === 'loading'}
                            />
                            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
                                <label htmlFor="membership-website">Website</label>
                                <input
                                    id="membership-website"
                                    type="text"
                                    name="website"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary popup-btn"
                                disabled={status === 'loading'}
                                aria-busy={status === 'loading'}
                            >
                                {status === 'loading' ? 'Submitting...' : 'Join Now'}
                            </button>
                            <div role="status" aria-live="polite" aria-atomic="true">
                                {status === 'error' && errorMessage && (
                                    <p className="error-text">{errorMessage}</p>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MembershipPopup;
