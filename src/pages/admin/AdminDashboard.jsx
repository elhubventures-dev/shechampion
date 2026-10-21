import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/PageMeta';
import {
  adminExportCsv,
  adminGetRegistration,
  adminListRegistrations,
  adminLogout,
  adminMe,
  adminRetryEmail,
  adminUpdateRegistration,
} from '../../lib/eventApi';
import './admin.css';

const APP_STATUSES = [
  'PENDING_PAYMENT',
  'REGISTERED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'WITHDRAWN',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    q: '',
    paymentStatus: '',
    applicationStatus: '',
    from: '',
    to: '',
  });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  const loadList = useCallback(
    async (pageOverride) => {
      setError('');
      const data = await adminListRegistrations({
        ...filters,
        page: pageOverride ?? page,
        pageSize: 25,
      });
      setSummary(data.summary);
      setRows(data.registrations || []);
      setTotal(data.total || 0);
    },
    [filters, page]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await adminMe();
        if (cancelled) return;
        setEmail(me.email);
        await loadList();
      } catch {
        if (!cancelled) navigate('/admin/login', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList, navigate]);

  async function openDetail(id) {
    setSelectedId(id);
    setDetailBusy(true);
    setError('');
    try {
      const data = await adminGetRegistration(id);
      setDetail(data);
      setStatusDraft(data.registration.application_status);
      setNotesDraft(data.registration.admin_notes || '');
    } catch (err) {
      setError(err.message || 'Unable to load detail.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function saveDetail(event) {
    event.preventDefault();
    if (!selectedId) return;
    setDetailBusy(true);
    try {
      await adminUpdateRegistration(selectedId, {
        applicationStatus: statusDraft,
        adminNotes: notesDraft,
      });
      await openDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function retryEmail() {
    if (!selectedId) return;
    setDetailBusy(true);
    try {
      const result = await adminRetryEmail(selectedId);
      if (!result.sent) {
        setError(
          result.reason === 'send_failed'
            ? 'Email provider did not confirm delivery. Status remains failed/pending.'
            : 'Confirmation email was not sent.'
        );
      } else {
        setError('');
      }
      await openDetail(selectedId);
    } catch (err) {
      setError(err.message || 'Retry failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function handleLogout() {
    await adminLogout();
    navigate('/admin/login', { replace: true });
  }

  async function handleExport() {
    setError('');
    try {
      const blob = await adminExportCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'she-champions-registrations.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Export failed.');
    }
  }

  if (loading) {
    return (
      <div className="admin-shell">
        <p className="admin-muted">Loading…</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="admin-shell">
      <PageMeta
        title="Event registrations admin"
        description="SHE CHAMPIONS event registrations administration."
        noIndex
      />
      <header className="admin-top">
        <div>
          <p className="admin-eyebrow">SHE CHAMPIONS</p>
          <h1>Event registrations</h1>
          <p className="admin-muted">Signed in as {email}</p>
        </div>
        <div className="admin-top__actions">
          <button type="button" className="btn btn-outline-primary" onClick={handleExport}>
            Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      {summary ? (
        <div className="admin-stats" aria-label="Registration summary">
          <div>
            <strong>{summary.total_applications}</strong>
            <span>Total applications</span>
          </div>
          <div>
            <strong>{summary.paid_registrations}</strong>
            <span>Paid registrations</span>
          </div>
          <div>
            <strong>{summary.pending_payments}</strong>
            <span>Pending payments</span>
          </div>
          <div>
            <strong>{summary.failed_or_reversed}</strong>
            <span>Failed / reversed</span>
          </div>
          <div>
            <strong>{summary.shortlisted}</strong>
            <span>Shortlisted</span>
          </div>
        </div>
      ) : null}

      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          loadList(1).catch((err) => setError(err.message));
        }}
      >
        <label>
          Search
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Reference or name"
          />
        </label>
        <label>
          Payment status
          <select
            value={filters.paymentStatus}
            onChange={(e) =>
              setFilters((f) => ({ ...f, paymentStatus: e.target.value }))
            }
          >
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="REVERSED">REVERSED</option>
            <option value="INITIALIZATION_FAILED">INITIALIZATION_FAILED</option>
          </select>
        </label>
        <label>
          Application status
          <select
            value={filters.applicationStatus}
            onChange={(e) =>
              setFilters((f) => ({ ...f, applicationStatus: e.target.value }))
            }
          >
            <option value="">All</option>
            {APP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Apply filters
        </button>
      </form>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-layout">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Name</th>
                <th>Payment</th>
                <th>Application</th>
                <th>Email status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-linkish"
                      onClick={() => openDetail(row.id)}
                    >
                      {row.public_reference}
                    </button>
                  </td>
                  <td>{row.full_name}</td>
                  <td>
                    <span className={`pill pill--${row.payment_status}`}>
                      {row.payment_status}
                    </span>
                  </td>
                  <td>{row.application_status}</td>
                  <td>{row.confirmation_email_status || '—'}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6}>No registrations match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="admin-pager">
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <aside className="admin-detail" aria-live="polite">
          {!selectedId ? (
            <p className="admin-muted">Select a registration to view details.</p>
          ) : detailBusy && !detail ? (
            <p className="admin-muted">Loading detail…</p>
          ) : detail ? (
            <>
              <h2>{detail.registration.public_reference}</h2>
              <dl className="admin-dl">
                <div>
                  <dt>Name</dt>
                  <dd>{detail.registration.full_name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{detail.registration.email_normalized}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{detail.registration.phone}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{detail.registration.state_of_residence}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{detail.registration.applicant_category}</dd>
                </div>
                <div>
                  <dt>Business</dt>
                  <dd>{detail.registration.business_name || '—'}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{detail.registration.brief_description}</dd>
                </div>
                <div>
                  <dt>Payment status</dt>
                  <dd>{detail.registration.payment_status}</dd>
                </div>
              </dl>

              <h3>Payments (read-only)</h3>
              <ul className="admin-list">
                {(detail.payments || []).map((p) => (
                  <li key={p.id}>
                    {p.payment_reference} — {p.status} — {p.amount_kobo}{' '}
                    {p.currency} ({p.payment_mode})
                  </li>
                ))}
              </ul>

              <h3>Confirmation email</h3>
              <ul className="admin-list">
                {(detail.emails || []).map((e) => (
                  <li key={e.id}>
                    {e.status}
                    {e.provider_message_id ? ` · id ${e.provider_message_id}` : ''}
                    {e.last_error ? ` · ${e.last_error}` : ''}
                    {` · attempts ${e.attempts}`}
                  </li>
                ))}
                {!detail.emails?.length ? <li>No email attempts yet.</li> : null}
              </ul>
              {detail.registration.payment_status === 'SUCCESS' ? (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={retryEmail}
                  disabled={detailBusy}
                >
                  Retry confirmation email
                </button>
              ) : null}

              <form className="admin-detail__form" onSubmit={saveDetail}>
                <label>
                  Application status
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    disabled={detailBusy}
                  >
                    {APP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Administrative notes (not shown to applicants)
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    disabled={detailBusy}
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={detailBusy}>
                  Save assessment update
                </button>
              </form>
            </>
          ) : null}
          <p className="admin-muted">
            <Link to="/business-empowerment-challenge-2026">View public event page</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
