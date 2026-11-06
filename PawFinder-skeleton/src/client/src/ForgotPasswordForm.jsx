import { useState } from 'react';
import { api } from './api.js';

/** "Forgot password" form (AUTH-04): asks the server to email a reset link. */
export default function ForgotPasswordForm({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-form">
        <h2>Check your email</h2>
        <p className="ok" role="status">
          If an account exists for {email.trim()}, we have sent a link to reset the password. It expires in an hour.
        </p>
        <button type="button" className="secondary" onClick={onBack}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>Reset your password</h2>
        <p className="hint">Enter your account email and we will send you a link to choose a new password.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="switch">
        <button type="button" className="link" onClick={onBack}>
          Back to log in
        </button>
      </p>
    </>
  );
}
