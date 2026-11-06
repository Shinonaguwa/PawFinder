import { useEffect, useState } from 'react';
import RegisterForm from './RegisterForm.jsx';

export default function App() {
  const [api, setApi] = useState({ state: 'loading' });
  const [registered, setRegistered] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setApi({ state: 'ok', data }))
      .catch((err) => setApi({ state: 'error', message: err.message }));
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>
          Paw<span>Finder</span>
        </h1>
        <p>Reuniting lost pets with their families.</p>
      </header>

      <main className="card">
        {registered ? (
          <>
            <h2>Welcome, {registered.name}!</h2>
            <p className="ok">Your account is ready. Log in is coming in the next step.</p>
          </>
        ) : (
          <RegisterForm onRegistered={setRegistered} />
        )}
      </main>

      <footer className="status">
        {api.state === 'loading' && <p className="hint">Checking the server...</p>}
        {api.state === 'ok' && <p className="hint">API is running.</p>}
        {api.state === 'error' && (
          <p className="error">
            Cannot reach the API ({api.message}). Start the app with <code>npm run dev</code>.
          </p>
        )}
      </footer>
    </div>
  );
}
