# Test plan

## Principles

- Every acceptance criterion in `docs/PRD.md` and every item in the security checklist (`docs/SECURITY-PLAN.md`, section 10) has at least one automated test, written together with the feature.
- Tests name the requirement they cover, for example `FR-4.8 locked item cannot be opened`.
- Tests never use real user data or real secrets (the repository is public).

## Levels and tools

| Level | Tools | Scope |
|---|---|---|
| Unit | Jest | Pure rules: unlock order, progress percent, 70% completion, heartbeat cap, exam grading (single, multiple, true/false), password rules, certificate number |
| Integration (backend) | Jest, Supertest, a real PostgreSQL test database | Routes with the database: login and sessions, role and ownership checks, enrollment, player state, exam start, save, submit and expiry, certificate creation, admin actions, user removal |
| End-to-end | Playwright | A few key journeys in a real browser (below) |
| Manual | Checklist | Phone and laptop usability, real video playback, certificate PDF look |

Test database: a throwaway PostgreSQL (local container or CI service), never the production Neon database.

## Key end-to-end journeys

1. Admin logs in, changes the temporary password, creates a user, creates a course with a lecture and an exam.
2. New employee logs in, is forced to change the password, enrolls, watches the lectures in order, passes the exam and downloads the certificate.
3. Employee fails the exam, retakes it and passes.
4. Locked lecture and early exam start are refused in the UI and by direct address.
5. Admin blocks a user; the user is logged out at once.

Playwright runs at phone width and laptop width.

## Security checks (from the security plan)

Automated:
- Every route except login, first-admin setup and health returns 401 without a session.
- An employee on any `/admin` route gets 403.
- Employee A requesting employee B's enrollment, attempt or certificate gets not found.
- Locked lecture access and early exam start are refused.
- No exam response contains correct-answer data before submission.
- An answer saved after expiry is ignored.
- Heartbeats faster than real time do not raise watched time.
- The sixth failed login within 15 minutes is refused, with the same message for known and unknown emails.
- A user flagged must-change-password can call only the allowed routes.
- A blocked user's session stops working at once; a session idle for 5 days is rejected.
- Quotes, SQL fragments and script tags in every text field are stored safely and shown as plain text.
- A non-MP4 or over-1-GB upload is rejected.

Gateway and storage:
- Video requests with no token, an expired token, a changed token or another lecture's token return 403.
- A direct R2 object address without a token fails; no bucket is public.

Configuration:
- Cookie flags, security headers, exact-origin CORS, secret scan of the repository, dependency audit with no high or critical issues, billing alerts on every provider.

## Before launch

- Restore a backup into a test database and check the data.
- Run the full journey with real video on a real phone and a laptop.
- Confirm temporary passwords must be changed at first login.
- Review admin screens for any unsafe rendering of user-supplied text.

## Automation in CI

Lint, unit and integration tests run on every pull request; end-to-end tests run on pull requests and before release. Set up in Step 12.
