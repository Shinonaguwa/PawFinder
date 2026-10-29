import { useEffect, useState } from 'react';

export default function App() {
  const [api, setApi] = useState({ state: 'loading' });

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
        <h2>System status</h2>
        {api.state === 'loading' && <p>Checking the server...</p>}
        {api.state === 'ok' && (
          <p className="ok">
            API is running. {api.data.database.users} users and {api.data.database.reports} reports in the
            database.
          </p>
        )}
        {api.state === 'error' && (
          <p className="error">
            Cannot reach the API ({api.message}). Start the app with <code>npm run dev</code>.
          </p>
        )}
        <p className="hint">
          This is the Sprint 1 skeleton. Login, report forms and the map are added by their own tasks.
        </p>
      </main>
    </div>
  );
}
