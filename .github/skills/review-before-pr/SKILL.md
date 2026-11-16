---
description: Review my branch like a careful senior reviewer before I open a pull request
agent: ask
---

# Review this branch before I open a pull request

Compare the current branch with `main`. Review it against [AGENTS.md](../../AGENTS.md), the task in [docs/BACKLOG.md](../../docs/BACKLOG.md) (**${input:taskId:the current task}**), and the security plan in [docs/SECURITY-PLAN.md](../../docs/SECURITY-PLAN.md).

Explain in plain, simple English, because I am not an expert programmer.

Report:

1. **Does it meet every acceptance criterion?** Go through them one by one: met, partly met, or missing, with the file and test that prove it.
2. **Bugs or risks** you can see, most serious first.
3. **Security check:** secrets or real data in the diff, missing input validation, missing role or ownership checks, anything that breaks an SR rule.
4. **Scope check:** anything in the diff that is not part of this task.
5. **Tests:** what is missing or weak.
6. **A short pull request description** I can paste into GitHub, following [the template](../pull_request_template.md).

Do not change any files. Only report.
