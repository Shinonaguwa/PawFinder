# Architecture

## Overview

PawFinder uses a React frontend and a Java Spring Boot REST API backed by MySQL.

```text
Browser
  |
  v
React + Vite (src/client)                  port 5173 in development
  | fetch('/api/...') through Vite proxy
  v
Spring Boot + Spring Security (src/server) port 3000
  |
  v
MySQL 8 (pawfinder database)
```

## Technology decisions

| Layer | Decision | Reason |
|---|---|---|
| Frontend | React 18 + Vite | Component-based UI and fast development |
| Backend | Java 21 + Spring Boot 3 | Required Java stack with mature REST support |
| Security | Spring Security, JWT and BCrypt | Stateless API authentication and password hashing |
| Persistence | Spring Data JPA + Hibernate | Repository abstraction and MySQL mapping |
| Database | MySQL 8 | Required persistent relational database |
| Build | Maven | Required repeatable Java build |
| Tests | JUnit 5, MockMvc and H2 MySQL mode | Fast API integration tests without changing production MySQL data |

## Repository layout

| Path | Purpose |
|---|---|
| `src/server/pom.xml` | Maven build and Java dependencies |
| `src/server/src/main/java/com/pawfinder` | Spring Boot application and API code |
| `src/server/src/main/resources/application.properties` | Environment-based MySQL and auth configuration |
| `src/server/src/test` | Spring Boot integration tests |
| `src/client` | React and Vite frontend |

## Authentication API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Confirm API and database access |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Return a signed JWT and public user data |
| GET | `/api/auth/me` | Restore the user from a bearer token |
| POST | `/api/auth/logout` | Revoke the current bearer token |
| POST | `/api/auth/forgot-password` | Create and deliver a one-time reset link |
| POST | `/api/auth/reset-password` | Change a password with a reset token |

## Security rules

- Passwords are BCrypt hashes and are never returned by the API.
- Emails are normalized to lowercase and uniquely constrained in MySQL.
- JWTs contain a unique ID and account token version.
- Logout stores the JWT ID in `revoked_tokens`, invalidating it immediately.
- Password reset stores only a SHA-256 hash of the random token.
- Reset tokens are one-time, expire, and only the newest link remains valid.
- Changing a password increments the user's token version, invalidating all earlier sessions.
- Forgot-password responses are identical for known and unknown addresses.
- Real secrets and MySQL credentials come from environment variables and are not committed.

## Email delivery

Development reset emails are printed to the API console by `ConsoleMailService`. Production should supply another `MailService` implementation backed by SMTP or an email provider.
