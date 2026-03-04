# Phase 1: Foundation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

User can connect to Azure DevOps and verify credentials work. Delivers the `/gsd:azdo-setup` and `/gsd:azdo-test` skill commands plus the `azdo-tools.cjs` helper script that handles all HTTP calls to the Azure DevOps REST API. Fetching sprint data, task analysis, and status updates are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Setup flow
- Single interactive wizard — one command (`/gsd:azdo-setup`) prompts for org URL, project name, and PAT in sequence
- On re-run with existing config: show current values (PAT masked), let user update individual fields or confirm
- Auto-run connection test after saving credentials — user gets immediate feedback
- One project at a time; switch by re-running setup

### Credential storage
- Config stored project-local in `.planning/azdo-config.json` — ties config to the repo
- PAT stored base64 encoded (light obfuscation, not encryption)
- JSON format for the config file

### Connection test feedback
- Success: minimal output — "Connected to {org}/{project}" with a checkmark
- Failure: error message + suggested fix (e.g. "Authentication failed. Check your PAT has the correct scopes. Run /gsd:azdo-setup to reconfigure.")
- Test verifies auth AND basic permissions — confirms PAT can read work items (needed for Phase 2)

### Skill naming
- All Azure DevOps skills use `/gsd:azdo-` prefix
- Setup command: `/gsd:azdo-setup`
- Connection test command: `/gsd:azdo-test`

### Claude's Discretion
- Exact prompt wording during setup wizard
- azdo-tools.cjs internal structure and function signatures
- Error message phrasing beyond the decided patterns
- How base64 encoding/decoding is handled in the helper

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- GSD skills live in `~/.claude/get-shit-done/skills/`
- Helper scripts follow `gsd-tools.cjs` pattern in `bin/`
- Node.js with built-ins only (no external dependencies)

### Integration Points
- Skills register as `/gsd:azdo-*` commands
- Config file at `.planning/azdo-config.json` will be read by future phases (Sprint Data, Analysis, Status)
- `azdo-tools.cjs` will be the shared API layer for all subsequent phases

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-04*
