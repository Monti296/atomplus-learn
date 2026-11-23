# Git workflow

Solo project, so we use simple **GitHub Flow**: `main` is always working and deployable, and every change reaches it through a short-lived branch and a pull request.

## Branches

- `main`: protected. Never commit to it directly.
- Work branches, branched from `main`, kept small and short-lived (days, not weeks):
  - `feat/<short-name>` new behavior, for example `feat/enroll-flow`
  - `fix/<short-name>` bug fix
  - `chore/<short-name>` tooling, dependencies, config
  - `docs/<short-name>` documentation only
- Delete the branch after merging.

## Commit messages (Conventional Commits)

Format: `type(scope): short summary in the imperative`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `security`.
Scopes: `frontend`, `backend`, `converter`, `gateway`, `docs`, `repo`.

Examples:

- `feat(backend): add enroll endpoint`
- `fix(frontend): stop sidebar overflow on phones`
- `security(backend): rate limit login attempts`

Rules: one logical change per commit, summary under about 72 characters, explain the why in the body when it is not obvious.

## Pull requests

1. Push the branch and open a PR into `main` using the template.
2. Link the issue with `Closes #<number>`.
3. Wait for the automated checks in `.github/workflows/ci.yml` to pass. They run on every pull request: install, lint, build and tests for `frontend`, `converter`, `gateway` and `backend`. The backend tests run against a throwaway Postgres database inside the check, never against Neon.
4. Read your own diff line by line before merging, especially AI-generated code.
5. Merge with **squash and merge**, using a Conventional Commit title, so `main` has one clean commit per change.

## Issues and milestones

- One issue per piece of work, written from the issue template.
- Milestones follow the build phases:
  1. Foundation: login, users, My Profile, top navigation
  2. Courses and video: course pages, upload, conversion, player
  3. Exams and certificates
  4. Admin overview and polish
  5. Hardening and launch
- Labels: `feature`, `bug`, `chore`, `docs`, `security`; area labels `frontend`, `backend`, `converter`, `gateway`, `infra`.

## Releases

Tag production releases on `main` as `v0.1.0`, `v0.2.0` and so on (semantic versioning) and write short notes of what changed.

## Hotfixes

Same as any change: a `fix/` branch and a PR, just handled first.

## Secrets and data (public repository)

- Never commit secrets, `.env` files, real user data, backups, videos or internal company material.
- If a secret is committed by mistake, treat it as leaked: **rotate it immediately**, then remove it from the code. Deleting the commit is not enough.
- GitHub secret scanning and push protection stay on.

## Repository settings checklist (done once on GitHub)

- Branch rule for `main`: require a pull request, require status checks to pass (once CI exists), block force pushes, block deletion. With a solo project, required approvals can be 0.
- Squash merging only; automatically delete merged branches.
- Enable secret scanning, push protection, Dependabot alerts and private vulnerability reporting.
- Never store secrets in the repository. Production secrets go in Render, Vercel, Cloudflare and GitHub Actions secrets.
