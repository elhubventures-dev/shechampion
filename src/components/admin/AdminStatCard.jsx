/**
 * @param {{ value: string | number, label: string, hint?: string }} props
 */
export default function AdminStatCard({ value, label, hint }) {
  return (
    <article className="admin-stat-card">
      <p className="admin-stat-card__value">{value}</p>
      <p className="admin-stat-card__label">{label}</p>
      {hint ? <p className="admin-stat-card__hint">{hint}</p> : null}
    </article>
  );
}
