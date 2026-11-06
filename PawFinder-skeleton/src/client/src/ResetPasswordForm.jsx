import { useState } from 'react';
import { api } from './api.js';

const MIN_PASSWORD = 8;

/** Choose-a-new-password form (AUTH-04), opened from the link in the reset email. */
export default function ResetPasswordForm({ token, onDone, onRequestNew }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      onDone();
    } catch (err) {
      // A 400 without a field message means the link itself is no good.
      if (err.status === 400 && !err.fields?.password) setExpired(true);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <div className="auth-form">
        <h2>Link no longer valid</h2>
        <p className="error" role="alert">{error}</p>
        <button type="button" onClick={onRequestNew}>
          Request a new link
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2>Choose a new password</h2>

      <label>
        New password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <span className="hint">At least {MIN_PASSWORD} characters.</span>
      </label>

      <label>
        Confirm new password
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Saving...' : 'Change password'}
      </button>
    </form>
  );
}
