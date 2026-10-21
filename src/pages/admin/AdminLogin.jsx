import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/PageMeta';
import { adminLogin } from '../../lib/eventApi';
import './admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await adminLogin(email, password);
      navigate('/admin/event-registrations', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <PageMeta
        title="Admin sign in"
        description="SHE CHAMPIONS event registrations administration."
        noIndex
      />
      <div className="admin-login">
        <h1>Event registrations</h1>
        <p>Authorized staff only.</p>
        <form onSubmit={handleSubmit} className="admin-login__form">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
