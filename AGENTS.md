# AGENTS.md: instructions for AI coding assistants

Read this file fully before changing anything. It applies to every tool (GitHub Copilot, chat, agents).

## 1. What this project is

AtomPlus Learn is an **internal learning platform** for AtomPlus Technologies (biogas upgrading and Bio-CNG plants), for **fewer than 50 employees**. Seniors record lectures once; employees learn on their own, pass a timed exam per course and earn a certificate. Admins manage users and courses. It must work well on **phones and laptops**.

Goals: free senior staff from repeating explanations, onboard new joiners faster, and let staff learn new technology (SCADA/PLC, IoT, AI and data, software tools).

## 2. Source of truth

If anything here conflicts with these documents, the documents win; ask the owner before deviating.

- `docs/PRD.md`: product requirements (FR-x, NFR-x with acceptance criteria)
- `docs/TECHNICAL-DESIGN.md`: architecture and decisions
- `docs/SECURITY-PLAN.md`: threats and security requirements (SR-1 to SR-29)
- `docs/API.md`, `docs/DATABASE.md`, `docs/TEST-PLAN.md`, `docs/GIT-WORKFLOW.md`

Cite the requirement ids (for example FR-4.8, SR-9) in commits, tests and pull requests.

## 3. Stack

| Part | Folder | Technology |
|---|---|---|
| Frontend | `frontend/` | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, hls.js. Hosted on Vercel |
| Backend | `backend/` | NestJS, TypeScript, Prisma. Hosted on Render |
| Database | n/a | Neon PostgreSQL |
| Storage | n/a | Cloudflare R2 (S3-compatible API), private buckets |
| Video gateway | `gateway/` | Cloudflare Worker: verifies signed token, streams HLS from R2 |
| Converter | `converter/` | FFmpeg: MP4 to HLS (480p and 720p). Runs outside the API |

Package manager: **npm**. Pin Node.js to the current LTS in `.nvmrc` and `engines`.

## 4. Business rules you must not break

- **Accounts:** no public sign-up. Admins create users. First admin is created once through a one-time setup. A new or reset password is random and the user **must change it at first login** (SR-2). Password rules: longer than 6 characters, at least one uppercase letter, one number and one symbol, no character repeated three times in a row.
- **Course structure:** a course has numbered sections; a section has ordered lectures; the course has **one exam**, always the last item.
- **Strict order:** an item unlocks only when the previous one is complete. Enforce on the server, never only in the UI.
- **Lecture complete:** when 70% of its duration has been played. Progress comes from heartbeats every 10 seconds; credit per heartbeat is capped at real elapsed time. The player cannot be dragged forward; going back is allowed.
- **Exam:** unlocks after all lectures are complete. Timed (server clock), fixed pass mark, unlimited retakes until the first pass. Question and option order is shuffled each try. Question types: single-answer, multiple-answer (all correct options needed), true/false. Correct answers never reach the browser before submission. When time runs out, saved answers are graded as submitted. **Only the latest try is stored**; a retake replaces it. After a pass, the exam closes.
- **Certificate:** created by the server only on a pass; one per enrollment; unique number like AP-2026-0042; PDF generated on demand from stored snapshots.
- **Course progress percent** = completed items / total items (lectures plus the exam).
- **Courses page** shows only courses the employee has not enrolled in. Enroll moves the course to My Batch (button becomes Continue) and opens the play screen.
- **My Profile** shows only three count cards (ongoing, completed, certificates) that link to My Batch and Certificates.
- **Blocking** a user keeps their data and ends their sessions at once. **Removing** a user deletes their enrollments, progress, attempt and certificates.
- **Sessions:** a user is logged out after **5 days of inactivity**.
- **Video:** admins upload MP4 files under 1 GB (and PDF notes). The converter produces HLS at 480p and 720p, never above the source resolution. The original MP4 is deleted after a successful conversion. Employees can never download lecture videos.

## 5. Architecture rules

- The backend is a **modular monolith**. Modules: auth, users, courses, video, progress, exams, certificates. Modules talk through services, not by reaching into each other's tables.
- **All rules live on the server.** The frontend only displays and sends requests.
- Files and video live only in R2. Never store files on the Render server.
- Browsers upload straight to R2 with one-time upload links; the API never proxies large files.
- Video playback uses a short-lived HMAC-signed token in the URL path, checked by the gateway Worker (SR-20).
- Keep it portable: Docker for the backend, standard PostgreSQL through Prisma, R2 through the S3 API, configuration from environment variables only.
- Free-tier reality: the API may sleep and wake slowly. Keep startup fast and memory small. Do not add services (Redis, queues, email) without asking.

## 6. Coding conventions

- TypeScript strict mode. No `any` without a comment explaining why. Prefer small, typed functions.
- ESLint and Prettier run on every change. Follow `.editorconfig`.
- Backend: DTOs with class-validator, whitelist and **reject unknown fields**; Prisma only, **no raw SQL**; one consistent error shape `{ code, message }`; UUID ids; list endpoints paginated.
- HTTP methods: GET reads, POST creates or runs an action, PUT replaces, PATCH changes part of something, DELETE removes.
- API base path `/api/v1`. Document endpoints with Swagger decorators so `docs/API.md` stays true.
- Frontend: function components and hooks, server state with TanStack Query, no business rules in components, text always rendered as text (never raw HTML).
- UI: mobile-first and responsive; large tap targets (at least 40 px); sentence-case labels; visible focus; never rely on color alone.
- Design tokens: page `#F4EEFF`, soft lilac `#DCD6F7`, accent `#A6B1E1`, primary indigo `#424874`, white cards. Play screen uses darker indigos `#2B2F52`, `#1E2140`, `#161933`. Cards and the top bar use a **glassmorphism** style (translucent white, thin light border, soft shadow, backdrop blur). Do not use `#A6B1E1` for small text (contrast is too low).
- Names: `camelCase` variables, `PascalCase` components and classes, `kebab-case` file names, database tables `snake_case`.
- Comments explain why, not what.

## 7. Security rules (short list; full list in `docs/SECURITY-PLAN.md`)

1. Every route requires login unless explicitly public (login, first-admin setup, health). Admin routes require the admin role. Employee routes check ownership.
2. Validate all input. No raw SQL. Render user text as plain text.
3. Never log or return passwords, tokens or cookies. Errors are generic.
4. Session cookie: HttpOnly, Secure, SameSite. CORS allows only the frontend origin.
5. R2 buckets stay private. Never create public URLs.
6. **This repository is public.** Never commit secrets, `.env` files, keys, real user data, videos, backups, or the real certificate logo and signature. Only `.env.example` with fake values.
7. Login attempts are rate limited and counters live in the database.

## 8. Commands

The scripts below are created in the first build task. Keep these names in every package.

```
npm install          # install dependencies
npm run dev          # run locally
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # unit and integration tests
npm run test:e2e     # end-to-end tests (Playwright)
npm run build        # production build
```

## 9. Testing expectations

Follow `docs/TEST-PLAN.md`. In short: backend unit and integration tests for every rule above, plus a few end-to-end tests of the key journeys. Every acceptance criterion in the PRD and every item in the security checklist gets a test. Write the test with the feature, not later.

## 10. How to work

1. **Inspect first.** Read the relevant existing code and docs before editing. Do not assume.
2. **Explain the plan** before any substantial change (what files, why, which requirement ids). Wait for approval on large or risky changes.
3. **Small steps:** one issue per branch, one logical change per commit, Conventional Commits (`feat(backend): ...`). See `docs/GIT-WORKFLOW.md`.
4. **Ask** when a requirement is unclear or two documents disagree. Do not invent requirements.
5. **No new dependencies** without a short justification and owner approval. Prefer what is already in the stack.
6. **Run** lint and tests before saying a task is done, and state what you ran and what you did not.
7. **Never** push, merge, deploy, delete data or change settings or secrets without explicit approval.
8. Treat generated code as unreviewed: the owner reads every diff.

## 11. Definition of done

- Acceptance criteria of the linked requirement pass.
- Tests added and passing; lint clean.
- Works on a phone-width and a laptop-width screen (for UI).
- Security rules above respected; no secrets or real data added.
- Docs updated if behavior, setup or API changed.
