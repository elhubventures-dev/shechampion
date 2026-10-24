import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, Menu, X } from 'lucide-react';
import logo from '../../assets/logo-horizontal.png';
import './AdminShell.css';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'registrations', label: 'Registrations', icon: Users },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
];

/**
 * @param {{
 *   email?: string,
 *   section: 'overview' | 'registrations' | 'broadcast',
 *   onSectionChange: (id: 'overview' | 'registrations' | 'broadcast') => void,
 *   title: string,
 *   subtitle?: string,
 *   actions?: import('react').ReactNode,
 *   onLogout?: () => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function AdminShell({
  email = '',
  section,
  onSectionChange,
  title,
  subtitle,
  actions,
  onLogout,
  children,
}) {
  const [navOpen, setNavOpen] = useState(false);
  const navId = useId();

  function selectSection(id) {
    onSectionChange(id);
    setNavOpen(false);
  }

  return (
    <div className={`admin-app${navOpen ? ' admin-app--nav-open' : ''}`}>
      {navOpen ? (
        <button
          type="button"
          className="admin-app__backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar__brand">
          <img src={logo} alt="SHE CHAMPIONS" className="admin-sidebar__logo" width={160} height={40} />
          <p className="admin-sidebar__product">Event admin</p>
        </div>

        <nav className="admin-sidebar__nav" id={navId}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                className={`admin-sidebar__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => selectSection(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          {email ? (
            <p className="admin-sidebar__user" title={email}>
              {email}
            </p>
          ) : null}
          {onLogout ? (
            <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
              Sign out
            </button>
          ) : null}
          <Link to="/business-empowerment-challenge-2026" className="admin-sidebar__public">
            Public event page
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__lead">
            <button
              type="button"
              className="admin-topbar__menu"
              aria-expanded={navOpen}
              aria-controls={navId}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              <span className="visually-hidden">Menu</span>
            </button>
            <div>
              <h1 className="admin-topbar__title">{title}</h1>
              {subtitle ? <p className="admin-topbar__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="admin-topbar__actions">{actions}</div> : null}
        </header>

        <div className="admin-main__body">{children}</div>
      </div>
    </div>
  );
}
