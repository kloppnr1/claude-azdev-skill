---
name: azdev-sprint
description: View current sprint backlog from Azure DevOps
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<objective>
Fetch and display the current sprint backlog from Azure DevOps. Show sprint metadata (name, dates, iteration path) followed by work items grouped by parent story with tasks indented underneath. Output MUST use ANSI color codes via Bash for colored terminal output.
</objective>

<execution_context>
Helper: ~/.claude/bin/azdev-tools.cjs
Config file: .planning/azdev-config.json
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

azdev-tools.cjs CLI contracts:

  node ~/.claude/bin/azdev-tools.cjs load-config --cwd $CWD
    -> stdout: JSON {"org":"...","project":"...","pat":"<raw-decoded>"}
    -> exit 0 on success, exit 1 if no config

  node ~/.claude/bin/azdev-tools.cjs get-sprint --cwd $CWD
    -> stdout: JSON {"iterationId":"...","name":"...","path":"...","startDate":"...","finishDate":"..."}
    -> exit 0 on success
    -> exit 1 on error (stderr contains message — e.g., no active sprint, auth failure)

  node ~/.claude/bin/azdev-tools.cjs get-sprint-items [--me] --cwd $CWD
    -> stdout: JSON array [{"id":N,"type":"User Story"|"Task"|"Bug"|...,"title":"...","state":"...","description":"...","acceptanceCriteria":"...","parentId":N|null,"assignedTo":"Name"|null}]
    -> --me: filter to items assigned to the authenticated user (includes parent stories of your tasks and child tasks of your stories)
    -> exit 0 on success (empty sprint returns [])
    -> exit 1 on error (stderr contains message)
</context>

<process>
1. **Check prerequisites:**
   - Verify `~/.claude/bin/azdev-tools.cjs` exists using the Read tool or Bash `test -f`.
     If it does not exist: tell the user "Azure DevOps tools not installed. Check that ~/.claude/bin/azdev-tools.cjs exists." Stop.
   - Run `node ~/.claude/bin/azdev-tools.cjs load-config --cwd $CWD`
     If exit 1: tell the user "No Azure DevOps config found. Run `/azdev-setup` to configure your connection." Stop.

2. **Fetch sprint metadata:**
   Run `node ~/.claude/bin/azdev-tools.cjs get-sprint --cwd $CWD`
   - If exit 1: show the error message from stderr to the user. Stop.
   - If exit 0: parse the JSON from stdout. Extract: name, path, startDate, finishDate.

3. **Fetch sprint items:**
   Run `node ~/.claude/bin/azdev-tools.cjs get-sprint-items --cwd $CWD`
   - If exit 1: show the error message from stderr to the user. Stop.
   - If exit 0: parse the JSON array from stdout.

4. **Build and display colored output via Bash:**

   IMPORTANT: All display output MUST be rendered using `echo -e` in a single Bash command. Do NOT output plain text directly — use Bash so the ANSI color codes are interpreted by the terminal.

   Build a Bash script that uses `echo -e` to print the entire sprint board with ANSI colors. Use these color codes:

   **ANSI color definitions:**
   ```
   RESET='\033[0m'
   BOLD='\033[1m'
   DIM='\033[2m'
   WHITE='\033[37m'
   CYAN='\033[36m'
   BLUE='\033[34m'
   GREEN='\033[32m'
   RED='\033[31m'
   YELLOW='\033[33m'
   MAGENTA='\033[35m'
   BG_BLUE='\033[44m'
   ```

   **State → color mapping:**
   - "New" → `WHITE` with label `NEW`
   - "Active" → `BLUE` with label `ACTIVE`
   - "Resolved" → `GREEN` with label `RESOLVED`
   - "Closed" / "Done" → `GREEN` + `BOLD` with label `DONE`
   - "Removed" → `RED` with label `REMOVED`
   - Any other → `YELLOW` with label in uppercase

   **Output format:**

   The Bash script should echo lines like this (using the ANSI variables):

   ```
   echo -e ""
   echo -e "${BOLD}${CYAN}━━━ Sprint: {name} ━━━${RESET}"
   echo -e "${DIM}Iteration:${RESET} {path}"
   echo -e "${DIM}Dates:${RESET}     {startDate} → {finishDate}"
   echo -e "${DIM}Items:${RESET}     {total count}"
   echo -e ""
   ```

   For each top-level story/bug:
   ```
   echo -e "${BOLD}┌─ [{type}] #{id} -- {title}${RESET}"
   echo -e "│  State: ${STATE_COLOR}{state}${RESET}  │  Assigned: {assignedTo or 'Unassigned'}"
   ```

   If description exists (first 3 lines):
   ```
   echo -e "│  ${DIM}{description line 1}${RESET}"
   echo -e "│  ${DIM}{description line 2}${RESET}"
   ```

   If acceptance criteria exist:
   ```
   echo -e "│"
   echo -e "│  ${MAGENTA}Acceptance Criteria:${RESET}"
   echo -e "│  ${DIM}- {criterion}${RESET}"
   ```

   For each child task:
   ```
   echo -e "│   ${STATE_COLOR}■${RESET} #{id} -- {title}  [${STATE_COLOR}{state}${RESET}]  {assignedTo}"
   ```

   Close the story box:
   ```
   echo -e "└──────"
   echo -e ""
   ```

   **Formatting rules:**
   - **Type abbreviations:** "User Story" → "US", "Task" → "Task", "Bug" → "Bug"; all other types use the full type name.
   - **Grouping:** items with `parentId === null` (or parentId not present in the items list) are top-level (stories/bugs). Items with a `parentId` that exists in the list are children (tasks) displayed under their parent.
   - **Orphaned tasks:** if a child's parentId references an ID that is NOT in the sprint items list, display that child as a top-level item.
   - **Description:** show first 3 lines only (split on newlines). If empty or null, show "(no description)" in DIM.
   - **Acceptance Criteria:** if empty or null, show "(no acceptance criteria)" in DIM.
   - **Dates:** parse ISO date strings and display as YYYY-MM-DD (take the first 10 characters). If null or undefined, show "not set".
   - **Escape special chars:** when building the echo strings, escape any single quotes, double quotes, and backslashes in titles/descriptions so the Bash script doesn't break.

5. **Handle edge cases:**
   - Empty sprint (items array is []): display the sprint header, then echo "No work items in this sprint."
   - No active sprint: the `get-sprint` command returns exit 1 with a message; display that message and stop.
</process>

<success_criteria>
- Sprint name, iteration path, and dates are shown at the top
- Work items are grouped by parent story with tasks indented underneath
- State indicators use ANSI colors visible in the terminal (blue for Active, green for Resolved, etc.)
- All output is rendered via Bash echo -e so ANSI codes are interpreted
- No HTML tags appear in the output
- Empty sprint and no-active-sprint states produce clear, actionable messages
</success_criteria>
