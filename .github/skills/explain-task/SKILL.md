---
description: Explain a finished task or the current branch to me step by step in plain language
agent: ask
---

# Explain it to me

Explain the work for **${input:taskId:the current branch}**. Compare the current branch with `main` to see what changed, and read [docs/BACKLOG.md](../../docs/BACKLOG.md) for what the task was supposed to do.

I am the product owner and **not an expert programmer**. Use simple English and explain every technical term the first time.

Please give me:

1. **The goal** of the task in one or two sentences.
2. **A guided tour, step by step:** go through the changed files one by one in a sensible order. For each file say what it is for, what the important parts do, and how it connects to the others.
3. **The flow as a story:** follow one example from start to finish (for example, "an employee clicks Enroll, and then...").
4. **Why it was done this way**, and one alternative that was not chosen.
5. **What could break it**, and which test protects against that.
6. **Three questions I could ask myself** to check that I really understood it, with the answers at the end.

Do not change any files.
