---
name: devsprint-setup
description: Configure Azure DevOps connection credentials
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Prompt for Azure DevOps org URL, project name, and Personal Access Token (PAT). Auto-detect team and area path from the API. Store everything in `.planning/devsprint-config.json`. Auto-run a connection test after saving.

On re-run with existing config, show current values (PAT masked) and let user choose to update or keep.
</objective>

<execution_context>
Config file: .planning/devsprint-config.json
Helper: ~/.claude/bin/devsprint-tools.cjs
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

devsprint-tools.cjs CLI contract:
  node ~/.claude/bin/devsprint-tools.cjs load-config --cwd $CWD
    -> stdout: JSON {"org":"...","project":"...","pat":"<raw-decoded>","team":"..."|null,"area":"..."|null}
    -> exit 0 on success, exit 1 if no config

  node ~/.claude/bin/devsprint-tools.cjs save-config --org "<org>" --project "<project>" --pat "<pat>" [--team "<team>"] [--area "<area>"] --cwd $CWD
    -> Normalizes org (strips URL prefix), base64-encodes PAT
    -> stdout: JSON {"status":"saved","org":"...","project":"...","team":"..."|null,"area":"..."|null}
    -> exit 0 on success, exit 1 on error

  node ~/.claude/bin/devsprint-tools.cjs test --cwd $CWD
    -> Success: stdout "Connected to {org}/{project}", exit 0
    -> Failure: stderr error message with fix suggestion, exit 1

  node ~/.claude/bin/devsprint-tools.cjs list-teams --cwd $CWD
    -> stdout: JSON array [{"name":"...","id":"..."}]
    -> Lists all teams in the project
    -> exit 0 on success, exit 1 on error

  node ~/.claude/bin/devsprint-tools.cjs get-team-area --team "<team name>" --cwd $CWD
    -> stdout: JSON {"team":"...","area":"..."}
    -> Resolves the default area path for a team
    -> exit 0 on success, exit 1 on error
</context>

<process>
1. **Check for existing config:**
   Run `node ~/.claude/bin/devsprint-tools.cjs load-config --cwd $CWD`
   - If exit 0 (config found): go to step 2
   - If exit 1 (no config): go to step 3

2. **Existing config — show and offer update/keep:**
   - Parse the JSON output to get current org, project, pat, team, and area values
   - Mask the PAT: show first 4 chars + "..." + last 4 chars (e.g. `abcd...wxyz`). If PAT is shorter than 12 chars, show `****` instead.
   - Display:
     ```
     Current config:
       Org:     {org}
       Project: {project}
       Team:    {team || "(not set)"}
       Area:    {area || "(not set)"}
       PAT:     {masked}
     ```
   - Use `AskUserQuestion` to ask: "Update credentials or keep current?"
   - If user says "keep": skip to step 9 (auto-test)
   - If user says "update": continue to step 3

3. **Prompt for org:**
   Use `AskUserQuestion` to ask: "Azure DevOps organisation URL or name (e.g., 'myorg' or 'https://dev.azure.com/myorg'):"
   Store the answer as `<org>`.

4. **Prompt for project:**
   Use `AskUserQuestion` to ask: "Azure DevOps project name:"
   Store the answer as `<project>`.

5. **Prompt for PAT:**
   Use `AskUserQuestion` to ask: "Personal Access Token (PAT). Needs vso.project + vso.work + vso.work_write scopes:"
   Store the answer as `<pat>`.
   IMPORTANT: Treat this value as sensitive. Do not echo it back in plain text or log it anywhere.

6. **Save credentials (initial — without team/area):**
   Run `node ~/.claude/bin/devsprint-tools.cjs save-config --org "<org>" --project "<project>" --pat "<pat>" --cwd $CWD`
   - If exit 0: credentials saved. Continue to step 7.
   - If exit 1: display the error from stderr. Stop and tell user to try again.

7. **Auto-detect team:**
   Run `node ~/.claude/bin/devsprint-tools.cjs list-teams --cwd $CWD`
   - If exit 0: parse the JSON array of teams.
     - Present the team names to the user via `AskUserQuestion`: "Which team are you on?" with team names as options (max 4 most relevant, or let user type).
     - Store the selected team as `<team>`.
   - If exit 1: warn "Could not list teams. Team and area will not be set." Skip to step 8.

8. **Auto-detect area from team:**
   If a team was selected in step 7:
   Run `node ~/.claude/bin/devsprint-tools.cjs get-team-area --team "<team>" --cwd $CWD`
   - If exit 0: parse JSON, extract `area` value. Store as `<area>`.
     Display: "Auto-detected area: {area}"
   - If exit 1: warn "Could not resolve area for team. Area will not be set."

   **Re-save config with team and area:**
   Run `node ~/.claude/bin/devsprint-tools.cjs save-config --org "<org>" --project "<project>" --pat "<pat>" --team "<team>" --area "<area>" --cwd $CWD`

   After saving, verify `.planning/devsprint-config.json` is covered by `.gitignore`:
   - Read the root `.gitignore` file.
   - Check if `devsprint-config.json` is listed directly, OR if `.planning/` is ignored as a directory.
   - If neither pattern is present: add `devsprint-config.json` to `.gitignore`.
   - If already covered: no change needed.

9. **Auto-run connection test:**
   Run `node ~/.claude/bin/devsprint-tools.cjs test --cwd $CWD`
   - If exit 0: Show the success message and a summary:
     ```
     Connected to {org}/{project}
     Team: {team}
     Area: {area}
     ```
   - If exit 1: Show the error. Tell user: "Run `/devsprint-setup` again to reconfigure."
</process>

<success_criteria>
- Config file created or updated at `.planning/devsprint-config.json`
- Team auto-detected from project teams list (user picks from options)
- Area path auto-resolved from team settings API
- New work items created with `create-work-item` will automatically use the configured area
- Connection test result shown to user after saving
- PAT never echoed back in plain text
- `.gitignore` covers `devsprint-config.json`
</success_criteria>
