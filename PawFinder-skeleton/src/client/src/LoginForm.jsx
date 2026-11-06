import { useState } from 'react';
import { api, setToken } from './api.js';

/** Log-in form (AUTH-02). Calls onLoggedIn(user) once the server accepts the credentials. */
export default function LoginForm({ initialEmail = '', onLoggedIn, onForgotPassword }) {
  const [values, setValues] = useState({ email: initialEmail, password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!values.email.trim() || !values.password) {
      setError('Enter your email and password.');
      return;
    }

    setBusy(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: values });
      setToken(token);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2>Log in</h2>

      <label>
        Email
        <input type="email" value={values.email} onChange={update('email')} autoComplete="email" />
      </label>

      <label>
        Password
        <input type="password" value={values.password} onChange={update('password')} autoComplete="current-password" />
      </label>

      {onForgotPassword && (
        <button type="button" className="link forgot" onClick={() => onForgotPassword(values.email)}>
          Forgot your password?
        </button>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}
