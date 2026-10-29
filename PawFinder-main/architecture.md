# Architecture

## Overview

PawFinder is a web application with a React frontend and an Express API backed by a SQLite database.

```
 Browser / mobile web
        |
        v
  React + Vite (src/client)         port 5173 in development
        |  fetch('/api/...')  (Vite proxies /api to the server)
        v
  Express API (src/server)          port 3000
        |
        +----> SQLite file (data/pawfinder.db)
        +----> uploads/ folder (report photos, from REP-01b)
        +----> Map tiles from OpenStreetMap via Leaflet (from REP-01c)
```

## Technology decisions

| Layer | Decision | Reason |
|---|---|---|
| Frontend | React 18 + Vite | Fast to start, widely known, hot reload |
| Backend | Node.js + Express | Same language as the frontend, simple REST API |
| Database | SQLite via better-sqlite3 | Zero setup, one file, enough for the project scope. Location filtering uses latitude/longitude columns |
| Realtime chat | Polling first, upgrade to WebSockets if time allows (MSG-02) | Keeps the first version simple |
| Maps | Leaflet + OpenStreetMap | No API key needed |
| Image storage | Local `uploads/` folder | No cloud account needed |
| Tests | Node built-in runner (`node --test`) | No extra dependencies |
| Hosting | Not decided (local only for the course demo) | |

## Repository layout

| Path | Purpose |
|---|---|
| `package.json` | Root workspace: one `npm install` installs client and server |
| `src/server/app.js` | Builds the Express app (routes are added here) |
| `src/server/db.js` | Opens SQLite and applies `schema.sql` |
| `src/server/schema.sql` | Database tables and indexes |
| `src/server/index.js` | Starts the server using `.env` settings |
| `src/client/src/App.jsx` | Root React component |
| `tests/` | Automated tests, run with `npm test` |

## Data model (implemented in `schema.sql`)

| Table | Key fields |
|---|---|
| `users` | id, name, email (unique), password_hash, phone (private), photo_url, created_at |
| `reports` | id, author_id, status (Lost / Found / Sighting), species, breed, color, size, markings, description, latitude, longitude, resolved (0/1), created_at |
| `report_photos` | id, report_id, url |

Planned for later tasks: `pets` (PET-01), `conversations` and `messages` (MSG-01, MSG-02), `flags` (SAFE-01), `adoption_listings` (ADOPT-01).

The database enforces these rules: emails are unique, status must be one of the three values, coordinates must be valid, and a report must belong to an existing user.

## API

| Method | Path | Purpose | Task |
|---|---|---|---|
| GET | `/api/health` | Confirms the API and database are working | SETUP-03 |
| POST | `/api/auth/register` | Create an account | AUTH-01 |
| POST | `/api/auth/login` | Log in | AUTH-02 |
| POST | `/api/reports` | Create a report | REP-01 |

Only the first endpoint exists so far. The rest are planned.

## Key design rules

- Contact details stay private. Users reach each other only through in-app messages.
- Only a report's author can edit, delete or resolve it.
- Resolved reports are hidden from the active map and feed.
- Passwords are always hashed. Secrets live in `.env`, never in git.
- Distance filtering uses report latitude and longitude.

## Open questions

- Which password hashing library will AUTH-01 use (for example bcrypt)?
- Will login use sessions with cookies or JSON Web Tokens?
- Will chat stay on polling or move to WebSockets?
