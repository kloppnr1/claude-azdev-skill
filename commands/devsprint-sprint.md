---
name: devsprint-sprint
description: View current sprint backlog from Azure DevOps
argument-hint: "[--all] [--detailed]"
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

  node ~/.claude/bin/devsprint-tools.cjs show-sprint [--me] [--all] [--detailed] --cwd $CWD
    -> Fetches sprint metadata, fetches work items, renders colored board to stdout
    -> --me: filter to items assigned to the authenticated user
    -> --all: show all stories + all tasks including resolved/closed/done
    -> --detailed: show description, acceptance criteria, and all tasks (verbose view)
    -> Default: compact view — no description/AC, hides completed tasks (shows "+ N completed" count), hides resolved/closed stories
    -> exit 0 on success
    -> exit 1 on error (stderr contains message — e.g., no config, no active sprint, auth failure)
</context>

<process>
1. **Check that the helper exists:**
   Run: `test -f ~/.claude/bin/devsprint-tools.cjs`
   If missing: tell the user "Azure DevOps tools not installed. Check that ~/.claude/bin/devsprint-tools.cjs exists." Stop.

2. **Run the show-sprint command:**

   **Default (no flags):** Compact view of the user's own incomplete items:
   Run: `node ~/.claude/bin/devsprint-tools.cjs show-sprint --me --cwd $CWD`

   **If the user passed `--all`:** Include resolved/closed stories and completed tasks:
   Run: `node ~/.claude/bin/devsprint-tools.cjs show-sprint --me --all --cwd $CWD`

   **If the user passed `--detailed`:** Full verbose view with description and AC:
   Run: `node ~/.claude/bin/devsprint-tools.cjs show-sprint --me --detailed --cwd $CWD`
</process>

<important>
- Do NOT output any thinking, planning, or narration text. No "Let me fetch...", "Now I'll render...", or similar messages.
- Do NOT copy the output into your text response. The sprint board uses ANSI color codes that only render in the Bash tool output (user expands it with Ctrl+O). Copying strips the colors.
- After the command, output only a single short line like: "Sprint board above — expand with Ctrl+O for full colored view."
</important>

<success_criteria>
- Sprint board is displayed with a single command call
- No intermediate steps, no JSON juggling, no dynamic script construction
- No narration or thinking text — only the sprint board output
- Default is compact view (no description/AC, completed tasks hidden)
- --all shows all stories and tasks including completed
- --detailed shows full verbose view with description and AC
- Errors produce clear, actionable messages from the helper script
</success_criteria>
