import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Menu, Phone, X } from 'lucide-react';
import logo from '../assets/logo-horizontal.png';
import {
    PRIMARY_WHATSAPP_HREF,
    SITE_CONTACTS,
    telHref,
} from '../lib/contacts';
import WhatsAppIcon from './WhatsAppIcon';
import './Header.css';

const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'The Challenge', path: '/challenge' },
    { name: 'Programs', path: '/programs' },
    { name: 'The Network', path: '/network' },
    { name: 'Seminars', path: '/seminars' },
    { name: 'Contact', path: '/contact' },
];

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const [menuPathname, setMenuPathname] = useState(location.pathname);

    if (location.pathname !== menuPathname) {
        setMenuPathname(location.pathname);
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    }

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 12);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const isActive = (path) =>
        path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(`${path}/`);

    const headerClass = [
        'site-header',
        isScrolled ? 'site-header--scrolled' : '',
        isMobileMenuOpen ? 'site-header--menu-open' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <header className={headerClass}>
            <div className="header-utility">
                <div className="container header-utility__inner">
                    <p className="header-utility__tagline">
                        Women-Led Entrepreneurship · Market Access · Investment
                    </p>
                    <ul className="header-utility__contacts">
                        {SITE_CONTACTS.map((contact) => (
                            <li key={contact.id}>
                                <a href={telHref(contact)}>
                                    <Phone size={14} aria-hidden="true" />
                                    {contact.display}
                                </a>
                            </li>
                        ))}
                        <li className="header-utility__email">
                            <a href="mailto:info@shechampion-bbf.org">
                                <Mail size={14} aria-hidden="true" />
                                info@shechampion-bbf.org
                            </a>
                        </li>
                        <li className="header-utility__whatsapp">
                            <a
                                href={PRIMARY_WHATSAPP_HREF}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <WhatsAppIcon size={14} />
                                WhatsApp
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="header-main">
                <div className="container header-main__inner">
                    <Link to="/" className="header-logo" onClick={closeMobileMenu}>
                        <img
                            src={logo}
                            alt="SHE CHAMPIONS"
                            className="header-logo__img"
                            width="1024"
                            height="364"
                            decoding="async"
                        />
                    </Link>

                    <nav className="header-nav" aria-label="Primary">
                        <ul>
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={isActive(link.path) ? 'is-active' : undefined}
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/business-empowerment-challenge-2026"
                            className="header-cta"
                        >
                            Challenge 2026
                        </Link>
                    </nav>

                    <button
                        type="button"
                        className="header-menu-btn"
                        onClick={() => setIsMobileMenuOpen((open) => !open)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-navigation"
                    >
                        {isMobileMenuOpen ? (
                            <X size={22} aria-hidden="true" />
                        ) : (
                            <Menu size={22} aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="header-drawer" id="mobile-navigation">
                    <nav aria-label="Mobile primary">
                        <ul>
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={isActive(link.path) ? 'is-active' : undefined}
                                        onClick={closeMobileMenu}
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div className="header-drawer__actions">
                            <Link
                                to="/business-empowerment-challenge-2026"
                                className="header-cta header-cta--block"
                                onClick={closeMobileMenu}
                            >
                                Challenge 2026
                            </Link>
                            <a
                                href={PRIMARY_WHATSAPP_HREF}
                                className="header-drawer__secondary"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMobileMenu}
                            >
                                <WhatsAppIcon size={16} />
                                Chat on WhatsApp
                            </a>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
