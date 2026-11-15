# AtomPlus Learn – Security Plan and Threat Model

Version 1.0 (approved) · Prepared with the software-builder workflow, security planning step

## 1. Summary

AtomPlus Learn holds employee names, work emails and passwords, learning progress, exam results and certificates. The lecture content is mostly general knowledge with low sensitivity (product owner’s answer). So the main things to protect are **accounts and passwords, exam and certificate integrity, and the platform’s availability and running costs**, rather than the videos themselves.

This plan lists what we protect, who could attack it and how, and the rules the build must follow. It ends with a checklist used to verify each rule.

## 2. Decisions from the product owner

| Question | Answer | How this plan applies it |
| --- | --- | --- |
| Sensitivity of videos and notes | Mostly general knowledge, low sensitivity | Private storage and short-lived video tokens are enough; video encryption stays out of the MVP |
| Protections wanted | Force a new password at first login; automatic logout after inactivity | SR-2 and SR-5 |
| Not selected | Two-factor login for admins; log of admin actions | Listed as accepted risks in section 8 |
| Session length | Stay logged in for 7 days | SR-5 logs users out after 5 days of inactivity (owner decision after review) |

## 3. Assets worth protecting

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| User accounts and password hashes | Account takeover, especially of admins | Neon database |
| Sessions | A stolen session acts as the user | Neon database and browser cookie |
| Exam answer keys and results | Cheating undermines certificates | Neon database |
| Certificates and progress | Proof of learning; must not be forged | Neon database |
| Personal data (names, emails) | Privacy | Neon database, backups |
| Lecture videos and notes | Low sensitivity, but company property | R2 private buckets |
| Secrets (database URL, R2 keys, video token secret) | A leak gives access to everything | Render, Vercel, Cloudflare and GitHub settings |
| Database backups | Contain all personal data | R2 backups bucket |
| Service availability and bills | Free tiers can be exhausted | All providers |

## 4. Trust boundaries and data flow

A trust boundary is a line where data passes from a less trusted place to a more trusted one, and must be checked.

1. **Browser to API (Render):** the browser is untrusted. Every request is authenticated, authorised and validated.
2. **Browser to video gateway (Cloudflare Worker):** the gateway trusts only tokens signed by the API.
3. **Browser to R2 (admin uploads only):** allowed only through one-time upload links the API created.
4. **API to Neon:** trusted, using a credential kept in environment variables.
5. **API to converter (GitHub Actions or another runner):** the converter opens uploaded files, so it gets only video-bucket credentials and no database access.
6. **Backup job to Neon and R2:** has its own limited credentials.
7. **Frontend host (Vercel) to browser:** delivers the app code; its security headers matter.

## 5. Threat analysis (STRIDE)

STRIDE means: **S**poofing identity, **T**ampering with data, **R**epudiation (denying an action), **I**nformation disclosure, **D**enial of service, **E**levation of privilege. Risk is my estimate: High, Medium or Low.

| ID | Threat | STRIDE | Risk | Main mitigations |
| --- | --- | --- | --- | --- |
| T1 | Guessing or reusing passwords to log in as someone | S | High | SR-1, SR-3 |
| T2 | Stolen session cookie or lost phone with a live session | S, I | Medium | SR-4, SR-5 |
| T3 | Employee calls admin routes directly | E | High | SR-6, SR-7 |
| T4 | Employee reads or changes another employee’s enrollment, attempt or certificate by changing an ID | I, E | High | SR-8 |
| T5 | Skipping the order: opening a locked lecture or starting the exam early | T, E | Medium | SR-9 |
| T6 | Cheating in exams: reading correct answers from the network, extending the timer, changing the browser clock | T | High | SR-15, SR-16 |
| T7 | Faking lecture progress with scripts or fast-forwarding | T | Medium | SR-17 |
| T8 | Forging or duplicating a certificate | T | Medium | SR-18 |
| T9 | SQL injection through any input | T, I | High | SR-10, SR-11 |
| T10 | Script injection (XSS) through course text or question text | T, I | Medium | SR-12 |
| T11 | Another site making the browser send requests with the user’s cookie (CSRF) | T | Medium | SR-4, SR-13 |
| T12 | Malicious or oversized upload (wrong file type, huge file) | T, D | Medium | SR-21 |
| T13 | A crafted media file attacking FFmpeg or the converter | T, E | Medium | SR-22 |
| T14 | Sharing or reusing video links; hotlinking | I | Low | SR-19, SR-20 |
| T15 | Forging a video token to stream anything | S, T | Medium | SR-20 |
| T16 | Secrets leaked in code, logs or chat | I | High | SR-23, SR-24 |
| T17 | Flooding the API or Worker; running up free-tier limits or bills | D | Medium | SR-3, SR-10, SR-29 |
| T18 | Admin account compromised | E | High | SR-1, SR-2, SR-3; accepted risk in section 8 |
| T19 | Admin-set temporary passwords shared and never changed | S | Medium | SR-2 |
| T20 | Backups or logs exposing personal data | I | Medium | SR-27, SR-28 |
| T21 | Vulnerable or malicious packages (supply chain) | T, E | Medium | SR-26 |
| T22 | Error messages or login responses revealing internals or which emails exist | I | Low | SR-3, SR-14 |
| T23 | Nobody can tell who did what after an incident | R | Low to Medium | SR-27; accepted risk in section 8 |
| T24 | Page framed by another site (clickjacking) | T | Low | SR-12 |

## 6. Security requirements

Each requirement is written so it can be tested.

### Accounts and sessions

- **SR-1** Passwords are hashed with argon2, follow the PRD password rules (FR-1.5), and are never logged or returned by any API.
- **SR-2** **Forced first-login password change:** when an admin creates a user or resets a password, the account is flagged “must change password”. Until it is changed, the API allows only the change-password, logout and /me routes. Temporary passwords are generated randomly by the system, not typed by hand.
- **SR-3** Login attempts are limited: after 5 failed attempts for the same email and address within 15 minutes, further attempts are refused for a short, growing delay. Counters are stored in the database so they survive restarts. The error message and response are the same whether the email exists or not.
- **SR-4** Session cookies are HttpOnly, Secure and SameSite, with a random 256-bit session id, set for the atomplus.in domain. A new session is created at login. Sessions are deleted on logout, when a user is blocked, and (other sessions) when the password changes.
- **SR-5** **Session lifetime:** a user is logged out after 5 days of inactivity, for employees and admins alike (owner decision). Any request restarts the 5 days. Blocking a user ends their sessions at once.

### Authorization

- **SR-6** Default deny: every route requires a valid session unless it is explicitly marked public (login, first-admin setup, health).
- **SR-7** Every admin route requires the admin role, enforced by a guard on the controller.
- **SR-8** Every employee route checks that the record belongs to the logged-in user. A record owned by someone else returns “not found”. IDs are random UUIDs.
- **SR-9** Lecture access and exam start re-check on the server that every earlier item is complete and that the user is enrolled and active.

### Input, output and browser protections

- **SR-10** Every request body, query and parameter is validated against a whitelist of fields and types; unknown fields are rejected; JSON bodies are limited in size (for example 1 MB).
- **SR-11** No hand-written SQL. All queries go through Prisma with parameters.
- **SR-12** User and admin text is always shown as plain text. No raw HTML injection. The frontend sends a Content-Security-Policy and clickjacking protection (frame-ancestors none); the API sends standard security headers (Helmet).
- **SR-13** CORS allows only the exact frontend address, with credentials. State-changing requests also check the Origin header.
- **SR-14** Errors returned to users are short and generic; stack traces and internal details go only to the server log.

### Exams, progress and certificates

- **SR-15** Correct answers are never sent to the browser before the exam is submitted.
- **SR-16** The exam timer runs on the server clock. Answers saved after expiry are ignored.
- **SR-17** Lecture progress credit per heartbeat is capped at real elapsed time, and at most one heartbeat every 5 seconds is accepted.
- **SR-18** Certificates are created only by the server after a passing grade, one per enrollment, with a unique number. A certificate PDF can be downloaded only by its owner or an admin.

### Video and file storage

- **SR-19** All R2 buckets are private, with no public access and no public development URL. Files are reached only through API-issued tokens or one-time links.
- **SR-20** Video tokens are signed with HMAC-SHA256, contain the lecture id and an expiry (lecture length plus margin, at most 4 hours), and are checked in constant time. The secret is at least 32 random bytes, kept only in environment variables, and can be rotated.
- **SR-21** Upload links cover one exact file name and expire within an hour. After upload, the API checks the size (1 GB at most) and the converter checks it is a real MP4 before processing. PDF notes are limited in size and type-checked.
- **SR-22** The converter runs in a short-lived, isolated environment with time and memory limits. It has no database access and only video-bucket credentials.

### Secrets, dependencies, logging and operations

- **SR-23** No secrets in the repository. GitHub secret scanning and push protection are on. The repository holds only an .env.example with fake values.
- **SR-24** Least-privilege keys: separate R2 tokens for the API, the converter and the backup job, each limited to the buckets it needs. Keys are rotated if exposed.
- **SR-25** All traffic uses HTTPS, with HSTS.
- **SR-26** Lock files are committed. Dependabot or an audit step in CI flags vulnerable packages. GitHub Actions are pinned to exact versions.
- **SR-27** Server logs record logins (success and failure), password changes, admin actions and exam submissions, with user id and time. Passwords, tokens and cookies are never logged. Logs are kept for about 30 days, subject to what the free Render plan retains.
- **SR-28** A daily dump of the important user data only (users, enrollments, lecture progress, exam attempts and certificates) goes to a private R2 backups bucket and is kept 30 days. Courses, lectures and notes are not backed up by the platform; the product owner keeps the originals in local storage. A restore is tested before launch and every few months.
- **SR-29** Billing and usage alerts are set on every provider, with an alert when Neon compute hours pass 80% and when R2 storage passes 8 GB.

## 7. Privacy, retention and backups

- **Personal data held:** name, work email, password hash, progress, exam score, certificates. No sensitive categories, no third-party trackers or analytics.
- **Retention:** data is kept while the account exists. Removing a user deletes their data (PRD FR-8.5). Blocking keeps it.
- **Backups:** a removed user’s data can remain in backups for up to 30 days, until those backups expire.
- **Error tracking:** if a tool such as Sentry is added, it must not receive passwords, tokens or personal details.

## 8. Accepted risks and later recommendations

- **No two-factor login for admins.** A stolen admin password gives full control. Mitigated by the password rules, login limits and a short admin idle timeout. Recommended later.
- **No in-app log of admin actions.** Server logs (SR-27) give limited tracing. Recommended later if audit needs grow.
- **5****-day sessions** raise the exposure of a lost or shared device. Mitigated by admins being able to block a user, which ends their sessions at once.
- **Screen recording and screenshots of lectures cannot be prevented.** Acceptable because the content is low sensitivity.
- **Employees can share exam answers.** Shuffling reduces this; a larger question pool is a later improvement.
- **Free-tier limits** can be used up by abuse. This affects availability and cost, not data, and is covered by alerts (SR-29).

* **Course structure and exam questions are not backed up.** They live in the database but, by the owner’s decision, only user data is backed up. If the database were lost, courses, sections and exam questions would need to be re-created and videos converted again from the locally kept originals. Including those small tables in the backup is a cheap option for later.

## 9. Changes this plan causes in other documents

- **Database:** users gets a must\_change\_password flag; sessions get a last\_activity time; a login\_attempts table stores failed-login counters.
- **API:** PATCH /me/password also clears the must-change flag; every route follows the default-deny rule.
- **PRD:** a new requirement for forced first-login password change.

## 10. Verification checklist

### Automated tests

- Every API route except login, first-admin setup and health returns 401 without a session.
- An employee session on any /admin route returns 403.
- Employee A requesting employee B’s enrollment, attempt or certificate by ID gets “not found”.
- A locked lecture access request and an early exam start are refused.
- No exam API response contains correct-answer data before submission.
- An answer saved after the exam expiry is ignored.
- Heartbeats faster than real time do not increase watched time.
- The sixth failed login within 15 minutes is refused, and the message is the same for unknown and known emails.
- A user flagged “must change password” can call only the allowed routes.
- A blocked user’s existing session stops working immediately.
- Quote characters, SQL fragments and script tags in every text field are stored safely and shown as plain text.
- An upload that is not an MP4, or is over 1 GB, is rejected.

* A session unused for 5 days is rejected, and any request within the 5 days restarts the count.

### Gateway and storage checks

- A video request with no token, an expired token, a changed token, or a token for another lecture returns 403.
- A direct address to an R2 object, without a token, fails.
- No R2 bucket allows public listing or public reads.

### Configuration checks

- Cookies show HttpOnly, Secure and SameSite flags.
- Security headers (CSP, HSTS, frame protection) are present on the frontend and API.
- CORS accepts only the exact frontend address.
- A secret scan of the whole repository history finds nothing.
- Dependency audit shows no high or critical vulnerabilities.
- Billing and usage alerts exist on every provider.

### Before launch

- A backup restore has been done successfully into a test database.
- All temporary passwords were changed at first login during a trial run.

* A short manual review of the admin screens for any user-supplied text rendered unsafely.

## 11. Questions for the product owner

1. Your two choices (automatic logout after inactivity, and 5-day logins) need a number for the inactivity time. I propose 12 hours for employees and 1 hour for admins, with a 5-day maximum. Is that right?\
Ans: user must logout after exact 5 days of inactivity.
2. Should password resets by an admin also force a password change at next login? I have assumed yes.\
Ans: yes
3. Are you comfortable with the accepted risks in section 8, in particular no admin two-factor login for now?\
Ans: yes, we will work on it later versions.
