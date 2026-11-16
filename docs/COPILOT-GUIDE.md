# Building task by task with GitHub Copilot in VS Code

Copilot writes the code for each backlog task and explains every step. You stay in charge: it shows a plan first and waits for your "go". Nothing is pushed, merged or deployed without you.

## One-time setup

1. Install **VS Code**, **Git** and **Node.js 24** (`nvm use` reads `.nvmrc`).
2. In VS Code install the **GitHub Copilot** extension and sign in with your GitHub account.
3. Open the repository folder in VS Code (File, Open Folder).
4. Open the **Chat** view and choose **Agent** mode in the mode picker.
5. Type `/` in the chat box. You should see **implement-task**, **explain-task** and **review-before-pr**. They come from `.github/prompts/`.

If the commands do not appear: type `/prompts` to open the prompt file menu, or attach the file yourself by typing `#file:.github/prompts/implement-task.prompt.md` in the chat and then writing "Do this for task T-002".

The same workflows are also available as reusable skills in `.github/skills/`: `implement-task`, `explain-task` and `review-before-pr`. Use the prompt files for slash commands and the skill files for agents or tools that load repository skills.

## The loop: repeat for every task

1. **Start clean.** In a terminal run `git checkout main` then `git pull`. Open a **New Chat** (one task per chat keeps Copilot focused).
2. **Start the task.** Type `/implement-task` and enter the task id when asked (for example `T-002`).
3. **Read the plan.** Copilot lists the goal, steps, files, new packages, risks and anything only you can do. Ask questions. Say **go** when you are happy, or tell it what to change.
4. **Follow along.** After each small step Copilot tells you what it did, why, and how to see it working. If you do not understand something, say "explain that more simply".
5. **Do your parts.** When Copilot asks you to click something on a website (Render, Vercel, Neon, Cloudflare, GitHub), do it and tell Copilot when it is done.
6. **Read the final report.** It has a plain-language summary, the flow as a story, the files changed, new words, tests and results, how to check it yourself, risks, and what comes next. Try the "check it yourself" items.
7. **Second opinion.** Open a new chat and run `/review-before-pr`. It reviews the branch and writes a pull request description.
8. **Open the pull request.** Push the branch and open a pull request on GitHub (you do this). Wait for the automated checks (after T-005), read the diff yourself, and **squash and merge**.
9. **Learn.** If anything is still unclear, run `/explain-task` for a guided tour of what changed.
10. **Next task.** Tick it off and start again from step 1.

## Order of work

Do the tasks in **ID order**: T-002, T-003, T-004 and so on. Every task only depends on lower-numbered ones, so this order is safe. T-000 (create the repository) is yours, and T-001 is already prepared.

## Tasks that need something from you

| Task | You will need to |
|---|---|
| T-000 | Create the GitHub repository and turn on the settings |
| T-015 | Create the Render, Neon and Vercel projects; add DNS records for learn, api and video |
| T-018 | Create the Cloudflare R2 buckets and access keys |
| T-020 to T-022 | Add secrets to GitHub Actions and allow the conversion workflow |
| T-024 | Create the Cloudflare Worker and its route on the video subdomain |
| T-041 and T-042 | Add backup secrets; set billing and usage alerts on each provider |
| T-044 | Run the pilot, supply the real certificate logo and signatory, decide the license |

For all of these Copilot gives you click-by-click steps. It must never ask you to paste a key or password into the chat.

## Good habits

- **One task, one chat, one branch, one pull request.**
- If Copilot starts doing more than the plan, say: "Stop. Only do step N of the plan."
- If something fails, copy the **exact error message** and ask Copilot first. If you are still stuck, bring the error and the final report to me.
- Never merge when the checks fail.
- Keep the real keys out of the chat, out of files in the repository, and out of screenshots. The repository is public.
- Read each diff yourself, even if Copilot wrote it.
