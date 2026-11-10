# PawFinder

A community platform that reunites lost pets with their families and, later, helps pets find new homes.

## Implemented authentication

- Account registration (AUTH-01)
- Login and session restoration with JWT (AUTH-02)
- Immediate token revocation on logout (AUTH-03)
- One-time password reset links (AUTH-04)

## Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Java 21 + Spring Boot 3 |
| Security | Spring Security + JWT + BCrypt |
| Database | MySQL 8 through Spring Data JPA |
| Build | Maven |
| Tests | JUnit 5, MockMvc and H2 in MySQL compatibility mode |

## Requirements

- Java 21 or newer
- Maven 3.9 or newer
- Node.js 20 or newer
- MySQL 8

## Local setup

1. Clone the repository and enter `PawFinder-skeleton`.
2. Create the database if your MySQL account cannot create it automatically:
   ```sql
   CREATE DATABASE pawfinder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Configure the environment using `.env.example` as a reference. Spring Boot reads the listed variables directly from your shell or IDE launch configuration. `JWT_SECRET` is required and must contain at least 32 bytes.
4. Install the frontend dependencies:
   ```bash
   npm install --prefix src/client
   ```
5. Start the API:
   ```bash
   mvn -f src/server/pom.xml spring-boot:run
   ```
6. In a second terminal, start the website:
   ```bash
   npm run dev
   ```
7. Open http://localhost:5173. Vite forwards `/api` calls to Spring Boot on port 3000.

## Useful commands

| Command | Purpose |
|---|---|
| `mvn -f src/server/pom.xml test` | Run backend tests |
| `mvn -f src/server/pom.xml package` | Build the Spring Boot JAR |
| `npm run dev` | Start the React development server |
| `npm run build` | Build the React frontend |

## Password-reset email

The development mail service prints reset messages and links to the Spring Boot console. Replace `ConsoleMailService` with an SMTP-backed `MailService` implementation before production use.

## Project structure

```text
src/
  client/                         React website
  server/
    pom.xml                       Maven project
    src/main/java/com/pawfinder/ Spring Boot API
    src/main/resources/          Spring configuration
    src/test/                    Backend integration tests
```
