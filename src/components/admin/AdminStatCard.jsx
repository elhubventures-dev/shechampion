/**
 * @param {{
 *   value: string | number,
 *   label: string,
 *   hint?: string,
 *   onClick?: () => void,
 * }} props
 */
export default function AdminStatCard({ value, label, hint, onClick }) {
  const className = `admin-stat-card${onClick ? ' admin-stat-card--interactive' : ''}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span className="admin-stat-card__value">{value}</span>
        <span className="admin-stat-card__label">{label}</span>
        {hint ? <span className="admin-stat-card__hint">{hint}</span> : null}
      </button>
    );
  }

  return (
    <article className={className}>
      <p className="admin-stat-card__value">{value}</p>
      <p className="admin-stat-card__label">{label}</p>
      {hint ? <p className="admin-stat-card__hint">{hint}</p> : null}
    </article>
  );
}
