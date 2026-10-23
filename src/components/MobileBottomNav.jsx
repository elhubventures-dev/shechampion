import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Home, Mail, Ticket, Trophy } from 'lucide-react';
import { EVENT_2026 } from '../lib/event2026';
import './MobileBottomNav.css';

const sideLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Challenge', path: '/challenge', icon: Trophy },
  { name: 'Programs', path: '/programs', icon: Briefcase },
  { name: 'Contact', path: '/contact', icon: Mail },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const eventActive = location.pathname === EVENT_2026.path;

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const left = sideLinks.slice(0, 2);
  const right = sideLinks.slice(2);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile primary">
      <div className="mobile-bottom-nav__inner">
        {left.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-bottom-nav__item${isActive(item.path) ? ' is-active' : ''}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" strokeWidth={2.1} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <Link
          to={EVENT_2026.path}
          className={`mobile-bottom-nav__center${eventActive ? ' is-active' : ''}`}
          aria-label={`${EVENT_2026.shortName} — register`}
          aria-current={eventActive ? 'page' : undefined}
        >
          <span className="mobile-bottom-nav__center-disc" aria-hidden="true">
            <span className="mobile-bottom-nav__center-ring" />
            <span className="mobile-bottom-nav__center-icon">
              <Ticket size={22} strokeWidth={2.25} />
            </span>
          </span>
          <span className="mobile-bottom-nav__center-label">2026</span>
        </Link>

        {right.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-bottom-nav__item${isActive(item.path) ? ' is-active' : ''}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" strokeWidth={2.1} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
