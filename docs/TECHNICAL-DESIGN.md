# AtomPlus Learn – Technical Design

Version 1.0 (approved) · Prepared with the software-builder workflow, technical architecture step

## 1. Summary

AtomPlus Learn is a small internal web app (under 50 users). The learning features (login, courses, exams, certificates) live in one NestJS application with a Neon PostgreSQL database. Videos and notes are stored in Cloudflare R2 and streamed as HLS through a small Cloudflare Worker that checks a short-lived access token. The React frontend is hosted separately from the backend. There are no microservices and no email system in the MVP. Hosting follows the product owner’s chosen services: Vercel (frontend), Render (backend), Neon (database) and Cloudflare R2 (videos and notes).

## 2. Technology choices and alternatives

| Area | Choice | Why | Alternative not chosen |
| --- | --- | --- | --- |
| Frontend | React + TypeScript (Vite), React Router, TanStack Query, Tailwind CSS, hosted on Vercel | Matches your stack; Tailwind makes the glassmorphism look and the phone/laptop layouts straightforward | Next.js: more than a logged-in-only app needs |
| Video player | hls.js with our own controls | Full control of speed, quality, no download button and no forward seeking | Ready-made players: harder to block forward seeking |
| Backend | NestJS + TypeScript, on Render | Your choice; its modules, guards and DTOs fit the module split and role checks well | Plain Express: less structure |
| Database | Neon PostgreSQL with Prisma | Relational data; typed queries and migrations; standard Postgres, so it can move later | MongoDB: weaker fit for relations |
| Login sessions | Server-side sessions in an HttpOnly cookie, stored in PostgreSQL | Blocking a user takes effect immediately | JWT tokens: harder to revoke |
| Password hashing | argon2 | Current best practice | bcrypt: also acceptable |
| Video conversion | FFmpeg in a separate converter service (same NestJS codebase) on Render, called by the API | No polling, so Neon can sleep; no Redis needed | pg-boss or BullMQ queues: keep the database or Redis busy |
| Storage | Cloudflare R2 (S3-compatible API) | Free 10 GB tier, free egress, and easy to swap for any S3 service | Storing files on the Render server: it has no permanent disk by default |
| Video delivery | Small Cloudflare Worker in front of R2 that checks a signed token | R2 has no built-in signed-cookie CDN like CloudFront; the Worker free tier is enough at this size | Public bucket: anyone could stream |
| Certificates | PDFKit, generated on demand | Simple, no browser needed | Puppeteer: heavier |

## 3. Architecture and responsibilities

**Browser (React app)** shows all screens for employees and admins. It holds no secrets and never decides who may see what.

**API (NestJS on Render)** is the only place where rules live: login, roles, enrollment, lecture unlocks, exam timing and grading, certificate issuing, admin actions. It is a modular monolith with separate modules for auth, users, courses, video, progress, exams and certificates.

**Converter (NestJS + FFmpeg on Render)** is a second service from the same codebase. The API tells it which lecture to convert; it downloads the MP4 from R2, produces HLS, writes it back and reports the result.

**Neon PostgreSQL** stores all structured data.

**Cloudflare R2** stores uploaded MP4 files, HLS output, PDF notes, course cover images and database backups, in private buckets.

**Video gateway (Cloudflare Worker)** sits in front of the video bucket. It serves a file only if the request carries a valid, unexpired token issued by the API.

**Service boundaries:** the browser talks to the API (JSON over HTTPS), to the video gateway (HLS), and, for admin uploads only, directly to R2 using one-time upload links, so a 1 GB file never passes through the API.

## 4. Hosting, cost reality and operations plan

I checked current pricing and limits in November 2026. They change, so confirm on each provider’s pricing page before buying.

### 4.1 What each service really gives you

| Service | Free tier | What it means for this project |
| --- | --- | --- |
| Vercel (frontend) | Hobby plan is free but only for personal, non-commercial use; commercial use needs Pro at $20 per user per month | AtomPlus is a company, so Hobby would breach the terms. The frontend is a static app, so free commercial-friendly hosts such as Cloudflare Pages work with no code change |
| Render (backend) | Free web service sleeps after 15 minutes idle and takes about a minute to wake; background workers have no free tier | A free API would make the first employee of the day wait. The cheapest always-on instance is $7 per month (0.5 CPU, 512 MB), enough for the API |
| Render (converter) | None | FFmpeg on 1 GB videos needs more than 0.5 CPU and 512 MB. A 1 CPU / 2 GB instance ($25 per month) is the sensible start |
| Neon (database) | Free: 1 GB storage, 100 compute-hours per month, sleeps after 5 minutes idle and wakes in a fraction of a second | Plenty for this app. Free restore window is only 6 hours, so extra backups are needed (4.3) |
| Cloudflare R2 (files) | 10 GB storage, 1 million writes and 10 million reads per month, free egress; after that $0.015 per GB per month | Overage is cheap. 10 GB holds very roughly 15 to 20 lectures of 20 minutes once converted (estimate; to be confirmed with real videos) |
| Cloudflare Worker | 100,000 requests per day free | Each lecture view is a few hundred small requests, so this is enough for under 50 users |

**Bottom line:** the data and file services can start free, but a reliable setup realistically needs a paid Render API instance, a larger paid converter instance, and either Vercel Pro or a free alternative for the frontend. Cloudflare Stream is a paid alternative that would remove the converter and the video gateway entirely; I have not chosen it because you asked for R2.

### 4.2 Domain and cookies

Use three subdomains of atomplus.in: learn (frontend), api (backend) and video (video gateway). Because they share one parent domain, login cookies are first-party and work in every browser, including Safari. Without a custom domain, the Vercel and Render default addresses are different sites and many browsers block the login cookie. A temporary workaround is to proxy /api through the frontend host, but a custom domain is the recommended route. Someone with access to DNS for atomplus.in must add the records.

### 4.3 Operations plan from day one

1. **Backups:** Neon’s own restore covers only the last 6 hours on the free plan. A scheduled job (for example a daily GitHub Actions workflow) runs pg\_dump against Neon for the important user data only (users, enrollments, lecture progress, exam attempts and certificates) and uploads the file to a private R2 backups bucket, keeping 30 days. Courses, lectures and notes are not backed up by the platform; the product owner keeps the originals in local storage. A restore test is done before launch and every few months.
2. **File storage:** videos, notes and cover images live only in R2. The Render servers keep nothing permanent.
3. **Environment variables:** all keys and database credentials are set in each provider’s dashboard, never in the repository. The repo holds only an .env.example with fake values. R2 keys are limited to the buckets they need and rotated if leaked.
4. **Scalability and portability:** the backend ships as a Docker container, uses standard PostgreSQL through Prisma, talks to R2 through the S3 API, and reads all settings from environment variables. Moving to another host, to S3 or to a bigger database then needs configuration changes, not a rewrite. The video gateway is the one Cloudflare-specific piece and is small.
5. **Monitoring:** billing alerts and usage alerts on Render, Vercel (if used), Neon and Cloudflare. A /health endpoint checked by a free uptime monitor. Alerts when Neon compute-hours pass 80% and when R2 storage passes 8 GB. Application errors go to structured logs, with an error tracker such as Sentry’s free plan as an option.

### 4.4 Free-first plan (decided)

The product owner decided to start on free tiers and upgrade when needed. The design supports this as follows.

- **Frontend:** Vercel Hobby for now. Vercel’s terms limit Hobby to personal, non-commercial use, so Vercel could ask for an upgrade or suspend the project. The plan is to move to Cloudflare Pages when needed, which needs no code change. The frontend avoids Vercel-specific features to keep that move easy.
- **API:** Render free web service. It sleeps after 15 minutes without traffic and takes about a minute to wake. To soften this, a free uptime monitor calls /health every 10 minutes during working hours, and the app shows a “waking up” screen if the first request is slow. The $7 always-on instance is the upgrade.
- **Database:** Neon Free, plus the daily backup to R2.
- **Files:** R2 free tier. The original MP4 is deleted after a successful conversion; a failed conversion keeps it so it can be retried.
- **Exam attempts:** only the latest try is stored; each retake replaces it.
- **Video conversion (decided):** a free Render instance is too weak for FFmpeg on 1 GB videos. The proposal is a GitHub Actions workflow in a private repository, started by the API when an upload completes. It downloads the MP4 from R2, converts it to HLS, uploads the result and reports back to the API. It uses GitHub’s free monthly minutes. Caveat: GitHub’s terms limit Actions to work related to the repository’s software, so check the terms and limits before relying on it. Alternatives are running the same converter on the maintainer’s computer or server, or a paid Render instance later. The API only says “convert lecture X”, so swapping the converter later is a configuration change.

## 5. Key flows

### 5.1 Admin uploads a lecture

1. Admin picks an MP4 (under 1 GB). The browser asks the API for upload links.
2. The browser uploads straight to R2 in parts (multipart) with a progress bar. The bucket allows cross-origin uploads only from the app’s address.
3. The browser tells the API the upload is complete. The lecture status becomes processing and the API calls the converter.
4. The converter downloads the MP4, converts it with FFmpeg into HLS at 480p and 720p (no upscaling above the source), reads the duration, and writes the files to R2.
5. Status becomes ready (and the original MP4 is deleted from R2), or failed with a message the admin can see; a failed lecture keeps its MP4 for retry. Admins can retry a failed conversion, and a lecture stuck in processing for too long is marked failed automatically.

A lecture is hidden from employees until it is ready.

### 5.2 Employee watches a lecture

1. The player asks the API for access to a lecture.
2. The API checks: logged in, enrolled, active account, and the lecture is unlocked (every earlier item completed).
3. The API creates a short-lived signed token for that lecture (valid for a few hours) and returns a playlist address that contains the token in its path.
4. hls.js loads the playlist from the video gateway. The Worker checks the token’s signature, expiry and lecture scope, then streams the file from R2. HLS segment addresses are relative, so they carry the same token and no cookies are needed.
5. The quality menu is built from the HLS renditions; speed uses the player playback rate.
6. Every 10 seconds the player sends a progress heartbeat. The server adds watched time but never faster than real time, so scrubbing or scripts cannot fake progress.
7. When watched time reaches 70% of the duration, the lecture is marked complete and the next item unlocks.

The player blocks dragging forward past the furthest point reached. The server rule is the real protection; the player rule is for usability.

### 5.3 Exam

1. Start: the server starts a new try (replacing the previously stored one), records the start and expiry time, and shuffles question and option order. Correct answers are never sent to the browser. If an unexpired attempt already exists, the employee resumes it instead.
2. Each answer is saved to the server as the employee goes, so nothing is lost if the browser closes.
3. Submit or timer end: the server grades what was saved. The timer is enforced by the server clock; answers saved after expiry are ignored.
4. Single-answer and true/false questions need the one correct option; a multiple-answer question counts only when all correct options are chosen.
5. Below the pass mark: the attempt is recorded as failed and the employee can start a new attempt, as many times as needed.
6. At or above the pass mark: the course is completed, a certificate is created and the exam closes. No further attempts are allowed after a pass.

### 5.4 Certificate

On pass, the server creates one certificate record per employee per course with a unique number (for example AP-2026-0042) and a snapshot of the employee name and course title. The PDF is generated on demand from that record using the AtomPlus logo, signatory and wording, so no PDF files need storing.

## 6. Database design

All tables use a UUID primary key and created/updated timestamps.

| Table | Main columns | Notes |
| --- | --- | --- |
| users | name, email (unique, lowercase), password\_hash, role (employee or admin), status (active or blocked) | Blocked users cannot log in |
| sessions | session id, user\_id, expiry | Deleted on logout or block |
| courses | title, description, cover\_image\_key, pass\_mark\_percent, exam\_time\_limit\_minutes, is\_published | One exam per course, so exam settings live here |
| sections | course\_id, title, position | Numbered, ordered |
| lectures | section\_id, title, position, duration\_seconds, source\_key, hls\_prefix, status (uploaded, processing, ready, failed), failure\_reason |  |
| lecture\_notes | lecture\_id, file\_key, file\_name | PDF notes |
| questions | course\_id, type (single, multiple, true\_false), text, position |  |
| options | question\_id, text, is\_correct, position |  |
| enrollments | user\_id, course\_id, enrolled\_at, completed\_at | Unique on (user\_id, course\_id) |
| lecture\_progress | enrollment\_id, lecture\_id, watched\_seconds, last\_position\_seconds, completed\_at | Unique on (enrollment\_id, lecture\_id) |
| exam\_attempts | enrollment\_id (unique), attempt\_number, started\_at, expires\_at, submitted\_at, score\_percent, passed, question\_order, answers | Holds the latest try only; a retake overwrites it |
| certificates | enrollment\_id (unique), user\_id, course\_id, certificate\_number (unique), issued\_at, user\_name, course\_title | Snapshot values |

**Relationships:** a course has many sections; a section has many lectures; a lecture has many notes; a course has many questions; a question has many options; a user has many enrollments; an enrollment has many lecture\_progress rows, at most one exam\_attempts row (the latest try) and at most one certificate.

**How one enrollment has many lecture\_progress rows.** An enrollment is one employee in one course, for example Amit in Biogas basics. A course contains many lectures and the employee watches each one separately, so we keep one progress row per lecture they have opened. The row is created the first time they open that lecture. Amit’s enrollment might look like this:

| Lecture | Watched so far | Completed |
| --- | --- | --- |
| What is biogas | 12:40 of 12:40 | Yes |
| Digestion process | 18:05 of 18:05 | Yes |
| Gas upgrading overview | 03:12 of 22:10 | No |
| Safety basics | no row yet (still locked) | No |

Course progress is the number of completed items divided by the total items.

**How exam attempts work.** An employee can try as many times as needed until one try passes. Only the latest try is stored: each new try replaces the previous one, and attempt\_number counts how many tries have been made. After a pass, no new try can start. My Batch and the admin overview show the latest score.

**Order and unlocking** are calculated, not stored: the course items run in section and lecture order with the exam last, and an item is unlocked when all earlier items are complete.

**Data lifecycle**

- Blocking a user keeps all their data.
- Removing a user deletes their enrollments, progress, attempts and certificates.
- Deleting a lecture removes its files from R2.
- Unpublishing a course hides it from the Courses page; existing enrollments keep working.
- After a successful conversion, the original MP4 is deleted from R2 to save space.
- Daily database backups are kept for 30 days in R2.

## 7. API outline

JSON over HTTPS under /api/v1. All routes need a session except login and the one-time setup. Admin routes need the admin role.

**Method rules used throughout:** GET reads, POST creates something or runs an action, PUT replaces the whole value, PATCH changes part of something, DELETE removes. Changing a password or a name changes part of the user, so those use PATCH.

**Auth and profile**

- POST /setup/first-admin (works only while no admin exists)
- POST /auth/login, POST /auth/logout
- GET /me, PATCH /me (name)
- PATCH /me/password (current and new password)
- GET /me/summary (the three counts)

**Employee learning**

- GET /courses (published, not yet enrolled)
- POST /courses/:id/enroll
- GET /me/batch (ongoing and completed)
- GET /courses/:id/player (sections, items, progress, locks)
- POST /lectures/:id/access (returns the signed playlist address)
- PATCH /lectures/:id/progress (heartbeat)
- GET /notes/:id (short-lived link to the PDF)
- POST /courses/:id/exam-attempts (start or resume)
- PUT /exam-attempts/:id/answers (save answers)
- POST /exam-attempts/:id/submit
- GET /me/certificates, GET /certificates/:id/pdf

**Admin**

- Users: GET and POST /admin/users; PATCH /admin/users/:id (name, block or unblock); PATCH /admin/users/:id/password (reset); DELETE /admin/users/:id
- Courses: GET and POST /admin/courses; PATCH /admin/courses/:id (details and publish or unpublish); DELETE /admin/courses/:id
- Structure: POST and PATCH /admin/courses/:id/sections; POST and PATCH /admin/sections/:id/lectures
- Upload: POST /admin/lectures/:id/uploads (start), POST /admin/lectures/:id/uploads/complete, POST /admin/lectures/:id/retry
- Notes and cover image: POST /admin/lectures/:id/notes, POST /admin/courses/:id/cover
- Exam: GET, POST, PATCH and DELETE /admin/courses/:id/questions
- Overview: GET /admin/overview (each employee, per course progress, latest score, certificate)

**Other:** GET /health for uptime monitoring.

**Conventions:** consistent error format with a code and a plain message, input validated on every route, and pagination on lists.

## 8. Authentication and authorization

- Login with email and password; the session cookie is HttpOnly, Secure and SameSite, set for the atomplus.in domain so the frontend and API share it.
- Password rules from the PRD are enforced on the server whenever a password is set or changed.
- Two roles. Every route declares which role it needs, and every employee route also checks that the data belongs to that user (for example only your own enrollment and exam attempts).
- Blocking a user deletes their sessions at once.
- The video gateway never trusts the browser: it accepts only tokens signed by the API with a secret shared through environment variables.
- Full threat modelling (CSRF, rate limiting, injection, logging and so on) is the next workflow step.

## 9. Performance, reliability, scaling and maintainability

- **Performance:** video bytes come from Cloudflare, not the API, so the API only handles small JSON requests. At under 50 users a Starter API instance is enough.
- **Reliability:** exam answers and progress are saved as they happen. Conversion can be retried. Daily backups sit outside Neon.
- **Cold starts:** the free API sleeps after 15 idle minutes and takes about a minute to wake, which section 4.4 softens with a keep-alive check; a paid always-on instance removes it. Neon wakes in a fraction of a second.
- **Scaling path:** a larger Render instance, Cloudflare Workers Paid ($5 per month) if video traffic grows, a bigger Neon plan for a longer restore window, or Cloudflare Stream to replace the converter and gateway.
- **Maintainability:** one repository, TypeScript end to end, Prisma migrations, Docker for the backend, and automated tests added in the later CI step.

## 10. Decisions

**Answered**

- Exam after passing: attempts continue until the first pass, then the exam closes.
- Database: Neon PostgreSQL.
- Stack and hosting: NestJS on Render, Vercel for the frontend, R2 for files.
- Emails: none in the MVP (admins set passwords).

**Questions and your answers**

1. **Frontend hosting:** Vercel Pro ($20 per user per month), or a free commercial-friendly host such as Cloudflare Pages (no code change)?\
Ans: start with free vercel when needed we will move to cloudflare pages in future.
2. **Converter budget:** a paid Render instance of about $25 per month for FFmpeg, or switch video handling to Cloudflare Stream (paid, no converter or gateway to maintain)?\
Ans: use free options only in initial in future we will upgrade.
3. **Original MP4 files:** delete after conversion to save R2 space (recommended), or keep them for re-converting later?\
Ans delete after conversion to save R2
4. **Attempt history:** keep every exam attempt (recommended, the PRD wording “only the latest attempt is recorded” would change to “only the latest is shown”), or store only the latest?\
Ans only latest
5. **Domain:** who can add the learn, api and video subdomains of atomplus.in?\
Ans: me
6. **Video encryption (HLS AES-128):** adds a little protection against saving streams but also complexity; recommended later, not for the MVP.

**Decision from the owner:** in the free phase, video conversion runs as a GitHub Actions workflow (option a). If GitHub’s terms ever block this use, the same converter can run on the maintainer’s computer or server, or on a paid Render instance, by changing configuration only.

**Not yet answered:** video encryption (HLS AES-128). It stays out of the MVP unless you say otherwise.
