import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Ticket } from 'lucide-react';
import { EVENT_2026 } from '../lib/event2026';
import './ChallengePromo.css';

/**
 * Site-wide promo for Business Empowerment Challenge 2026.
 * @param {'featured' | 'banner'} [variant='banner']
 *   featured — larger treatment for the homepage
 *   banner — compact but still prominent on major pages
 */
const ChallengePromo = ({ variant = 'banner' }) => {
  const headingId = useId();

  return (
    <aside
      className={`challenge-promo challenge-promo--${variant}`}
      aria-labelledby={headingId}
    >
      <div className="container challenge-promo__inner">
        <div className="challenge-promo__copy">
          <p className="challenge-promo__eyebrow">{EVENT_2026.presentsLabel}</p>
          <h2 id={headingId} className="challenge-promo__title">
            {EVENT_2026.shortName}
          </h2>
          <p className="challenge-promo__tagline">{EVENT_2026.promoTagline}</p>

          <div className="challenge-promo__rule" aria-hidden="true" />

          <ul className="challenge-promo__facts">
            <li>
              <CalendarDays size={22} aria-hidden="true" />
              <div>
                <strong>{EVENT_2026.dateDisplay}</strong>
                <span>
                  {EVENT_2026.locationDisplay} · {EVENT_2026.format}
                </span>
              </div>
            </li>
            <li>
              <Ticket size={22} aria-hidden="true" />
              <div>
                <strong>{EVENT_2026.pricingSummary}</strong>
                <span>{EVENT_2026.grantTeaser}</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="challenge-promo__action">
          <Link to={EVENT_2026.path} className="btn btn-light challenge-promo__cta">
            Join Challenge 2026
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <p className="challenge-promo__cta-note">Register and compete for business grants</p>
        </div>
      </div>
    </aside>
  );
};

export default ChallengePromo;
