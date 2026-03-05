---
name: azdev-sprint
description: View current sprint backlog from Azure DevOps
argument-hint: "[--all]"
allowed-tools:
  - Bash
---

<objective>
Fetch and display the current sprint backlog from Azure DevOps with ANSI-colored terminal output. One command does everything — no intermediate steps needed.
</objective>

<execution_context>
Helper: ~/.claude/bin/azdev-tools.cjs
Config file: .planning/azdev-config.json
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

azdev-tools.cjs CLI contract used by this command:

  node ~/.claude/bin/azdev-tools.cjs show-sprint [--me] --cwd $CWD
    -> Fetches sprint metadata, fetches work items, renders colored board to stdout
    -> --me: filter to items assigned to the authenticated user
    -> (no flag): shows all items in the sprint
    -> stdout: ANSI-colored sprint board (stories grouped with tasks, colored state indicators)
    -> exit 0 on success
    -> exit 1 on error (stderr contains message — e.g., no config, no active sprint, auth failure)
</context>

<process>
1. **Check that the helper exists:**
   Run: `test -f ~/.claude/bin/azdev-tools.cjs`
   If missing: tell the user "Azure DevOps tools not installed. Check that ~/.claude/bin/azdev-tools.cjs exists." Stop.

2. **Run the show-sprint command:**

   **Default (no argument or anything other than `--all`):** Show only the user's own items:
   Run: `node ~/.claude/bin/azdev-tools.cjs show-sprint --me --cwd $CWD`

   **If the user passed `--all`:** Show the entire sprint:
   Run: `node ~/.claude/bin/azdev-tools.cjs show-sprint --cwd $CWD`
</process>

<important>
Do NOT output any thinking, planning, or narration text. Just run the command and let the output speak for itself. No "Let me fetch...", "Now I'll render...", or similar messages.
</important>

<success_criteria>
- Sprint board is displayed with a single command call
- No intermediate steps, no JSON juggling, no dynamic script construction
- No narration or thinking text — only the sprint board output
- Errors produce clear, actionable messages from the helper script
</success_criteria>
