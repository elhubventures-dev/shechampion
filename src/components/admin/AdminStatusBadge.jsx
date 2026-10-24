const TONE_BY_STATUS = {
  SUCCESS: 'success',
  NOT_REQUIRED: 'neutral',
  REGISTERED: 'success',
  CONFIRMED: 'success',
  SHORTLISTED: 'success',
  PENDING: 'warning',
  PENDING_PAYMENT: 'warning',
  UNDER_REVIEW: 'warning',
  INITIALIZATION_FAILED: 'warning',
  FAILED: 'danger',
  REVERSED: 'danger',
  NOT_SHORTLISTED: 'danger',
  WITHDRAWN: 'danger',
  CANCELLED: 'danger',
  SENT: 'success',
};

/**
 * @param {{ status?: string | null, kind?: 'payment' | 'application' | 'email' | 'generic' }} props
 */
export default function AdminStatusBadge({ status, kind = 'generic' }) {
  if (!status) {
    return <span className="admin-badge admin-badge--neutral">—</span>;
  }
  const tone = TONE_BY_STATUS[status] || (kind === 'payment' ? 'neutral' : 'neutral');
  return (
    <span className={`admin-badge admin-badge--${tone}`} title={status}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
