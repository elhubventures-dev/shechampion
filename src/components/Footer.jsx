import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import logo from '../assets/logo-horizontal.png';
import {
    PRIMARY_WHATSAPP_HREF,
    SITE_CONTACTS,
    smsHref,
    telHref,
    whatsappHref,
} from '../lib/contacts';
import { EVENT_2026 } from '../lib/event2026';
import Reveal from './Reveal';
import WhatsAppIcon from './WhatsAppIcon';
import './Footer.css';

const exploreLinks = [
    { name: 'Home', path: '/' },
    { name: 'The Challenge', path: '/challenge' },
    { name: 'Challenge 2026', path: '/business-empowerment-challenge-2026' },
    { name: 'Contact', path: '/contact' },
];

const programmeLinks = [
    { name: 'Core Programmes', path: '/programs' },
    { name: 'The Network', path: '/network' },
    { name: 'Access-to-Market Seminars', path: '/seminars' },
];

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <Reveal as="div" className="footer-cta-band">
                <div className="container footer-cta-band__inner">
                    <div>
                        <p className="footer-cta-band__eyebrow">Flagship programme</p>
                        <h2 className="footer-cta-band__title">
                            Business Empowerment Challenge 2026
                        </h2>
                        <p className="footer-cta-band__text">
                            {EVENT_2026.dateDisplay} · {EVENT_2026.timeDisplay} ·{' '}
                            {EVENT_2026.locationDisplay} · Free registration · optional paid
                            activities
                        </p>
                    </div>
                    <Link to="/business-empowerment-challenge-2026" className="btn btn-light">
                        Join Challenge 2026
                        <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </div>
            </Reveal>

            <Reveal as="div" className="container footer-main">
                <div className="footer-brand">
                    <Link to="/" className="footer-logo">
                        <img
                            src={logo}
                            alt="SHE CHAMPIONS"
                            className="footer-logo__img"
                            width="1024"
                            height="364"
                            decoding="async"
                        />
                    </Link>
                    <p className="footer-brand__text">
                        A Women-Led Entrepreneurship, Market Access &amp; Investment Platform.
                        We identify, prepare, and position high-potential women-led businesses for
                        long-term growth.
                    </p>
                    <a
                        href={PRIMARY_WHATSAPP_HREF}
                        className="footer-whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <WhatsAppIcon size={18} />
                        Message us on WhatsApp
                    </a>
                </div>

                <div className="footer-col">
                    <h3>Explore</h3>
                    <ul>
                        {exploreLinks.map((link) => (
                            <li key={link.path}>
                                <Link to={link.path}>{link.name}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="footer-col">
                    <h3>Programmes</h3>
                    <ul>
                        {programmeLinks.map((link) => (
                            <li key={link.path}>
                                <Link to={link.path}>{link.name}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="footer-col footer-contact">
                    <h3>Contact</h3>
                    <ul>
                        <li>
                            <MapPin size={18} aria-hidden="true" />
                            <span>
                                Phase 2, Plot 84 Victor B.K. Cres, off Idris Garba Street, Kado,
                                Abuja 900108, FCT, Nigeria
                            </span>
                        </li>
                        {SITE_CONTACTS.map((contact) => (
                            <li key={contact.id} className="footer-contact__phone">
                                <Phone size={18} aria-hidden="true" />
                                <span className="footer-contact__phone-links">
                                    <a href={telHref(contact)}>{contact.display}</a>
                                    <span className="footer-contact__actions" aria-label={`Contact options for ${contact.display}`}>
                                        <a href={telHref(contact)}>Call</a>
                                        <a href={smsHref(contact)}>Text</a>
                                        <a
                                            href={whatsappHref(contact)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            WhatsApp
                                        </a>
                                    </span>
                                </span>
                            </li>
                        ))}
                        <li>
                            <Mail size={18} aria-hidden="true" />
                            <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>
                        </li>
                    </ul>
                </div>
            </Reveal>

            <div className="footer-bottom">
                <div className="container footer-bottom__inner">
                    <p>&copy; {year} SheChampion Network. All rights reserved.</p>
                    <div className="footer-bottom__meta">
                        <Link to="/legal/event-privacy-notice">Privacy notice</Link>
                        <Link to="/legal/event-participation-terms">Participation terms</Link>
                        <p className="footer-bottom__implementer">
                            Lead Implementer: Beyond Borders Foundation
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
