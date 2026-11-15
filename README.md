# AtomPlus Learn

An internal learning platform for AtomPlus Technologies employees: recorded lectures, a timed exam per course, and certificates on passing.

> Status: planning complete, build not started. See `docs/` for the product and technical documents.

## What it does

- Employees enroll in courses, watch lectures in order, take a timed exam and download a certificate.
- Admins add users, build courses (sections, lectures, PDF notes, exam questions) and see progress.
- Works on phones and laptops.

## Tech stack

| Part | Technology |
|---|---|
| Frontend (`frontend/`) | React, TypeScript, Vite, Tailwind CSS, hls.js |
| Backend (`backend/`) | NestJS, TypeScript, Prisma |
| Database | Neon PostgreSQL |
| Files and video | Cloudflare R2 (HLS streaming) |
| Video gateway (`gateway/`) | Cloudflare Worker that checks signed tokens |
| Video converter (`converter/`) | FFmpeg, MP4 to HLS |

## Repository layout

```
frontend/   React web app
backend/    NestJS API
converter/  MP4 to HLS conversion job
gateway/    Cloudflare Worker in front of R2
docs/       PRD, technical design, security plan, Git workflow
.github/    Issue and pull request templates, automation
```

## Getting started

Setup instructions are added with the first code (build phase 1).

## Documentation

- [Git workflow](docs/GIT-WORKFLOW.md)
- [Security policy](SECURITY.md)
- [Documentation index](docs/README.md): PRD, technical design, security plan, API, database and test plan
- [AI assistant instructions](AGENTS.md)

## Security and secrets

This repository is **public**. Never commit passwords, keys, tokens, database URLs, real user data, real certificate logos or signatures, or internal company material. Use `.env` files locally (ignored by Git) and each provider's secret settings in production. Only `.env.example` files with fake values are committed.

## Ownership and license

Owned by AtomPlus Technologies. No open-source license is granted yet: **the product owner must decide this before launch** (until then, all rights are reserved).
