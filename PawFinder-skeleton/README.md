# PawFinder

A community platform that reunites lost pets with their families and, later, helps pets find new homes.

**Task board:** https://trello.com/b/QrjdinLI/pawfinder
**Repository:** <paste GitHub URL here>

## Problem

When a pet goes missing, owners rely on scattered social media posts and flyers. People who spot a stray have no easy way to tell the owner. PawFinder puts lost, found and sighting reports in one searchable, location-based place.

## Users

| User | Need |
|---|---|
| Pet owner | Report a lost pet and get notified of nearby sightings |
| Finder / spotter | Report a found pet or sighting and contact the owner safely |
| Community member | Browse nearby reports on a map and feed |
| Admin | Review flagged content and remove spam |

## Features

**MVP**
- Register, log in and log out (AUTH-01, AUTH-02)
- Post, view, edit, delete and resolve Lost / Found / Sighting reports with photos and a map pin (REP-01 to REP-04)
- Interactive map and local feed of nearby reports (DISC-01, DISC-02)
- Filter by status, date and distance (SRCH-01)
- In-app messaging that keeps phone numbers private (MSG-01, MSG-02)

**Next:** profile management, pet records, trait filters, sighting alerts, abuse reporting.
**Later:** pet adoption listings and inquiries.

Full backlog with user stories and acceptance criteria: [docs/requirements.md](docs/requirements.md)

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Backend / API | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Maps | Leaflet + OpenStreetMap (no API key; added in REP-01c) |
| Photo storage | Local `uploads/` folder (added in REP-01b) |
| Tests | Node's built-in test runner (`node --test`) |

Details and data model: [docs/architecture.md](docs/architecture.md)

## Team

| Name | Role |
|---|---|
| Member A | <name> |
| Member B | <name> |
| Member C | <name> |

See [docs/team-roles.md](docs/team-roles.md).

## Setup

**Requirements:** [Node.js](https://nodejs.org) 20 or newer (check with `node --version`).

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd PawFinder
   ```
2. Install dependencies for the whole project
   ```bash
   npm install
   ```
3. Create your local environment file and fill in your own values
   ```bash
   cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
   ```
4. Create the database (optional, because the server also does this on startup)
   ```bash
   npm run db:init
   ```
5. Start the app (API on port 3000, website on port 5173)
   ```bash
   npm run dev
   ```
6. Open http://localhost:5173. The page should say "API is running".

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and the website together |
| `npm test` | Run the automated tests |
| `npm run build` | Build the website for production |
| `npm run db:init` | Create the database file and tables |

## Workflow

Work is tracked on the task board. Every card links to a GitHub issue, a `feature/<issue>-<short-name>` branch and a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Project structure

```
.github/        Issue and pull request templates
docs/           Requirements, architecture, team roles
src/
  client/       React website (Vite)
  server/       Express API, SQLite schema (schema.sql)
tests/          Automated tests
data/           Local SQLite database (created at runtime, not committed)
```
