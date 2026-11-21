# Engineering backlog

Source for the GitHub issues. Generated from `docs/backlog.json`; edit the JSON, not the issues list, then regenerate.

Sizes are relative effort, not time: **S** small, **M** medium, **L** large. Priority: **P0** blocks other work, **P1** needed for the MVP, **P2** polish. Each task is one pull request where possible.

## Order of work and critical path

1. T-000 to T-006 set up the project and the base of the backend and frontend.
2. The login chain T-007, T-011, T-012 unlocks everything else.
3. The video chain is the riskiest part: T-018, T-020, T-021, T-022, T-024, T-026, T-029. Start the T-020 spike early.
4. The exam chain T-031, T-033, T-034, T-035 comes after enrollment and player state (T-025).
5. T-015 (first deployment) is placed early on purpose, to prove that login cookies work across the three subdomains before more is built.

Decision for T-020: during the free phase, video conversion runs as a GitHub Actions workflow (owner decision). It can later move to another runner by configuration only.

## Milestone 1 Foundation

_Login, users, My Profile, top navigation, deployment skeleton_

| ID | Task | Area | Size | Priority | Depends on |
|---|---|---|---|---|---|
| T-000 | Create the GitHub repository and apply the starter kit | infra | S | P0 | none |
| T-001 | Monorepo scaffold and tooling | infra | S | P0 | T-000 |
| T-002 | Backend skeleton | backend | M | P0 | T-001 |
| T-003 | Database setup and first migration | backend | M | P0 | T-002 |
| T-004 | Frontend skeleton and design system | frontend | M | P0 | T-001 |
| T-005 | CI on pull requests | infra | S | P1 | T-001 |
| T-006 | Password policy and hashing | backend | S | P0 | T-002 |
| T-007 | Login, logout, sessions and guards | backend | L | P0 | T-003, T-006 |
| T-008 | Login rate limiting | backend | S | P1 | T-007 |
| T-009 | First-admin one-time setup | backend | S | P0 | T-007 |
| T-010 | Admin user management API | backend | M | P0 | T-007, T-006 |
| T-011 | Profile and forced password change | backend | S | P0 | T-007 |
| T-012 | Login and forced password change screens | frontend | M | P0 | T-004, T-007, T-011 |
| T-013 | Top navigation and My Profile details | frontend | M | P1 | T-012 |
| T-014 | Admin users screen | frontend | M | P1 | T-010, T-013 |
| T-015 | First deployment and cookie domain check | infra | M | P0 | T-005, T-009, T-012 |

### T-000: Create the GitHub repository and apply the starter kit

- **Requirements:** SECURITY.md, docs/GIT-WORKFLOW.md
- **Depends on:** none
- **Area / size / priority:** infra / S / P0
- **Acceptance criteria:**
  - Public repository created from the starter kit and pushed to main
  - Branch rule on main, secret scanning, push protection and Dependabot alerts are on
  - Milestones and labels created (script in scripts/)
  - PRD, TECHNICAL-DESIGN and SECURITY-PLAN exported to docs/; contact filled in SECURITY.md
- **Tests:** None (owner task). Check by opening the repository settings.

### T-001: Monorepo scaffold and tooling

- **Requirements:** AGENTS.md section 8
- **Depends on:** T-000
- **Area / size / priority:** infra / S / P0
- **Acceptance criteria:**
  - Separate npm projects for frontend, backend, converter and gateway; Node LTS pinned in each project
  - TypeScript strict, ESLint, Prettier and the standard npm scripts exist in every package
  - A fresh clone installs and lints each package from its own folder
- **Tests:** Lint passes on the empty scaffold.

### T-002: Backend skeleton

- **Requirements:** SR-10, SR-13, SR-14, SR-25
- **Depends on:** T-001
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - NestJS app with environment-variable validation and a GET /health route
  - Global validation rejects unknown fields; errors use the { code, message } shape with no stack traces
  - Helmet security headers, CORS limited to the frontend origin, Swagger docs, Dockerfile
- **Tests:** Integration tests: health, validation rejection of unknown fields, error shape, CORS from an unknown origin.

### T-003: Database setup and first migration

- **Requirements:** docs/DATABASE.md: users, sessions, login_attempts
- **Depends on:** T-002
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Prisma connected to Neon (and a throwaway test database locally)
  - Migration creates users, sessions and login_attempts exactly as in DATABASE.md
  - Test helper resets the test database between tests
- **Tests:** Integration test creates and reads a user; migration applies on an empty database.

### T-004: Frontend skeleton and design system

- **Requirements:** NFR-1, glass design
- **Depends on:** T-001
- **Area / size / priority:** frontend / M / P0
- **Acceptance criteria:**
  - Vite React TypeScript app with router and TanStack Query
  - Palette tokens and glass card, top bar and button styles from the approved designs
  - Responsive shell that works at phone and laptop widths
- **Tests:** Component tests for the layout; manual check at 360 px and 1280 px wide.

### T-005: CI on pull requests

- **Requirements:** SR-26, TEST-PLAN
- **Depends on:** T-001
- **Area / size / priority:** infra / S / P1
- **Acceptance criteria:**
  - GitHub Actions runs install, lint and tests on every pull request
  - Actions are pinned to exact versions; dependency cache enabled
  - Branch rule requires the checks to pass
- **Tests:** A deliberately failing test blocks the merge.

### T-006: Password policy and hashing

- **Requirements:** FR-1.5, SR-1
- **Depends on:** T-002
- **Area / size / priority:** backend / S / P0
- **Acceptance criteria:**
  - argon2 hashing service
  - Policy: longer than 6 characters, one uppercase, one number, one symbol, no character three times in a row
  - Random temporary password generator that satisfies the policy
- **Tests:** Unit tests for every rule and for generated passwords.

### T-007: Login, logout, sessions and guards

- **Requirements:** FR-1.1 to FR-1.4, SR-4 to SR-7
- **Depends on:** T-003, T-006
- **Area / size / priority:** backend / L / P0
- **Acceptance criteria:**
  - Login and logout; sessions stored in the database; cookie HttpOnly, Secure, SameSite; new session at login
  - Logged out after 5 days of inactivity; any request restarts the count
  - Default-deny global guard with a Public marker; admin role guard; blocked users rejected; GET /me
- **Tests:** Integration tests: 401 without session, 403 for employee on admin route, blocked user rejected, idle session rejected.

### T-008: Login rate limiting

- **Requirements:** SR-3
- **Depends on:** T-007
- **Area / size / priority:** backend / S / P1
- **Acceptance criteria:**
  - After 5 failed attempts for the same email and address in 15 minutes, attempts are refused with a growing delay
  - Counters live in the database; same message for known and unknown emails
- **Tests:** Integration tests: sixth failure refused; message identical for unknown email.

### T-009: First-admin one-time setup

- **Requirements:** FR-1.6
- **Depends on:** T-007
- **Area / size / priority:** backend / S / P0
- **Acceptance criteria:**
  - POST /setup/first-admin works only while no admin exists
  - After the first admin exists it returns an error and cannot be reused
- **Tests:** Integration tests for both cases.

### T-010: Admin user management API

- **Requirements:** FR-8.1, FR-8.5, SR-2, SR-4
- **Depends on:** T-007, T-006
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Create a user with a random temporary password returned once; list, rename, block and unblock
  - Reset password sets must_change_password; blocking deletes the user's sessions at once
  - Removing a user deletes their data; blocking keeps it
- **Tests:** Integration tests incl. blocked session stops working immediately; admin-only access.

### T-011: Profile and forced password change

- **Requirements:** FR-2.1 to FR-2.3, SR-2
- **Depends on:** T-007
- **Area / size / priority:** backend / S / P0
- **Acceptance criteria:**
  - PATCH /me changes the name only; email cannot be changed
  - PATCH /me/password needs the current password, enforces the policy, clears must_change_password and ends other sessions
  - A user who must change the password can call only the change-password, logout and /me routes
- **Tests:** Integration tests for each rule above.

### T-012: Login and forced password change screens

- **Requirements:** FR-1, FR-2.3
- **Depends on:** T-004, T-007, T-011
- **Area / size / priority:** frontend / M / P0
- **Acceptance criteria:**
  - Login page; protected routes; session handling
  - Forced change-password screen after first login
  - A friendly waking-up screen when the first request is slow (free hosting)
- **Tests:** Component tests; manual run of login, forced change and logout.

### T-013: Top navigation and My Profile details

- **Requirements:** FR-2.1 to FR-2.3, FR-3.5
- **Depends on:** T-012
- **Area / size / priority:** frontend / M / P1
- **Acceptance criteria:**
  - Top bar with Courses, My Batch, Certificates, My Profile (and Admin for admins); collapses to a menu on phones
  - My Profile shows name, read-only email, edit name and change password
- **Tests:** Component tests; manual check on phone and laptop widths.

### T-014: Admin users screen

- **Requirements:** FR-8.1
- **Depends on:** T-010, T-013
- **Area / size / priority:** frontend / M / P1
- **Acceptance criteria:**
  - List users with status badge; add user and show the temporary password once
  - Block or unblock, reset password and remove, with confirmation
- **Tests:** Component tests; manual run through all actions.

### T-015: First deployment and cookie domain check

- **Requirements:** TECHNICAL-DESIGN 4.2 and 4.4
- **Depends on:** T-005, T-009, T-012
- **Area / size / priority:** infra / M / P0
- **Acceptance criteria:**
  - Backend on Render, database on Neon, frontend on Vercel; environment variables set in the provider dashboards
  - Subdomains learn, api and video of atomplus.in; login cookie works across them in Chrome, Safari and Firefox
  - Free uptime monitor calls /health every 10 minutes in working hours
- **Tests:** Manual smoke test of first-admin setup, login and logout on a phone and a laptop.

## Milestone 2 Courses and video

_Course builder, upload and conversion, video gateway, Courses, My Batch, play screen_

| ID | Task | Area | Size | Priority | Depends on |
|---|---|---|---|---|---|
| T-016 | Course data model | backend | M | P0 | T-003 |
| T-017 | Admin course API | backend | M | P0 | T-016, T-007 |
| T-018 | R2 storage service and upload links | backend | M | P0 | T-016 |
| T-019 | Admin course builder | frontend | L | P1 | T-017, T-018, T-013 |
| T-020 | Spike: GitHub Actions conversion runner and contract | converter | S | P0 | T-018 |
| T-021 | Converter: MP4 to HLS | converter | L | P0 | T-020 |
| T-022 | Upload completion, conversion trigger and status | backend | M | P0 | T-018, T-021 |
| T-023 | Lecture upload screen | frontend | M | P1 | T-019, T-022 |
| T-024 | Video gateway Worker | gateway | M | P0 | T-018 |
| T-025 | Enrollment, Courses, My Batch, summary and player state | backend | L | P0 | T-017 |
| T-026 | Lecture access, heartbeat progress and notes link | backend | L | P0 | T-025, T-024 |
| T-027 | Courses and My Batch pages | frontend | M | P1 | T-025, T-013 |
| T-028 | Play screen layout | frontend | L | P1 | T-027, T-026 |
| T-029 | Video player | frontend | L | P0 | T-028, T-024 |
| T-030 | PDF notes on lectures | both | S | P2 | T-019, T-026 |

### T-016: Course data model

- **Requirements:** docs/DATABASE.md
- **Depends on:** T-003
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Migration for courses, sections, lectures, lecture_notes, enrollments and lecture_progress with the constraints in DATABASE.md
- **Tests:** Integration tests for uniqueness and cascade deletes.

### T-017: Admin course API

- **Requirements:** FR-8.2
- **Depends on:** T-016, T-007
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Create, edit, delete, publish and unpublish courses (cover, title, description, pass mark, time limit)
  - Add and reorder sections and lectures
- **Tests:** Integration tests incl. admin-only access and ordering.

### T-018: R2 storage service and upload links

- **Requirements:** FR-4.12, SR-19, SR-21, SR-24
- **Depends on:** T-016
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Private R2 buckets; S3 client; one-time multipart upload links limited to one key and under an hour
  - After upload, size over 1 GB is rejected; cover image and PDF note uploads with type and size checks
  - Bucket CORS allows only the app origin
- **Tests:** Integration tests with a fake S3; manual upload of a real 1 GB file.

### T-019: Admin course builder

- **Requirements:** FR-8.2
- **Depends on:** T-017, T-018, T-013
- **Area / size / priority:** frontend / L / P1
- **Acceptance criteria:**
  - Edit course details with cover upload
  - Add, rename and reorder sections and lectures
- **Tests:** Component tests; manual run at phone and laptop widths.

### T-020: Spike: GitHub Actions conversion runner and contract

- **Requirements:** TECHNICAL-DESIGN 4.4
- **Depends on:** T-018
- **Area / size / priority:** converter / S / P0
- **Acceptance criteria:**
  - Decided by the owner: conversion runs as a GitHub Actions workflow in the free phase
  - Workflow can be started by the API (workflow dispatch with the lecture id); contract defined: converter reports the result back; secrets and bucket access listed
  - Check GitHub terms and free-minute limits; keep the converter runnable elsewhere (maintainer computer or paid Render) by configuration only
- **Tests:** A manual conversion of one real MP4 to HLS runs end to end through a workflow.

### T-021: Converter: MP4 to HLS

- **Requirements:** FR-4.2, SR-22
- **Depends on:** T-020
- **Area / size / priority:** converter / L / P0
- **Acceptance criteria:**
  - Produces HLS at 480p and 720p, never above the source; reads the duration; checks the file is a real MP4
  - Writes to R2, reports to the API, deletes the original MP4 on success and keeps it on failure
  - Runs with time and memory limits and only video-bucket credentials
- **Tests:** Tests with small sample videos; failure case with a corrupt file.

### T-022: Upload completion, conversion trigger and status

- **Requirements:** FR-4.1
- **Depends on:** T-018, T-021
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Upload-complete marks the lecture processing and triggers the converter
  - Internal result endpoint (shared secret) sets ready or failed with a reason; a lecture stuck too long becomes failed; retry works
  - Only ready lectures are shown to employees
- **Tests:** Integration tests with a fake converter.

### T-023: Lecture upload screen

- **Requirements:** FR-4.1, FR-4.12
- **Depends on:** T-019, T-022
- **Area / size / priority:** frontend / M / P1
- **Acceptance criteria:**
  - Choose an MP4; progress bar; clear message for wrong type or size
  - Shows processing, ready or failed, with a retry button
- **Tests:** Component tests; manual upload.

### T-024: Video gateway Worker

- **Requirements:** SR-19, SR-20
- **Depends on:** T-018
- **Area / size / priority:** gateway / M / P0
- **Acceptance criteria:**
  - Verifies the HMAC token (signature, expiry, lecture scope) in constant time and streams the file from R2
  - Relative HLS segment addresses work with the token in the path
  - Deployed on the video subdomain
- **Tests:** Worker tests: no token, expired, changed and wrong-lecture tokens return 403; valid token streams.

### T-025: Enrollment, Courses, My Batch, summary and player state

- **Requirements:** FR-3, FR-4.5 to FR-4.8
- **Depends on:** T-017
- **Area / size / priority:** backend / L / P0
- **Acceptance criteria:**
  - Courses list shows only published, not-enrolled courses; enroll creates the enrollment
  - My Batch and summary counts; player state with sections, items, progress percent and locks
  - Unlock rule: an item opens only when every earlier item is complete
- **Tests:** Unit tests for unlock and progress percent; integration tests for ownership.

### T-026: Lecture access, heartbeat progress and notes link

- **Requirements:** FR-4.3, FR-4.9, SR-9, SR-17
- **Depends on:** T-025, T-024
- **Area / size / priority:** backend / L / P0
- **Acceptance criteria:**
  - Access endpoint re-checks login, enrollment, active status and unlock, then returns a signed playlist address
  - Heartbeat every 10 seconds adds watched time capped at real elapsed time; at most one per 5 seconds; complete at 70%
  - Short-lived link to a PDF note
- **Tests:** Unit tests for the cap and 70% rule; integration tests for locked and not-enrolled refusal.

### T-027: Courses and My Batch pages

- **Requirements:** FR-3.1 to FR-3.3
- **Depends on:** T-025, T-013
- **Area / size / priority:** frontend / M / P1
- **Acceptance criteria:**
  - Course cards with image, title, description and Enroll; Enroll works in the background, moves the course to My Batch and opens the play screen
  - My Batch has Ongoing and Completed sections with progress and a Continue button
- **Tests:** Component tests; manual check at phone and laptop widths.

### T-028: Play screen layout

- **Requirements:** FR-4.5 to FR-4.8
- **Depends on:** T-027, T-026
- **Area / size / priority:** frontend / L / P1
- **Acceptance criteria:**
  - Dark layout from the approved design: sidebar, progress bar, collapsible sections, check marks, locks, Back to My Batch, collapse button and Next
  - Phone layout stacks the sidebar above the video and can collapse it
- **Tests:** Component tests; manual run.

### T-029: Video player

- **Requirements:** FR-4.10, FR-4.11
- **Depends on:** T-028, T-024
- **Area / size / priority:** frontend / L / P0
- **Acceptance criteria:**
  - hls.js player with quality menu, speed menu, volume and fullscreen; no download option
  - Progress bar cannot be dragged forward; going back allowed; resumes where the employee stopped
  - Sends heartbeats and shows the completion state
- **Tests:** Component tests with a mocked player; manual playback on a phone and a laptop.

### T-030: PDF notes on lectures

- **Requirements:** FR-4.13
- **Depends on:** T-019, T-026
- **Area / size / priority:** both / S / P2
- **Acceptance criteria:**
  - Admin attaches PDF notes to a lecture; employees can open and download them from the lecture
- **Tests:** Integration test for access rules; manual check.

## Milestone 3 Exams and certificates

_Exam builder and engine, certificates, Certificates page_

| ID | Task | Area | Size | Priority | Depends on |
|---|---|---|---|---|---|
| T-031 | Exam data model | backend | S | P0 | T-016 |
| T-032 | Admin exam builder | both | L | P1 | T-031, T-019 |
| T-033 | Exam engine | backend | L | P0 | T-031, T-025 |
| T-034 | Certificates | backend | M | P0 | T-033 |
| T-035 | Exam screen | frontend | L | P1 | T-033, T-028 |
| T-036 | Certificates page and My Profile count cards | frontend | M | P1 | T-034, T-027 |

### T-031: Exam data model

- **Requirements:** docs/DATABASE.md
- **Depends on:** T-016
- **Area / size / priority:** backend / S / P0
- **Acceptance criteria:**
  - Migration for questions, options, exam_attempts (one row per enrollment) and certificates
- **Tests:** Integration tests for constraints.

### T-032: Admin exam builder

- **Requirements:** FR-8.2, FR-5.6
- **Depends on:** T-031, T-019
- **Area / size / priority:** both / L / P1
- **Acceptance criteria:**
  - Add questions of three types (single, multiple, true/false) with options and correct answers; set pass mark and time limit
  - Validation: every question has at least one correct option
- **Tests:** Integration and component tests; manual run.

### T-033: Exam engine

- **Requirements:** FR-5, SR-15, SR-16
- **Depends on:** T-031, T-025
- **Area / size / priority:** backend / L / P0
- **Acceptance criteria:**
  - Exam unlocks only after all lectures; start or resume; question and option order shuffled each try; only the latest try stored
  - Answers saved as the employee goes; server-clock timer; answers after expiry ignored; saved answers graded when time runs out
  - Correct answers never sent before submission; multiple-answer needs all correct options; exam closes after a pass
- **Tests:** Unit tests for grading and shuffling; integration tests for timer, expiry, no answer leak and early start refusal.

### T-034: Certificates

- **Requirements:** FR-6, SR-18
- **Depends on:** T-033
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Certificate created only on a pass, one per enrollment, unique number, name and course snapshot
  - PDF generated on demand with placeholder logo, signatory and wording; only the owner or an admin can download
- **Tests:** Integration tests: no certificate on fail; one on pass; foreign access refused; PDF opens.

### T-035: Exam screen

- **Requirements:** FR-5
- **Depends on:** T-033, T-028
- **Area / size / priority:** frontend / L / P1
- **Acceptance criteria:**
  - Timer chip, question navigation, inputs for each type, autosave, submit, result with pass or fail and a retake button
  - Usable at phone width with large tap targets
- **Tests:** Component tests; manual exam run on a phone.

### T-036: Certificates page and My Profile count cards

- **Requirements:** FR-2.4, FR-2.5, FR-3.4
- **Depends on:** T-034, T-027
- **Area / size / priority:** frontend / M / P1
- **Acceptance criteria:**
  - Certificates page lists certificates with PDF download
  - My Profile shows three count cards that link to My Batch and Certificates
  - Completed courses move to the Completed section after the pass
- **Tests:** Component tests; manual check.

## Milestone 4 Admin overview and polish

_Admin overview, glass design, states, accessibility_

| ID | Task | Area | Size | Priority | Depends on |
|---|---|---|---|---|---|
| T-037 | Admin overview | both | M | P1 | T-033, T-034, T-014 |
| T-038 | Polish: glass design, states and accessibility | frontend | L | P2 | T-036 |
| T-039 | Data lifecycle rules | backend | M | P1 | T-017, T-034 |

### T-037: Admin overview

- **Requirements:** FR-8.3
- **Depends on:** T-033, T-034, T-014
- **Area / size / priority:** both / M / P1
- **Acceptance criteria:**
  - Per employee and course: progress, latest exam score and certificate
  - Admin-only access
- **Tests:** Integration tests; manual check.

### T-038: Polish: glass design, states and accessibility

- **Requirements:** NFR-1, approved designs
- **Depends on:** T-036
- **Area / size / priority:** frontend / L / P2
- **Acceptance criteria:**
  - Glassmorphism applied to cards and top bar across pages
  - Loading skeletons, empty and error states; visible focus; contrast checked
  - No horizontal scrolling at phone width
- **Tests:** Accessibility checks; manual pass on a real phone.

### T-039: Data lifecycle rules

- **Requirements:** FR-8.5, DATABASE lifecycle
- **Depends on:** T-017, T-034
- **Area / size / priority:** backend / M / P1
- **Acceptance criteria:**
  - Removing a user deletes enrollments, progress, attempt, certificates and sessions; blocking keeps them
  - Deleting a lecture removes its R2 files; unpublishing keeps existing enrollments working
- **Tests:** Integration tests for each rule.

## Milestone 5 Hardening and launch

_Security pass, backups, monitoring, end-to-end tests, pilot and launch_

| ID | Task | Area | Size | Priority | Depends on |
|---|---|---|---|---|---|
| T-040 | Security verification pass | backend | M | P0 | T-037, T-039 |
| T-041 | Daily backup of important user data | infra | M | P1 | T-015 |
| T-042 | Monitoring and alerts | infra | S | P1 | T-015 |
| T-043 | End-to-end test suite | test | L | P1 | T-040 |
| T-044 | Pilot and launch checklist | infra | M | P0 | T-040, T-041, T-042, T-043 |

### T-040: Security verification pass

- **Requirements:** SECURITY-PLAN section 10
- **Depends on:** T-037, T-039
- **Area / size / priority:** backend / M / P0
- **Acceptance criteria:**
  - Every item in the security checklist is covered by a passing test or a recorded manual check
  - Headers, CORS, cookie flags, secret scan and dependency audit are clean
- **Tests:** The security checklist itself, run end to end.

### T-041: Daily backup of important user data

- **Requirements:** SR-28
- **Depends on:** T-015
- **Area / size / priority:** infra / M / P1
- **Acceptance criteria:**
  - Scheduled job dumps users, enrollments, lecture_progress, exam_attempts and certificates to a private R2 bucket, kept 30 days
  - A restore into a test database is done and checked
- **Tests:** The restore test.

### T-042: Monitoring and alerts

- **Requirements:** SR-27, SR-29
- **Depends on:** T-015
- **Area / size / priority:** infra / S / P1
- **Acceptance criteria:**
  - Billing and usage alerts on Render, Vercel, Neon and Cloudflare; alerts at 80% of Neon compute hours and 8 GB of R2
  - Structured logs of logins, password changes, admin actions and exam submissions, without secrets
- **Tests:** Trigger a test alert; review a sample of logs.

### T-043: End-to-end test suite

- **Requirements:** TEST-PLAN
- **Depends on:** T-040
- **Area / size / priority:** test / L / P1
- **Acceptance criteria:**
  - Playwright runs the five key journeys at phone and laptop widths
  - Runs in CI on pull requests and before release
- **Tests:** The suite itself passes on a clean environment.

### T-044: Pilot and launch checklist

- **Requirements:** TEST-PLAN before launch
- **Depends on:** T-040, T-041, T-042, T-043
- **Area / size / priority:** infra / M / P0
- **Acceptance criteria:**
  - Pilot with 3 to 5 employees; fixes made from feedback
  - Real certificate logo, signatory and wording set in production; license decided; README has setup steps
  - First admin created in production; temporary passwords changed at first login
- **Tests:** The pre-launch checklist.
