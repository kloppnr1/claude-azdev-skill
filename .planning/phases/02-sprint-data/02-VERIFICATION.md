---
phase: 02-sprint-data
verified: 2026-03-04T00:00:00Z
status: gaps_found
score: 2/3 success criteria verified
re_verification: false
gaps:
  - truth: "All user stories and tasks in the current sprint are listed with their title, description, acceptance criteria, and current state"
    status: failed
    reason: "The /gsd:azdo-sprint skill hardcodes --me in its process step 3, invoking 'get-sprint-items --me --cwd $CWD'. This filters output to items assigned to the authenticated user, not the full sprint backlog. The ROADMAP success criterion explicitly requires ALL stories and tasks in the sprint."
    artifacts:
      - path: "~/.claude/commands/gsd/azdo-sprint.md"
        issue: "Step 3 reads: 'Run node ~/.claude/get-shit-done/bin/azdo-tools.cjs get-sprint-items --me --cwd $CWD' — the --me flag is hardcoded, not optional"
    missing:
      - "Remove --me from the hardcoded invocation in process step 3, or change to show full sprint by default (per ROADMAP SC-2: 'All user stories and tasks in the current sprint')"
      - "If personal-view is the intended default, update the ROADMAP success criterion and REQUIREMENTS.md SPRT-03 description accordingly before treating as passed"
human_verification:
  - test: "Run /gsd:azdo-sprint in a Claude Code session and verify sprint name, iteration path, dates, and grouped work items display without HTML or broken formatting"
    expected: "Sprint header shown (name, path, YYYY-MM-DD dates), work items grouped by parent story with tasks indented, no raw HTML tags visible, readable in terminal"
    why_human: "Visual formatting and terminal readability cannot be confirmed programmatically — requires a running Claude Code session against a live Azure DevOps sprint"
---

# Phase 2: Sprint Data Verification Report

**Phase Goal:** User can view the current sprint backlog inside GSD
**Verified:** 2026-03-04
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria from ROADMAP

Phase 2 declares three Success Criteria (SC) against which everything is measured:

| #  | Success Criterion | Status | Evidence |
|----|-------------------|--------|----------|
| SC-1 | User can run a GSD skill command and see the active sprint name and iteration path fetched from Azure DevOps | VERIFIED | `azdo-sprint.md` process steps 1-2 invoke `get-sprint`, parse JSON, display header block with name and path |
| SC-2 | All user stories and tasks in the current sprint are listed with title, description, acceptance criteria, and state | FAILED | Skill step 3 hardcodes `--me`, filtering to current user's items only — not the full sprint backlog |
| SC-3 | The backlog display is readable in a terminal context (no broken formatting) | HUMAN NEEDED | Skill defines formatting rules and stripHtml is wired in azdo-tools.cjs; visual confirmation requires a live session |

**Score: 2/3 success criteria verified (SC-2 failed, SC-3 needs human)**

---

### Observable Truths from PLAN Frontmatter

#### Plan 02-01 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | get-sprint command exits 0 and returns JSON with iterationId, name, path, startDate, finishDate | VERIFIED | `cmdGetSprint` at line 298 returns all five fields, exits 0, exits 1 on error |
| 2 | get-sprint-items command exits 0 and returns JSON array of work items with id, type, title, state, description, acceptanceCriteria, parentId | VERIFIED | `cmdGetSprintItems` at line 343 maps all seven fields, exits 0, returns `[]` on empty sprint |
| 3 | Team name is resolved automatically without user configuration | VERIFIED | `resolveTeamName` at line 239 tries project-name heuristic first, falls back to teams API; `getSprintData` calls it at line 274 |
| 4 | HTML tags are stripped from description and acceptance criteria fields before output | VERIFIED | `stripHtml` called at lines 411-412 on both fields |
| 5 | Empty sprint (no work items) produces a clean empty array, not an error | VERIFIED | `ids.length === 0` guard at line 367-370 outputs `[]` and exits 0 |
| 6 | No active sprint produces a clear error message, not a crash | VERIFIED | `getSprintData` throws at line 285 with explicit message; `cmdGetSprint` catch block at line 310 writes to stderr and exits 1 |

#### Plan 02-02 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can run /gsd:azdo-sprint and see the active sprint name, dates, and iteration path | VERIFIED | Skill step 2 fetches and displays header with name, path, startDate, finishDate |
| 2 | All user stories and tasks are listed with title, state, description, and acceptance criteria | FAILED | Skill step 3 hardcodes `--me` flag — shows only current user's items, not full sprint |
| 3 | Work items are grouped by parent story with tasks indented underneath | VERIFIED | Formatting rules at lines 85-90 of azdo-sprint.md define grouping; orphaned task promotion specified |
| 4 | Output is readable in a terminal (no HTML tags, no broken formatting) | HUMAN NEEDED | HTML stripped in azdo-tools.cjs; terminal readability requires live session |
| 5 | When no active sprint exists, user sees a clear message instead of a crash | VERIFIED | Step 2 catches exit 1 from get-sprint and shows stderr message to user |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `~/.claude/get-shit-done/bin/azdo-tools.cjs` | get-sprint and get-sprint-items CLI commands, resolveTeamName, stripHtml | VERIFIED | 646 lines; all four components present and substantive |
| `~/.claude/commands/gsd/azdo-sprint.md` | /gsd:azdo-sprint skill command for viewing sprint backlog | VERIFIED (with gap) | 104 lines; complete frontmatter, 5-step process, success criteria — but step 3 hardcodes --me |

### Artifact Level Detail

**azdo-tools.cjs (646 lines):**
- Level 1 (Exists): PASS — file present at `~/.claude/get-shit-done/bin/azdo-tools.cjs`
- Level 2 (Substantive): PASS — contains `case 'get-sprint'` (line 628), `case 'get-sprint-items'` (line 632), `stripHtml` (line 212), `resolveTeamName` (line 239), `getSprintData` (line 271), `cmdGetSprint` (line 298), `cmdGetSprintItems` (line 343)
- Level 3 (Wired): PASS — both commands routed in switch at lines 628-634; stripHtml called in items map at lines 411-412; resolveTeamName called in getSprintData at line 274

**azdo-sprint.md (104 lines):**
- Level 1 (Exists): PASS — file present at `~/.claude/commands/gsd/azdo-sprint.md`
- Level 2 (Substantive): PASS — has frontmatter with `name: gsd:azdo-sprint`, complete 5-step process, formatting rules, edge case handling
- Level 3 (Wired): PASS for CLI links; GAP in step 3 (hardcoded `--me` narrows to personal view, contradicting SC-2)

---

## Key Link Verification

### Plan 02-01 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| cmdGetSprint | resolveTeamName | function call inside getSprintData | WIRED | Line 274: `cfg.team \|\| await resolveTeamName(...)` called from getSprintData; cmdGetSprint calls getSprintData at line 300 |
| cmdGetSprintItems | cmdGetSprint (shared getSprintData) | calls getSprintData which runs iteration fetch | WIRED | Line 346: `const { cfg, encodedPat, teamName, iteration } = await getSprintData(cwd)` — `iteration.id` used at line 349 |
| cmdGetSprintItems | makeRequest POST | batch fetch via workitemsbatch | WIRED | Line 380: `makeRequest(batchUrl, encodedPat, 'POST', batchBody)` with `workitemsbatch` URL |

### Plan 02-02 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| azdo-sprint.md | azdo-tools.cjs get-sprint | Bash tool call in step 2 | WIRED | Line 48: `node ~/.claude/get-shit-done/bin/azdo-tools.cjs get-sprint --cwd $CWD` |
| azdo-sprint.md | azdo-tools.cjs get-sprint-items | Bash tool call in step 3 | WIRED (with gap) | Line 53: `node ~/.claude/get-shit-done/bin/azdo-tools.cjs get-sprint-items --me --cwd $CWD` — linked but --me changes scope |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SPRT-01 | 02-01 | System can fetch the current active sprint iteration from Azure DevOps | SATISFIED | `cmdGetSprint` fetches iteration, returns JSON with iterationId/name/path/startDate/finishDate |
| SPRT-02 | 02-01 | System can fetch all user stories and tasks from the current sprint | SATISFIED | `cmdGetSprintItems` fetches all IDs from workItemRelations (source+target), batch-fetches details, maps to output array |
| SPRT-03 | 02-02 | User can view sprint backlog with title, description, acceptance criteria, and state | PARTIAL | Skill displays these fields correctly but filters to current user's items via `--me`; "view sprint backlog" implies full backlog, not personal view |

### Orphaned Requirements Check

REQUIREMENTS.md maps SPRT-01, SPRT-02, SPRT-03 to Phase 2. All three appear in plan frontmatter (`02-01` claims SPRT-01, SPRT-02; `02-02` claims SPRT-03). No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `~/.claude/commands/gsd/azdo-sprint.md` | 53 | Hardcoded `--me` in step 3 contradicts SC-2 scope | Warning | SC-2 fails; full sprint backlog not viewable by default |

No TODO/FIXME/placeholder comments found in either artifact. No empty implementations found. No stub-only handlers found.

---

## Human Verification Required

### 1. Sprint Backlog Terminal Display

**Test:** Open a new Claude Code session in the PlanningMe project directory (`C:/Users/sen.makj/source/repos/PlanningMe`). Run `/gsd:azdo-sprint`. Observe the full output.

**Expected:**
- Header block: `=== Sprint: {name} ===`, `Iteration: {path}`, `Dates: YYYY-MM-DD to YYYY-MM-DD`, `Items: N`
- Work items listed under a `---` separator
- Top-level stories/bugs formatted as `[US] #{id} -- {title} ({state})`
- Description shown as first 3 lines (or `(no description)`)
- Acceptance criteria shown (or `(no acceptance criteria)`)
- Child tasks indented under their parent
- No `<p>`, `<br>`, `<strong>` or other HTML tags visible anywhere in output
- Output is scannable and well-formatted in the terminal

**Why human:** Visual formatting quality, correct line-wrapping, and absence of HTML artifacts in live Azure DevOps data cannot be confirmed by static code inspection. Requires a running Claude Code session against live sprint data.

---

## Gaps Summary

**One gap blocking full goal achievement:**

The `/gsd:azdo-sprint` skill step 3 hardcodes `--me` when calling `get-sprint-items`, meaning the command shows only work items assigned to the authenticated user. The ROADMAP Phase 2 Success Criterion 2 requires "All user stories and tasks in the current sprint." SPRT-03 in REQUIREMENTS.md defines "User can view sprint backlog" — a backlog implies full team view, not a personal filter.

The `get-sprint-items` CLI tool itself correctly supports both modes (`--me` is optional). The fix is a one-line change in `azdo-sprint.md` step 3: remove `--me` from the hardcoded invocation. Alternatively, the team may intentionally prefer the personal view as the default — in that case, ROADMAP SC-2 and REQUIREMENTS.md SPRT-03 should be updated to reflect this decision before marking the phase passed.

**Impact:** Users running `/gsd:azdo-sprint` will see their own items only, not the full team sprint backlog. This is a functional gap against the stated goal "User can view the current sprint backlog inside GSD."

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
