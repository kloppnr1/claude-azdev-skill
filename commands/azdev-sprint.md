---
name: azdev-sprint
description: View current sprint backlog from Azure DevOps
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<objective>
Fetch and display the current sprint backlog from Azure DevOps. Show sprint metadata (name, dates, iteration path) followed by work items grouped by parent story with tasks indented underneath.
</objective>

<execution_context>
Helper: ~/.claude/azdev-skill/bin/azdev-tools.cjs
Config file: .planning/azdev-config.json
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

azdev-tools.cjs CLI contracts:

  node ~/.claude/azdev-skill/bin/azdev-tools.cjs load-config --cwd $CWD
    -> stdout: JSON {"org":"...","project":"...","pat":"<raw-decoded>"}
    -> exit 0 on success, exit 1 if no config

  node ~/.claude/azdev-skill/bin/azdev-tools.cjs get-sprint --cwd $CWD
    -> stdout: JSON {"iterationId":"...","name":"...","path":"...","startDate":"...","finishDate":"..."}
    -> exit 0 on success
    -> exit 1 on error (stderr contains message — e.g., no active sprint, auth failure)

  node ~/.claude/azdev-skill/bin/azdev-tools.cjs get-sprint-items [--me] --cwd $CWD
    -> stdout: JSON array [{"id":N,"type":"User Story"|"Task"|"Bug"|...,"title":"...","state":"...","description":"...","acceptanceCriteria":"...","parentId":N|null,"assignedTo":"Name"|null}]
    -> --me: filter to items assigned to the authenticated user (includes parent stories of your tasks and child tasks of your stories)
    -> exit 0 on success (empty sprint returns [])
    -> exit 1 on error (stderr contains message)
</context>

<process>
1. **Check prerequisites:**
   - Verify `~/.claude/azdev-skill/bin/azdev-tools.cjs` exists using the Read tool or Bash `test -f`.
     If it does not exist: tell the user "Azure DevOps tools not installed. Check that ~/.claude/azdev-skill/bin/azdev-tools.cjs exists." Stop.
   - Run `node ~/.claude/azdev-skill/bin/azdev-tools.cjs load-config --cwd $CWD`
     If exit 1: tell the user "No Azure DevOps config found. Run `/azdev-setup` to configure your connection." Stop.

2. **Fetch sprint metadata:**
   Run `node ~/.claude/azdev-skill/bin/azdev-tools.cjs get-sprint --cwd $CWD`
   - If exit 1: show the error message from stderr to the user. Stop.
   - If exit 0: parse the JSON from stdout. Extract: name, path, startDate, finishDate.

3. **Fetch sprint items:**
   Run `node ~/.claude/azdev-skill/bin/azdev-tools.cjs get-sprint-items --cwd $CWD`
   - If exit 1: show the error message from stderr to the user. Stop.
   - If exit 0: parse the JSON array from stdout.

4. **Format and display:**
   Present the data using markdown with state indicators. Use this format:

   ```
   ## 🏃 Sprint: {name}
   **Iteration:** {path}
   **Dates:** {startDate as YYYY-MM-DD} → {finishDate as YYYY-MM-DD}
   **Items:** {total count}

   ---

   ### {stateEmoji} [{type abbreviation}] #{id} -- {title}
   **State:** {state} | **Assigned to:** {assignedTo or "Unassigned"}

   > {description, first 3 lines only}
   > ...

   **Acceptance Criteria:**
   {each criterion as a line}

   **Tasks:**
   | | Task | State |
   |---|------|-------|
   | {stateEmoji} | #{id} -- {title} | {state} |
   | {stateEmoji} | #{id} -- {title} | {state} |

   ---

   ### {stateEmoji} [{type abbreviation}] #{id} -- {title}
   **State:** {state} | **Assigned to:** {assignedTo}

   > *(no description)*

   **Tasks:** *(none)*
   ```

   **Formatting rules:**
   - **State emoji mapping:** Use these emoji based on the `state` field:
     - "New" → ⚪
     - "Active" → 🔵
     - "Resolved" → 🟢
     - "Closed" / "Done" → ✅
     - "Removed" → 🔴
     - Any other state → 🟡
   - **Type abbreviations:** "User Story" → "US", "Task" → "Task", "Bug" → "🐛 Bug"; all other types use the full type name.
   - **Grouping:** items with `parentId === null` (or parentId not present in the items list) are top-level (stories/bugs). Items with a `parentId` that exists in the list are children (tasks) displayed in a table under their parent.
   - **Orphaned tasks:** if a child's parentId references an ID that is NOT in the sprint items list, display that child as a top-level item.
   - **Description:** show first 3 lines only (split on newlines) in a blockquote. If more than 3 lines, append "..." on line 4. If empty or null, show "*(no description)*".
   - **Acceptance Criteria:** if empty or null, show "*(no acceptance criteria)*". Otherwise display each line.
   - **Tasks section:** if no children found, show "*(none)*".
   - **Dates:** parse ISO date strings and display as YYYY-MM-DD (take the first 10 characters). If null or undefined, show "not set".
   - Use plain dashes "--" not em-dashes (except the arrow → for dates).

5. **Handle edge cases:**
   - Empty sprint (items array is []): display the sprint header, then "No work items in this sprint."
   - No active sprint: the `get-sprint` command returns exit 1 with a message; display that message and stop.
</process>

<success_criteria>
- Sprint name, iteration path, and dates are shown at the top
- Work items are grouped by parent story with tasks indented underneath
- No HTML tags appear in the output (HTML is stripped by azdev-tools.cjs get-sprint-items)
- Output is readable in a standard terminal
- Empty sprint and no-active-sprint states produce clear, actionable messages
</success_criteria>
