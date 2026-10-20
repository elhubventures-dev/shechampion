import { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react';
import Hero from '../components/Hero';
import { submitToAppsScript } from '../lib/submitToAppsScript';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    // idle | loading | sent | error
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
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
            type: 'Contact Form'
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
        <div className="contact-page animate-fade-in">
            <Hero
                title="Get in Touch"
                subtitle="We'd love to hear from you. Reach out with any questions, partnership inquiries, or feedback."
                secondary={true}
            />

            <section className="py-section contact-section">
                <div className="container">
                    <div className="contact-grid">
                        {/* Contact Information */}
                        <div className="contact-info glass-dark bg-primary text-light">
                            <h2 className="text-white mb-4">Contact Information</h2>
                            <p className="mb-8 opacity-90">
                                Fill up the form and our team will get back to you within 24 hours.
                            </p>

                            <div className="info-item">
                                <Phone className="info-icon" aria-hidden="true" />
                                <div>
                                    <h4>Phone</h4>
                                    <p>
                                        <a href="tel:+2347036316083">(+234) 703 631 6083</a>
                                    </p>
                                </div>
                            </div>

                            <div className="info-item">
                                <Mail className="info-icon" aria-hidden="true" />
                                <div>
                                    <h4>Email</h4>
                                    <p>
                                        <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>
                                    </p>
                                </div>
                            </div>

                            <div className="info-item">
                                <MapPin className="info-icon" aria-hidden="true" />
                                <div>
                                    <h4>Location</h4>
                                    <p>Phase 2, Plot 84 Victor B.K. Cres, off Idris Garba Street,Kado, Abuja 900108, FCT, Nigeria</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="contact-form-container">
                            {status === 'sent' ? (
                                <div
                                    className="success-message text-center animate-fade-in"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <CheckCircle size={64} className="text-secondary mx-auto mb-4" aria-hidden="true" />
                                    <h3 className="text-primary mb-2">Message submitted</h3>
                                    <p className="text-dark">
                                        Your message was submitted from this page. Because of how our form service
                                        works, we cannot confirm delivery here. If you do not hear from us within
                                        24 hours, please email{' '}
                                        <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary mt-6"
                                        onClick={() => setStatus('idle')}
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                                    <h3 className="text-primary mb-6">Send us a Message</h3>

                                    <div className="form-group">
                                        <label htmlFor="name">Full Name</label>
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
                                        <label htmlFor="email">Email Address</label>
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
                                            placeholder="Partnership Inquiry"
                                            disabled={status === 'loading'}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">Message</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            rows="5"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            placeholder="How can we help you?"
                                            disabled={status === 'loading'}
                                        ></textarea>
                                    </div>

                                    <div
                                        className="form-status"
                                        role="status"
                                        aria-live="polite"
                                        aria-atomic="true"
                                    >
                                        {status === 'error' && errorMessage && (
                                            <p className="error-text mb-4">{errorMessage}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary submit-btn"
                                        disabled={status === 'loading'}
                                        aria-busy={status === 'loading'}
                                    >
                                        {status === 'loading' ? 'Sending...' : (
                                            <>Send Message <Send size={18} className="ml-2" aria-hidden="true" /></>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
