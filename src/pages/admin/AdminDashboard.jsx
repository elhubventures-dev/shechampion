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

const PAYMENT_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REVERSED',
  'INITIALIZATION_FAILED',
];

function formatKobo(kobo) {
  if (kobo === null || kobo === undefined) return '—';
  if (Number(kobo) === 0) return 'Free (₦0)';
  return `₦${(Number(kobo) / 100).toLocaleString('en-NG')}`;
}

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
    participation: '',
    challengeEligible: '',
    exhibitionCategory: '',
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
      setStatusDraft(
        data.registration.challenge_status &&
          ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED', 'CONFIRMED'].includes(
            data.registration.challenge_status
          )
          ? data.registration.challenge_status === 'CONFIRMED'
            ? 'REGISTERED'
            : data.registration.challenge_status
          : data.registration.application_status
      );
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
  const reg = detail?.registration;

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
            <strong>{summary.free_event_registrations}</strong>
            <span>Free event only</span>
          </div>
          <div>
            <strong>{summary.challenge_applicants}</strong>
            <span>Challenge applicants</span>
          </div>
          <div>
            <strong>{summary.confirmed_challenge_participants}</strong>
            <span>Confirmed challenge</span>
          </div>
          <div>
            <strong>{summary.exhibition_applicants}</strong>
            <span>Exhibition applicants</span>
          </div>
          <div>
            <strong>{summary.confirmed_exhibitors}</strong>
            <span>Confirmed exhibitors</span>
          </div>
          <div>
            <strong>{summary.both_activities}</strong>
            <span>Both activities</span>
          </div>
          <div>
            <strong>{summary.pending_payments}</strong>
            <span>Pending payments</span>
          </div>
          <div>
            <strong>{summary.verified_payments ?? summary.paid_registrations}</strong>
            <span>Verified payments</span>
          </div>
          <div>
            <strong>{summary.failed_or_reversed}</strong>
            <span>Failed / reversed</span>
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
          Participation
          <select
            value={filters.participation}
            onChange={(e) =>
              setFilters((f) => ({ ...f, participation: e.target.value }))
            }
          >
            <option value="">All</option>
            <option value="free">Free only</option>
            <option value="challenge">Challenge only</option>
            <option value="exhibition">Exhibition only</option>
            <option value="both">Challenge + exhibition</option>
          </select>
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
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
          Challenge eligibility
          <select
            value={filters.challengeEligible}
            onChange={(e) =>
              setFilters((f) => ({ ...f, challengeEligible: e.target.value }))
            }
          >
            <option value="">All</option>
            <option value="true">Attested</option>
            <option value="false">Not attested</option>
          </select>
        </label>
        <label>
          Exhibition category
          <input
            value={filters.exhibitionCategory}
            onChange={(e) =>
              setFilters((f) => ({ ...f, exhibitionCategory: e.target.value }))
            }
            placeholder="Category contains…"
          />
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
                <th>Participation</th>
                <th>Payment</th>
                <th>Challenge</th>
                <th>Exhibition</th>
                <th>Email</th>
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
                    {[
                      row.challenge_selected ? 'Challenge' : null,
                      row.exhibition_selected ? 'Exhibition' : null,
                    ]
                      .filter(Boolean)
                      .join(' + ') || 'Free only'}
                  </td>
                  <td>
                    <span className={`pill pill--${row.payment_status}`}>
                      {row.payment_status}
                    </span>
                  </td>
                  <td>{row.challenge_status || '—'}</td>
                  <td>{row.exhibition_status || '—'}</td>
                  <td>{row.confirmation_email_status || '—'}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8}>No registrations match these filters.</td>
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
          ) : reg ? (
            <>
              <h2>{reg.public_reference}</h2>
              <dl className="admin-dl">
                <div>
                  <dt>Name</dt>
                  <dd>{reg.full_name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{reg.email_normalized}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{reg.phone}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{reg.state_of_residence}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{reg.applicant_category}</dd>
                </div>
                <div>
                  <dt>Event registration</dt>
                  <dd>{reg.event_registration_status || '—'}</dd>
                </div>
                <div>
                  <dt>Selected activities</dt>
                  <dd>
                    {[
                      reg.challenge_selected ? 'Challenge' : null,
                      reg.exhibition_selected ? 'Exhibition' : null,
                    ]
                      .filter(Boolean)
                      .join(' + ') || 'None (free event only)'}
                  </dd>
                </div>
                <div>
                  <dt>Expected amount</dt>
                  <dd>
                    {formatKobo(reg.expected_amount_kobo)} {reg.currency || ''}
                  </dd>
                </div>
                <div>
                  <dt>Challenge status</dt>
                  <dd>{reg.challenge_status || '—'}</dd>
                </div>
                <div>
                  <dt>Exhibition status</dt>
                  <dd>{reg.exhibition_status || '—'}</dd>
                </div>
                <div>
                  <dt>Challenge eligibility attested</dt>
                  <dd>
                    {reg.challenge_women_eligibility_attested ? 'Yes' : 'No'}
                    {reg.challenge_eligibility_attested_at
                      ? ` · ${new Date(reg.challenge_eligibility_attested_at).toLocaleString()}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Exhibition owner attested</dt>
                  <dd>
                    {reg.exhibition_business_owner_attested ? 'Yes' : 'No'}
                    {reg.exhibition_owner_attested_at
                      ? ` · ${new Date(reg.exhibition_owner_attested_at).toLocaleString()}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Exhibition business</dt>
                  <dd>{reg.exhibition_business_name || '—'}</dd>
                </div>
                <div>
                  <dt>Exhibition category</dt>
                  <dd>{reg.exhibition_category || '—'}</dd>
                </div>
                <div>
                  <dt>Exhibition description</dt>
                  <dd>{reg.exhibition_description || '—'}</dd>
                </div>
                <div>
                  <dt>Payment status</dt>
                  <dd>{reg.payment_status}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{reg.brief_description}</dd>
                </div>
              </dl>

              <h3>Payments (read-only)</h3>
              <ul className="admin-list">
                {(detail.payments || []).map((p) => (
                  <li key={p.id}>
                    {p.payment_reference} — {p.status} — {formatKobo(p.amount_kobo)}{' '}
                    {p.currency} ({p.payment_mode})
                    {p.verified_at
                      ? ` · verified ${new Date(p.verified_at).toLocaleString()}`
                      : ''}
                  </li>
                ))}
                {!detail.payments?.length ? <li>No payment transactions.</li> : null}
              </ul>

              <h3>Emails</h3>
              <ul className="admin-list">
                {(detail.emails || []).map((e) => (
                  <li key={e.id}>
                    {e.email_type} — {e.status}
                    {e.provider_message_id ? ` · id ${e.provider_message_id}` : ''}
                    {e.last_error ? ` · ${e.last_error}` : ''}
                    {` · attempts ${e.attempts}`}
                  </li>
                ))}
                {!detail.emails?.length ? <li>No email attempts yet.</li> : null}
              </ul>
              {reg.payment_status === 'SUCCESS' ||
              reg.payment_status === 'NOT_REQUIRED' ? (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={retryEmail}
                  disabled={detailBusy}
                >
                  Retry confirmation email
                </button>
              ) : null}

              {detail.audit?.length ? (
                <>
                  <h3>Audit history</h3>
                  <ul className="admin-list">
                    {detail.audit.map((a) => (
                      <li key={a.id}>
                        {new Date(a.created_at).toLocaleString()} — {a.action} (
                        {a.actor_email})
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <form className="admin-detail__form" onSubmit={saveDetail}>
                <label>
                  Application / challenge assessment status
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
