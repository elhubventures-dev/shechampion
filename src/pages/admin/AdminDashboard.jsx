import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PageMeta from '../../components/PageMeta';
import AdminShell from '../../components/admin/AdminShell';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import {
  adminAnnounce,
  adminExportCsv,
  adminGetRegistration,
  adminListRegistrations,
  adminLogout,
  adminMe,
  adminNotifyApplicant,
  adminRetryEmail,
  adminSendRegistrationEmail,
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

const APPLICANT_CATEGORIES = [
  'EXISTING_BUSINESS_OWNER',
  'VOCATIONAL_OR_PROFESSIONAL_SKILL',
  'BUSINESS_IDEA',
];

const EMPTY_EDIT = {
  fullName: '',
  email: '',
  phone: '',
  stateOfResidence: '',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  businessName: '',
  briefDescription: '',
  exhibitionBusinessName: '',
  exhibitionCategory: '',
  exhibitionDescription: '',
};

const PAYMENT_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REVERSED',
  'INITIALIZATION_FAILED',
];

const SECTION_META = {
  overview: {
    title: 'Overview',
    subtitle: 'Registration and payment snapshot for Business Empowerment Challenge 2026.',
  },
  registrations: {
    title: 'Registrations',
    subtitle: 'Search, review, and update applicant assessment status.',
  },
  broadcast: {
    title: 'Broadcast',
    subtitle: 'Send branded announcement emails to registered applicants.',
  },
};

function formatKobo(kobo) {
  if (kobo === null || kobo === undefined) return '—';
  if (Number(kobo) === 0) return 'Free (₦0)';
  return `₦${(Number(kobo) / 100).toLocaleString('en-NG')}`;
}

function participationLabel(row) {
  return (
    [row.challenge_selected ? 'Challenge' : null, row.exhibition_selected ? 'Exhibition' : null]
      .filter(Boolean)
      .join(' + ') || 'Free only'
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState('registrations');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);
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
  const [announceType, setAnnounceType] = useState('registration_open_announcement');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceBusy, setAnnounceBusy] = useState(false);
  const [announceResult, setAnnounceResult] = useState('');
  const [instructionMessage, setInstructionMessage] = useState('');
  const [editDraft, setEditDraft] = useState(EMPTY_EDIT);
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState('');

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
      const r = data.registration;
      setStatusDraft(
        r.challenge_status &&
          ['UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED', 'CONFIRMED'].includes(
            r.challenge_status
          )
          ? r.challenge_status === 'CONFIRMED'
            ? 'REGISTERED'
            : r.challenge_status
          : r.application_status
      );
      setNotesDraft(r.admin_notes || '');
      setEditDraft({
        fullName: r.full_name || '',
        email: r.email_normalized || '',
        phone: r.phone || '',
        stateOfResidence: r.state_of_residence || '',
        applicantCategory: r.applicant_category || 'EXISTING_BUSINESS_OWNER',
        businessName: r.business_name || '',
        briefDescription: r.brief_description || '',
        exhibitionBusinessName: r.exhibition_business_name || '',
        exhibitionCategory: r.exhibition_category || '',
        exhibitionDescription: r.exhibition_description || '',
      });
      setNotifyResult('');
      setSection('registrations');
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
    setError('');
    try {
      await adminUpdateRegistration(selectedId, {
        applicationStatus: statusDraft,
        adminNotes: notesDraft,
        ...editDraft,
      });
      await openDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function withdrawRegistration() {
    if (!selectedId || !detail?.registration) return;
    const ok = window.confirm(
      `Withdraw ${detail.registration.public_reference}? The record and payment history stay on file; the applicant may receive a withdrawn notice.`
    );
    if (!ok) return;
    setDetailBusy(true);
    setError('');
    try {
      await adminUpdateRegistration(selectedId, {
        applicationStatus: 'WITHDRAWN',
      });
      await openDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(err.message || 'Withdraw failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function sendNotify(event) {
    event.preventDefault();
    if (!selectedId) return;
    setNotifyBusy(true);
    setNotifyResult('');
    setError('');
    try {
      const result = await adminNotifyApplicant({
        registrationId: selectedId,
        subject: notifySubject,
        message: notifyMessage,
      });
      if (!result.sent) {
        setError(result.reason || 'Notification was not sent.');
      } else {
        setNotifyResult('Notification sent to the applicant.');
        setNotifySubject('');
        setNotifyMessage('');
        await openDetail(selectedId);
      }
    } catch (err) {
      setError(err.message || 'Notification failed.');
    } finally {
      setNotifyBusy(false);
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

  async function sendInstructionEmail(emailType) {
    if (!selectedId) return;
    setDetailBusy(true);
    setError('');
    try {
      const result = await adminSendRegistrationEmail({
        registrationId: selectedId,
        emailType,
        message: instructionMessage,
      });
      if (!result.sent) {
        setError(
          result.alreadySent
            ? 'That email was already sent. Use retry confirmation for paid/free confirmations.'
            : result.reason || 'Email was not sent.'
        );
      }
      await openDetail(selectedId);
    } catch (err) {
      setError(err.message || 'Send failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  async function handleAnnounce(event) {
    event.preventDefault();
    setAnnounceBusy(true);
    setAnnounceResult('');
    setError('');
    try {
      const result = await adminAnnounce({
        announceType,
        message: announceMessage,
      });
      setAnnounceResult(
        `Announcement queued: ${result.sent || 0} sent, ${result.failed || 0} failed of ${result.total || 0} recipients.`
      );
    } catch (err) {
      setError(err.message || 'Announcement failed.');
    } finally {
      setAnnounceBusy(false);
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
      <div className="admin-loading">
        <p>Loading admin…</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));
  const reg = detail?.registration;
  const meta = SECTION_META[section];

  return (
    <>
      <PageMeta
        title="Event registrations admin"
        description="SHE CHAMPIONS event registrations administration."
        noIndex
      />
      <AdminShell
        email={email}
        section={section}
        onSectionChange={setSection}
        title={meta.title}
        subtitle={meta.subtitle}
        onLogout={handleLogout}
        actions={
          section === 'registrations' || section === 'overview' ? (
            <button type="button" className="btn btn-outline-primary" onClick={handleExport}>
              Export CSV
            </button>
          ) : null
        }
      >
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}

        {section === 'overview' ? (
          <div className="admin-section-stack">
            <section className="admin-panel" aria-labelledby="admin-overview-heading">
              <h2 id="admin-overview-heading" className="admin-panel__title">
                Registration snapshot
              </h2>
              <p className="admin-panel__lead">
                Counts reflect the current filter set applied on the Registrations view (defaults to
                all records). Figures come from the live registrations database.
              </p>
              {summary ? (
                <div className="admin-stats" aria-label="Registration summary">
                  <AdminStatCard value={summary.total_applications ?? 0} label="Total applications" />
                  <AdminStatCard
                    value={summary.free_event_registrations ?? 0}
                    label="Free event only"
                  />
                  <AdminStatCard
                    value={summary.challenge_applicants ?? 0}
                    label="Challenge applicants"
                  />
                  <AdminStatCard
                    value={summary.confirmed_challenge_participants ?? 0}
                    label="Confirmed challenge"
                  />
                  <AdminStatCard
                    value={summary.exhibition_applicants ?? 0}
                    label="Exhibition applicants"
                  />
                  <AdminStatCard
                    value={summary.confirmed_exhibitors ?? 0}
                    label="Confirmed exhibitors"
                  />
                  <AdminStatCard value={summary.both_activities ?? 0} label="Both activities" />
                  <AdminStatCard value={summary.pending_payments ?? 0} label="Pending payments" />
                  <AdminStatCard
                    value={summary.verified_payments ?? summary.paid_registrations ?? 0}
                    label="Verified payments"
                  />
                  <AdminStatCard
                    value={summary.failed_or_reversed ?? 0}
                    label="Failed / reversed"
                  />
                </div>
              ) : (
                <p className="admin-muted">Summary is not available yet.</p>
              )}
            </section>
          </div>
        ) : null}

        {section === 'broadcast' ? (
          <section className="admin-panel" aria-labelledby="admin-announce-heading">
            <h2 id="admin-announce-heading" className="admin-panel__title">
              Broadcast announcement
            </h2>
            <p className="admin-broadcast-warn" role="note">
              Sends branded Resend messages to registered applicants. This does not open or close
              registration. Event details updates require confirmed venue/schedule copy only — do not
              invent facts.
            </p>
            <form className="admin-detail__form" onSubmit={handleAnnounce}>
              <label className="admin-field">
                Announcement type
                <select
                  value={announceType}
                  onChange={(e) => setAnnounceType(e.target.value)}
                  disabled={announceBusy}
                >
                  <option value="registration_open_announcement">Registration open</option>
                  <option value="registration_cutoff_reminder">
                    Cutoff reminder (unpaid + free)
                  </option>
                  <option value="event_details_update">Event details update</option>
                </select>
              </label>
              <label className="admin-field">
                Optional message (required for details update)
                <textarea
                  rows={4}
                  value={announceMessage}
                  onChange={(e) => setAnnounceMessage(e.target.value)}
                  disabled={announceBusy}
                  placeholder="Plain text only — venue/schedule notes supplied by the organiser."
                />
              </label>
              <div className="admin-action-row">
                <button type="submit" className="btn btn-primary" disabled={announceBusy}>
                  {announceBusy ? 'Sending…' : 'Send announcement'}
                </button>
              </div>
              {announceResult ? (
                <p className="admin-success-note" role="status">
                  {announceResult}
                </p>
              ) : null}
            </form>
          </section>
        ) : null}

        {section === 'registrations' ? (
          <div className="admin-section-stack">
            <section className="admin-panel">
              <button
                type="button"
                className="admin-filters__toggle"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {filtersOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                {filtersOpen ? 'Hide filters' : 'Show filters'}
              </button>
              {filtersOpen ? (
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
              ) : null}
            </section>

            <div className="admin-layout">
              <div className="admin-panel admin-table-wrap">
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
                      <tr
                        key={row.id}
                        className={row.id === selectedId ? 'is-selected' : undefined}
                        onClick={() => openDetail(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDetail(row.id);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td>
                          <button
                            type="button"
                            className="admin-linkish"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(row.id);
                            }}
                          >
                            {row.public_reference}
                          </button>
                        </td>
                        <td>{row.full_name}</td>
                        <td>{participationLabel(row)}</td>
                        <td>
                          <AdminStatusBadge status={row.payment_status} kind="payment" />
                        </td>
                        <td>
                          <AdminStatusBadge status={row.challenge_status} kind="application" />
                        </td>
                        <td>
                          <AdminStatusBadge status={row.exhibition_status} kind="application" />
                        </td>
                        <td>
                          <AdminStatusBadge
                            status={row.confirmation_email_status}
                            kind="email"
                          />
                        </td>
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
                    Page {page} of {pageCount} · {total} total
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

              <aside className="admin-panel admin-detail" aria-live="polite">
                {!selectedId ? (
                  <p className="admin-muted">Select a registration to view details.</p>
                ) : detailBusy && !detail ? (
                  <p className="admin-muted">Loading detail…</p>
                ) : reg ? (
                  <>
                    <div className="admin-detail__header">
                      <h2>{reg.public_reference}</h2>
                      <AdminStatusBadge status={reg.payment_status} kind="payment" />
                    </div>
                    <dl className="admin-dl">
                      <div>
                        <dt>Selected activities</dt>
                        <dd>{participationLabel(reg)}</dd>
                      </div>
                      <div>
                        <dt>Expected amount</dt>
                        <dd>
                          {formatKobo(reg.expected_amount_kobo)} {reg.currency || ''}
                        </dd>
                      </div>
                      <div>
                        <dt>Event registration</dt>
                        <dd>{reg.event_registration_status || '—'}</dd>
                      </div>
                      <div>
                        <dt>Challenge status</dt>
                        <dd>
                          <AdminStatusBadge
                            status={reg.challenge_status}
                            kind="application"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Exhibition status</dt>
                        <dd>
                          <AdminStatusBadge
                            status={reg.exhibition_status}
                            kind="application"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Challenge eligibility</dt>
                        <dd>
                          {reg.challenge_women_eligibility_attested ? 'Yes' : 'No'}
                          {reg.challenge_eligibility_attested_at
                            ? ` · ${new Date(reg.challenge_eligibility_attested_at).toLocaleString()}`
                            : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>Exhibition owner</dt>
                        <dd>
                          {reg.exhibition_business_owner_attested ? 'Yes' : 'No'}
                          {reg.exhibition_owner_attested_at
                            ? ` · ${new Date(reg.exhibition_owner_attested_at).toLocaleString()}`
                            : ''}
                        </dd>
                      </div>
                    </dl>

                    <h3>Edit submission</h3>
                    <form className="admin-detail__form" onSubmit={saveDetail}>
                      <label>
                        Full name
                        <input
                          value={editDraft.fullName}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, fullName: e.target.value }))
                          }
                          disabled={detailBusy}
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={editDraft.email}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, email: e.target.value }))
                          }
                          disabled={detailBusy}
                          required
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          value={editDraft.phone}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, phone: e.target.value }))
                          }
                          disabled={detailBusy}
                          required
                        />
                      </label>
                      <label>
                        State of residence
                        <input
                          value={editDraft.stateOfResidence}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              stateOfResidence: e.target.value,
                            }))
                          }
                          disabled={detailBusy}
                          required
                        />
                      </label>
                      <label>
                        Applicant category
                        <select
                          value={editDraft.applicantCategory}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              applicantCategory: e.target.value,
                            }))
                          }
                          disabled={detailBusy}
                        >
                          {APPLICANT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Business name
                        <input
                          value={editDraft.businessName}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, businessName: e.target.value }))
                          }
                          disabled={detailBusy}
                        />
                      </label>
                      <label>
                        Brief description
                        <textarea
                          rows={3}
                          value={editDraft.briefDescription}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              briefDescription: e.target.value,
                            }))
                          }
                          disabled={detailBusy}
                          required
                        />
                      </label>
                      {reg.exhibition_selected ? (
                        <>
                          <label>
                            Exhibition business name
                            <input
                              value={editDraft.exhibitionBusinessName}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  exhibitionBusinessName: e.target.value,
                                }))
                              }
                              disabled={detailBusy}
                            />
                          </label>
                          <label>
                            Exhibition category
                            <input
                              value={editDraft.exhibitionCategory}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  exhibitionCategory: e.target.value,
                                }))
                              }
                              disabled={detailBusy}
                            />
                          </label>
                          <label>
                            Exhibition description
                            <textarea
                              rows={3}
                              value={editDraft.exhibitionDescription}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  exhibitionDescription: e.target.value,
                                }))
                              }
                              disabled={detailBusy}
                            />
                          </label>
                        </>
                      ) : null}
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
                          rows={3}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          disabled={detailBusy}
                        />
                      </label>
                      <div className="admin-action-row">
                        <button type="submit" className="btn btn-primary" disabled={detailBusy}>
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary admin-btn-danger"
                          onClick={withdrawRegistration}
                          disabled={detailBusy || reg.application_status === 'WITHDRAWN'}
                        >
                          Withdraw registration
                        </button>
                      </div>
                    </form>

                    <h3>Email applicant</h3>
                    <form className="admin-detail__form" onSubmit={sendNotify}>
                      <label>
                        Subject
                        <input
                          value={notifySubject}
                          onChange={(e) => setNotifySubject(e.target.value)}
                          disabled={notifyBusy || detailBusy}
                          placeholder="Message subject"
                          required
                        />
                      </label>
                      <label>
                        Message
                        <textarea
                          rows={4}
                          value={notifyMessage}
                          onChange={(e) => setNotifyMessage(e.target.value)}
                          disabled={notifyBusy || detailBusy}
                          placeholder="Plain-text message to this applicant"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={notifyBusy || detailBusy}
                      >
                        {notifyBusy ? 'Sending…' : 'Send notification'}
                      </button>
                      {notifyResult ? (
                        <p className="admin-success-note" role="status">
                          {notifyResult}
                        </p>
                      ) : null}
                    </form>

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

                    <div className="admin-detail__email-actions">
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
                      <label>
                        Optional note for materials / exhibitor email
                        <textarea
                          rows={2}
                          value={instructionMessage}
                          onChange={(e) => setInstructionMessage(e.target.value)}
                          disabled={detailBusy}
                          placeholder="Optional plain-text instructions for the applicant."
                        />
                      </label>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => sendInstructionEmail('challenge_materials_request')}
                          disabled={detailBusy || !reg.challenge_selected}
                        >
                          Send challenge materials
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => sendInstructionEmail('exhibition_instructions')}
                          disabled={detailBusy || !reg.exhibition_selected}
                        >
                          Send exhibitor instructions
                        </button>
                      </div>
                    </div>

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
                  </>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null}
      </AdminShell>
    </>
  );
}
