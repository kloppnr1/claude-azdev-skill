---
name: devsprint-sprint
description: View current sprint backlog from Azure DevOps
argument-hint: "[--all]"
allowed-tools:
  - Bash
---

<objective>
Fetch and display the current sprint backlog from Azure DevOps with ANSI-colored terminal output. One command does everything — no intermediate steps needed.
</objective>

<execution_context>
Helper: ~/.claude/bin/devsprint-tools.cjs
Config file: .planning/devsprint-config.json
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

devsprint-tools.cjs CLI contract used by this command:

  node ~/.claude/bin/devsprint-tools.cjs show-sprint [--me] [--all] --cwd $CWD
    -> Fetches sprint metadata, fetches work items, renders colored board to stdout
    -> --me: filter to items assigned to the authenticated user
    -> --all: show ALL items including Resolved/Closed/Done (by default these are hidden)
    -> Default (no --all): only shows stories that are NOT Resolved/Closed/Done
    -> stdout: ANSI-colored sprint board (stories grouped with tasks, colored state indicators)
    -> exit 0 on success
    -> exit 1 on error (stderr contains message — e.g., no config, no active sprint, auth failure)
</context>

<process>
1. **Check that the helper exists:**
   Run: `test -f ~/.claude/bin/devsprint-tools.cjs`
   If missing: tell the user "Azure DevOps tools not installed. Check that ~/.claude/bin/devsprint-tools.cjs exists." Stop.

2. **Run the show-sprint command:**

   **Default (no argument):** Show only the user's own incomplete items:
   Run: `node ~/.claude/bin/devsprint-tools.cjs show-sprint --me --cwd $CWD`

   **If the user passed `--all`:** Show ALL items including completed:
   Run: `node ~/.claude/bin/devsprint-tools.cjs show-sprint --me --all --cwd $CWD`
</process>

<important>
- Do NOT output any thinking, planning, or narration text. No "Let me fetch...", "Now I'll render...", or similar messages.
- After running the command, **always copy the full output into your text response** so the user sees it directly without expanding the tool result. The Bash tool output is often truncated or collapsed — the user must see the full sprint board without clicking anything.
</important>

<success_criteria>
- Sprint board is displayed with a single command call
- No intermediate steps, no JSON juggling, no dynamic script construction
- No narration or thinking text — only the sprint board output
- By default only incomplete stories are shown
- --all flag shows everything including resolved/closed
- Errors produce clear, actionable messages from the helper script
</success_criteria>
