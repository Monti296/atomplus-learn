# API reference (planned)

Base path: `/api/v1`. JSON over HTTPS. The NestJS code generates live documentation with Swagger; this file is the agreed outline and must match the code.

The local interactive Swagger documentation is available at `/api/docs`.

## Conventions

- **Auth:** every route needs a session cookie unless marked **Public**. **Admin** routes need the admin role.
- **Methods:** GET reads; POST creates or runs an action; PUT replaces; PATCH changes part of something; DELETE removes.
- **Ids:** UUIDs. Lists are paginated with `page` and `pageSize`.
- **Errors:** `{ "code": "SOME_CODE", "message": "Plain message for people" }` with a suitable HTTP status. Never include stack traces or internals. A record owned by someone else returns 404.
- **Must change password:** a user flagged to change their password can call only `PATCH /me/password`, `POST /auth/logout` and `GET /me`.
- **Validation:** unknown fields in a request are rejected.

## Auth and profile

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /setup/first-admin | Public, only while no admin exists | Create the first admin |
| POST | /auth/login | Public | Log in with email and password; 429 `TOO_MANY_ATTEMPTS` after 5 failures for the same email and address in 15 minutes, with a growing delay (1 to 15 minutes) |
| POST | /auth/logout | User | End the session |
| GET | /me | User | Current user (name, email, role, mustChangePassword) |
| PATCH | /me | User | Change own name |
| PATCH | /me/password | User | Change own password (current and new); clears the must-change flag |
| GET | /me/summary | User | Counts: ongoing, completed, certificates |
| GET | /health | Public | Uptime check |

## Employee learning

| Method | Path | Purpose |
|---|---|---|
| GET | /courses | Published courses the user has not enrolled in |
| POST | /courses/:id/enroll | Enroll; returns the first item to open |
| GET | /me/batch | Enrolled courses split into ongoing and completed, with progress |
| GET | /courses/:id/player | Sections, items, progress and lock state for an enrolled course |
| POST | /lectures/:id/access | Checks enrollment and unlock; returns the signed playlist address |
| PATCH | /lectures/:id/progress | Heartbeat every 10 seconds (position and elapsed time) |
| GET | /notes/:id | Short-lived link to a lecture PDF |
| POST | /courses/:id/exam-attempts | Start a new try (or resume the unexpired one) |
| PUT | /exam-attempts/:id/answers | Save answers so far |
| POST | /exam-attempts/:id/submit | Submit and grade |
| GET | /me/certificates | List earned certificates |
| GET | /certificates/:id/pdf | Download a certificate PDF (owner or admin) |

## Admin

| Method | Path | Purpose |
|---|---|---|
| GET, POST | /admin/users | List or create users (random temporary password returned once) |
| PATCH | /admin/users/:id | Change name; block or unblock |
| PATCH | /admin/users/:id/password | Reset password (user must change it at next login) |
| DELETE | /admin/users/:id | Remove a user and all their data |
| GET, POST | /admin/courses | List or create courses (cover image, title, description) |
| PATCH | /admin/courses/:id | Edit details, pass mark, time limit, publish or unpublish |
| DELETE | /admin/courses/:id | Delete a course |
| POST, PATCH | /admin/courses/:id/sections | Add or change sections and their order |
| POST, PATCH | /admin/sections/:id/lectures | Add or change lectures and their order |
| POST | /admin/lectures/:id/uploads | Start an upload; returns one-time upload links |
| POST | /admin/lectures/:id/uploads/complete | Finish upload; queues conversion |
| POST | /admin/lectures/:id/retry | Retry a failed conversion |
| POST | /admin/lectures/:id/notes | Attach a PDF note |
| POST | /admin/courses/:id/cover | Upload a course cover image |
| GET, POST, PATCH, DELETE | /admin/courses/:id/questions | Manage exam questions and options |
| GET | /admin/overview | Per employee and course: progress, latest score, certificate |

## Internal (not for browsers)

| Method | Path | Purpose |
|---|---|---|
| POST | /internal/conversion-result | Called by the converter with success or failure, authenticated with a shared secret |
