import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logo from '../assets/logo-white.png';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-section brand-section">
                    <Link to="/" className="footer-logo">
                        <img
                            src={logo}
                            alt="SHE CHAMPIONS"
                            className="footer-logo-img"
                            width="180"
                            height="50"
                        />
                    </Link>
                    <p className="footer-description">
                        A Women-Led Entrepreneurship, Market Access & Investment Platform. Identifying,
                        preparing, and elevating women entrepreneurs through structured support.
                    </p>
                </div>

                <div className="footer-section links-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/challenge">The Challenge</Link></li>
                        <li><Link to="/programs">Programs</Link></li>
                        <li><Link to="/network">The Network</Link></li>
                        <li><Link to="/seminars">Seminars</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                    </ul>
                </div>

                <div className="footer-section contact-section">
                    <h3>Contact Us</h3>
                    <ul>
                        <li>
                            <MapPin size={18} className="icon" aria-hidden="true" />
                            <span>
                                Phase 2, Plot 84 Victor B.K. Cres, off Idris Garba Street, Kado, Abuja 900108,
                                FCT, Nigeria
                            </span>
                        </li>
                        <li>
                            <Phone size={18} className="icon" aria-hidden="true" />
                            <a href="tel:+2347036316083">(+234) 703 631 6083</a>
                        </li>
                        <li>
                            <Mail size={18} className="icon" aria-hidden="true" />
                            <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container footer-bottom-inner">
                    <p>&copy; {new Date().getFullYear()} SheChampion Network. All rights reserved.</p>
                    <p className="implementer">Lead Implementer: Beyond Borders Foundation</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
