import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo-horizontal.png';
import './Header.css';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const [menuPathname, setMenuPathname] = useState(location.pathname);

    // Close the mobile menu when the route changes (including browser back/forward).
    if (location.pathname !== menuPathname) {
        setMenuPathname(location.pathname);
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    }

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 16);
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

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'The Challenge', path: '/challenge' },
        { name: 'Programs', path: '/programs' },
        { name: 'The Network', path: '/network' },
        { name: 'Seminars', path: '/seminars' },
        { name: 'Contact', path: '/contact' },
    ];

    const headerClass = [
        'header',
        isScrolled || isMobileMenuOpen ? 'header-scrolled' : '',
        location.pathname === '/' ? 'header-home' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <header className={headerClass}>
            <div className="container header-container">
                <Link to="/" className="logo-container" onClick={closeMobileMenu}>
                    <img src={logo} alt="SHE CHAMPIONS" className="logo-img" width="200" height="60" />
                </Link>

                <nav className="desktop-nav" aria-label="Primary">
                    <ul>
                        {navLinks.map((link) => (
                            <li key={link.path}>
                                <Link
                                    to={link.path}
                                    className={location.pathname === link.path ? 'active' : undefined}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <Link to="/network" className="membership-btn">
                        Membership
                    </Link>
                </nav>

                <button
                    type="button"
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen((open) => !open)}
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-navigation"
                >
                    {isMobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="mobile-nav" id="mobile-navigation">
                    <nav aria-label="Mobile primary">
                        <ul>
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={location.pathname === link.path ? 'active' : undefined}
                                        onClick={closeMobileMenu}
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link
                                    to="/network"
                                    className="membership-btn-mobile"
                                    onClick={closeMobileMenu}
                                >
                                    Membership
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
