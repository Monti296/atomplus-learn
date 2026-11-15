# Copilot instructions

Follow `AGENTS.md` in the repository root. It is the single source of instructions for this project; read it before suggesting or writing code.

Key reminders:

- Requirements are in `docs/PRD.md`; security rules are SR-1 to SR-29 in `docs/SECURITY-PLAN.md`.
- All business rules are enforced on the server. The frontend never decides access, unlocking or grading.
- TypeScript strict, NestJS DTO validation with unknown fields rejected, Prisma only (no raw SQL), npm as package manager.
- The repository is public: never include secrets, real data or internal material in code, tests, comments or examples.
- Inspect existing code first, explain the plan before large changes, keep changes small, and add tests with every feature.
