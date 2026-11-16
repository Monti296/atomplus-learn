---
description: Implement one backlog task safely, step by step, and explain it to me in plain language
agent: agent
---

# Implement one task and teach me as you go

The task to implement is **${input:taskId:T-002}**.

I am the product owner. I am **not an expert programmer**, so explain everything in plain, simple English. Whenever you use a technical term for the first time, give a one-line meaning.

## 1. Read before you do anything

Read these, in this order, and do not skip any:

1. [AGENTS.md](../../AGENTS.md): the rules for this project
2. [docs/BACKLOG.md](../../docs/BACKLOG.md): find the section for the task id above (requirements, dependencies, acceptance criteria, tests)
3. The documents the task points to: [PRD](../../docs/PRD.md), [technical design](../../docs/TECHNICAL-DESIGN.md), [security plan](../../docs/SECURITY-PLAN.md), [API](../../docs/API.md), [database](../../docs/DATABASE.md), [test plan](../../docs/TEST-PLAN.md)
4. The existing code in the folders this task will touch

Check that every task listed under "Depends on" is already done. If one is not, **stop and tell me** which one and why it matters.

## 2. Show me the plan first and wait

Before changing any file, give me a short plan:

- **Goal:** what will work when this task is finished, in one or two sentences
- **Steps:** a numbered list of the small steps you will take, in order
- **Files:** which files you will create or change, and why each one
- **New packages:** any new dependency, with a one-line reason (no new package without my approval)
- **Risks:** what could go wrong, and anything unclear or in conflict between documents
- **Things only I can do:** accounts, dashboards, keys or settings I must handle myself

Then **stop and wait for me to say "go"**. If something in the documents is unclear or two documents disagree, ask me instead of guessing.

## 3. Work in small steps

After I say "go":

1. Create a branch named as in [docs/GIT-WORKFLOW.md](../../docs/GIT-WORKFLOW.md), for example `feat/backend-skeleton`. Never work on `main`.
2. Do **one step at a time**. After each step tell me, in 2 to 4 sentences: **what you did**, **why**, and **how I can see it working**.
3. Write the tests together with the code, not later. Each acceptance criterion in the backlog needs at least one test.
4. Make small commits with Conventional Commit messages, for example `feat(backend): add health route`. Commit only after I have seen the step.
5. Follow the security rules (SR-x) and business rules in AGENTS.md. All rules are enforced on the server.

## 3b. When something needs me

If a step needs a website or dashboard (GitHub, Render, Vercel, Neon, Cloudflare), give me **click-by-click instructions** and wait until I confirm it is done. **Never ask me to paste a secret, key, password or database URL into this chat.** Tell me where to put it (the provider's settings, or a local `.env` file that is not committed). Only fake values go in `.env.example`.

## 4. Check your own work

Before you say the task is done:

- Run lint, the build and all tests. Fix what fails. Tell me the exact commands you ran and the results.
- Go through every acceptance criterion in the backlog and tell me, one by one, **how it is met and which test proves it**.
- Read your own diff line by line and look for leftovers, secrets, real data, unused code and anything outside this task's scope.
- Update the documents if behavior, setup, the API or the database changed.

## 5. Final report, in this exact shape

1. **What is working now:** plain-language summary.
2. **How it works, step by step:** walk me through the flow of the feature as a story, from the user's click to the result.
3. **Files changed:** a table with the file and a one-line reason.
4. **Words I should know:** the new technical terms in this task, with simple meanings.
5. **Tests:** what was tested and the results.
6. **How I can check it myself:** a few exact things to click or commands to run, and what I should see.
7. **Decisions and risks:** what you chose and why, and what is still risky or left for later.
8. **Next:** the next task in the backlog and what it needs from me.

## Rules you must never break

- Never push, merge, deploy, delete data or change settings without my explicit approval.
- Never commit secrets, `.env` files, real user data or internal company material. This repository is **public**.
- Do not add features, files or dependencies that are not part of this task.
- Do not invent requirements. If you are unsure, ask me.
- If a test fails and you cannot fix it, say so honestly. Do not hide it.
