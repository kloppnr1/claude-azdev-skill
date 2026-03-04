---
phase: 02-sprint-data
plan: "01"
subsystem: api
tags: [azure-devops, azure-devops-rest-api, sprint, work-items, html-stripping, node-cjs]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: azdo-tools.cjs with makeRequest, loadConfig, saveConfig helpers and PAT auth
provides:
  - get-sprint CLI command returning current sprint metadata as JSON
  - get-sprint-items CLI command returning sprint work items with HTML-stripped fields
  - stripHtml helper for cleaning Azure DevOps HTML fields
  - resolveTeamName helper for auto-discovering team name (project-name heuristic + teams API fallback)
  - getSprintData shared helper for sprint data pipeline
affects: [02-sprint-data plan 02 (azdo-sprint skill), sprint display features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Team resolution: try project-name-as-team-name first (status 200 with valid body = OK), fall back to teams API"
    - "HTML stripping: regex-only approach (no external deps) adequate for Azure DevOps field content"
    - "Shared helper (getSprintData) used by both get-sprint and get-sprint-items to avoid duplication"
    - "Empty sprint: return [] with exit 0, not an error"
    - "Batch fetch: POST /wit/workitemsbatch for up to 200 IDs in one call"

key-files:
  created: []
  modified:
    - "~/.claude/get-shit-done/bin/azdo-tools.cjs"

key-decisions:
  - "resolveTeamName step 1 checks for status 200 + data.value !== undefined (not data.value.length > 0) — empty array is valid when team exists but no sprint is active"
  - "getSprintData shared by both commands to avoid duplicating config load + PAT encode + team resolution + iteration fetch"
  - "cmdGetSprintItems extracts ALL unique IDs from workItemRelations (both source and target) to get complete sprint item set"

patterns-established:
  - "Team name resolution: project-name heuristic first, teams API fallback — auto-discovers without user config"
  - "HTML stripping: convert br/p/li to newlines, strip tags, decode 5 entities, collapse excess newlines"

requirements-completed: [SPRT-01, SPRT-02]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 2 Plan 01: Sprint Data Commands Summary

**Two new Azure DevOps CLI commands in azdo-tools.cjs — get-sprint and get-sprint-items — fetching current sprint metadata and work items with automatic team resolution and HTML stripping**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T13:56:47Z
- **Completed:** 2026-03-04T14:00:31Z
- **Tasks:** 2
- **Files modified:** 1 (azdo-tools.cjs at ~/.claude/get-shit-done/bin/)

## Accomplishments
- `get-sprint` command: fetches current active sprint, returns JSON with iterationId, name, path, startDate, finishDate — exits 0 on success, 1 on error
- `get-sprint-items` command: fetches all sprint work items via three-step pipeline (sprint iteration → work item IDs → batch detail fetch), HTML stripped, exits 0 on empty sprint (returns [])
- `resolveTeamName` helper: auto-discovers team name using project-name heuristic with teams API fallback — no user configuration required
- `stripHtml` helper: regex-only HTML cleaner for Azure DevOps description and acceptance criteria fields
- `getSprintData` shared helper: reusable pipeline for config load, PAT encoding, team resolution, and iteration fetch
- Updated help text and router to document and route both new commands
- Verified against live Azure DevOps: Sprint 39 - 2026 active, 20 work items returned with no HTML tags

## Task Commits

Each task was committed atomically:

1. **Task 1: Add helper functions and get-sprint command** - `c86743a` (feat)
2. **Task 2: Add get-sprint-items command** - included in plan metadata commit (feat — no separate tracked files)

**Plan metadata:** (this commit — docs: complete plan)

_Note: azdo-tools.cjs is GSD infrastructure at ~/.claude/get-shit-done/bin/ and is not tracked in the project repo per established convention. Task commits document the implementation in commit messages._

## Files Created/Modified
- `~/.claude/get-shit-done/bin/azdo-tools.cjs` - Added stripHtml, resolveTeamName, getSprintData helpers; cmdGetSprint, cmdGetSprintItems commands; updated header comment, help text, and switch router

## Decisions Made
- `resolveTeamName` step 1 success condition is `status === 200 && data.value !== undefined` (not `data.value.length > 0`) — empty values array is valid when team exists but no sprint is currently active. The plan spec was followed exactly here.
- `getSprintData` factored as shared helper for both commands to avoid repeating the four-step setup (config load, PAT encode, team resolve, iterations fetch).
- All unique IDs extracted from `workItemRelations` (both `rel.target` and `rel.source`) to capture the full sprint item set including parent stories that appear only as sources.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The plan's Task 2 verification command used shell `!` character which caused syntax issues in bash (escaped as `\!`). Worked around by capturing output to a file and running a separate validation script. Not a code issue — verification results were confirmed: 20 items, no HTML, all required fields present.

## User Setup Required

None - no external service configuration required. Azure DevOps credentials were already configured in Phase 1.

## Next Phase Readiness
- `get-sprint` and `get-sprint-items` commands are ready for consumption by the `/gsd:azdo-sprint` skill (Plan 02-02)
- Both commands verified against live Azure DevOps with real sprint data
- Team name resolution works automatically — no user configuration needed
- Error cases handled: no config (loadConfig throws), no active sprint (clear error message), empty sprint (clean [] output)

---
*Phase: 02-sprint-data*
*Completed: 2026-03-04*
