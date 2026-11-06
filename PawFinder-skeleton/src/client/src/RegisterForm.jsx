import { useState } from 'react';
import { api, ApiError } from './api.js';

const MIN_PASSWORD = 8;

/** Sign-up form (AUTH-01). Calls onRegistered(user) after the account is created. */
export default function RegisterForm({ onRegistered }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');

    // Quick checks in the browser; the server repeats them.
    const errors = {};
    if (!values.name.trim()) errors.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
    if (values.password.length < MIN_PASSWORD) {
      errors.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const { user } = await api('/auth/register', { method: 'POST', body: values });
      onRegistered(user);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2>Create your account</h2>

      <label>
        Name
        <input value={values.name} onChange={update('name')} autoComplete="name" aria-invalid={!!fieldErrors.name} />
        {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
      </label>

      <label>
        Email
        <input
          type="email"
          value={values.email}
          onChange={update('email')}
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
      </label>

      <label>
        Password
        <input
          type="password"
          value={values.password}
          onChange={update('password')}
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
        />
        <span className="hint">At least {MIN_PASSWORD} characters.</span>
        {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
      </label>

      {formError && <p className="error" role="alert">{formError}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
