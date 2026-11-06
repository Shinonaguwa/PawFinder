import { useEffect, useState } from 'react';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import { api, clearToken, getToken } from './api.js';

export default function App() {
  const [health, setHealth] = useState({ state: 'loading' });
  // undefined = still checking a saved session, null = logged out, object = logged in
  const [user, setUser] = useState(getToken() ? undefined : null);
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [notice, setNotice] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth({ state: 'ok', data }))
      .catch((err) => setHealth({ state: 'error', message: err.message }));
  }, []);

  // Restore a saved session after a page refresh.
  useEffect(() => {
    if (user !== undefined) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        // Only drop the token when the server says it is invalid, not when it is unreachable.
        if (err.status === 401) clearToken();
        setUser(null);
      });
  }, [user]);

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the server cannot be reached, the person asked to log out on this device.
    }
    clearToken();
    setNotice('You have been logged out.');
    setView('login');
    setUser(null);
  }

  function handleRegistered(created) {
    setNewEmail(created.email);
    setNotice('Account created. Log in to continue.');
    setView('login');
  }

  function renderMain() {
    if (user === undefined) return <p className="hint">Checking your session...</p>;
    if (user) {
      return (
        <>
          <h2>Welcome, {user.name}!</h2>
          <p className="ok">You are logged in as {user.email}.</p>
          <button type="button" className="secondary" onClick={handleLogout}>
            Log out
          </button>
        </>
      );
    }
    if (view === 'register') {
      return (
        <>
          <RegisterForm onRegistered={handleRegistered} />
          <p className="switch">
            Already have an account?{' '}
            <button type="button" className="link" onClick={() => { setNotice(''); setView('login'); }}>
              Log in
            </button>
          </p>
        </>
      );
    }
    return (
      <>
        {notice && <p className="ok" role="status">{notice}</p>}
        <LoginForm initialEmail={newEmail} onLoggedIn={(u) => { setNotice(''); setUser(u); }} />
        <p className="switch">
          New here?{' '}
          <button type="button" className="link" onClick={() => { setNotice(''); setView('register'); }}>
            Create an account
          </button>
        </p>
      </>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>
          Paw<span>Finder</span>
        </h1>
        <p>Reuniting lost pets with their families.</p>
      </header>

      <main className="card">{renderMain()}</main>

      <footer className="status">
        {health.state === 'loading' && <p className="hint">Checking the server...</p>}
        {health.state === 'ok' && <p className="hint">API is running.</p>}
        {health.state === 'error' && (
          <p className="error">
            Cannot reach the API ({health.message}). Start the app with <code>npm run dev</code>.
          </p>
        )}
      </footer>
    </div>
  );
}
