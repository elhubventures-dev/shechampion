import { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import Reveal from '../components/Reveal';
import { submitToAppsScript } from '../lib/submitToAppsScript';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    // idle | loading | sent | error
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (status === 'error') {
            setStatus('idle');
            setErrorMessage('');
        }
    };

    const validate = () => {
        if (!formData.name.trim()) {
            return 'Please enter your full name.';
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            return 'Please enter a valid email address.';
        }
        if (!formData.message.trim()) {
            return 'Please enter a message.';
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'loading') return;

        const validationError = validate();
        if (validationError) {
            setStatus('error');
            setErrorMessage(validationError);
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        const result = await submitToAppsScript({
            name: formData.name.trim(),
            email: formData.email.trim(),
            subject: formData.subject.trim() || 'New Message from SheChampion Website',
            message: formData.message.trim(),
            type: 'Contact Form',
        });

        if (result === 'sent') {
            setStatus('sent');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } else {
            setStatus('error');
            setErrorMessage(
                'We could not send your message from this browser. Please try again or email info@shechampion-bbf.org.'
            );
        }
    };

    return (
        <div className="contact-page page-shell animate-fade-in">
            <PageMeta
                title="Contact"
                description="Contact SHE CHAMPIONS in Abuja: phone (+234) 703 631 6083, email info@shechampion-bbf.org, or send a message through the website form."
            />

            <Hero
                title="Get in touch"
                subtitle="Reach out with questions, partnership inquiries, or feedback. We welcome women entrepreneurs, partners, and institutional stakeholders."
                secondary={true}
            />

            <Reveal>
                <ChallengePromo />
            </Reveal>

            <Reveal as="section" className="py-section contact-section" aria-labelledby="contact-heading">
                <div className="container">
                    <div className="contact-grid">
                        <aside className="contact-info" aria-labelledby="contact-heading">
                            <p className="section-eyebrow">Details</p>
                            <h2 className="contact-info-title" id="contact-heading">
                                Contact information
                            </h2>
                            <p className="contact-info-lead">
                                Complete the form and our team will aim to respond within 24 hours. You can also
                                reach us directly using the details below.
                            </p>

                            <ul className="contact-details">
                                <li>
                                    <Phone className="info-icon" aria-hidden="true" />
                                    <div>
                                        <h3>Phone</h3>
                                        <a href="tel:+2347036316083">(+234) 703 631 6083</a>
                                    </div>
                                </li>
                                <li>
                                    <Mail className="info-icon" aria-hidden="true" />
                                    <div>
                                        <h3>Email</h3>
                                        <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>
                                    </div>
                                </li>
                                <li>
                                    <MapPin className="info-icon" aria-hidden="true" />
                                    <div>
                                        <h3>Location</h3>
                                        <p>
                                            Phase 2, Plot 84 Victor B.K. Cres, off Idris Garba Street, Kado, Abuja
                                            900108, FCT, Nigeria
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </aside>

                        <div className="contact-form-container">
                            {status === 'sent' ? (
                                <div
                                    className="success-message animate-fade-in"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <CheckCircle size={48} className="success-icon" aria-hidden="true" />
                                    <h3>Message submitted</h3>
                                    <p>
                                        Your message was submitted from this page. Because of how our form service
                                        works, we cannot confirm delivery here. If you do not hear from us within 24
                                        hours, please email{' '}
                                        <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => setStatus('idle')}
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                                    <h3>Send us a message</h3>
                                    <p className="form-help">
                                        Fields marked required must be completed before submission.
                                    </p>

                                    <div className="form-group">
                                        <label htmlFor="name">
                                            Full name <span className="required-mark">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            autoComplete="name"
                                            placeholder="Jane Doe"
                                            disabled={status === 'loading'}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">
                                            Email address <span className="required-mark">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            autoComplete="email"
                                            placeholder="jane@example.com"
                                            disabled={status === 'loading'}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="subject">Subject</label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="Partnership inquiry"
                                            disabled={status === 'loading'}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">
                                            Message <span className="required-mark">*</span>
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            rows="5"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            placeholder="How can we help you?"
                                            disabled={status === 'loading'}
                                        />
                                    </div>

                                    <div className="form-status" role="status" aria-live="polite" aria-atomic="true">
                                        {status === 'error' && errorMessage && (
                                            <p className="error-text">{errorMessage}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary submit-btn"
                                        disabled={status === 'loading'}
                                        aria-busy={status === 'loading'}
                                    >
                                        {status === 'loading' ? (
                                            'Sending...'
                                        ) : (
                                            <>
                                                Send message <Send size={18} aria-hidden="true" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

export default Contact;
