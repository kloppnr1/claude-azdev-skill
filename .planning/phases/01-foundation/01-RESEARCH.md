# Phase 1: Foundation - Research

**Researched:** 2026-03-04
**Domain:** Azure DevOps REST API + GSD skill authoring + Node.js CJS helper scripts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Setup flow:**
- Single interactive wizard — one command (`/gsd:azdo-setup`) prompts for org URL, project name, and PAT in sequence
- On re-run with existing config: show current values (PAT masked), let user update individual fields or confirm
- Auto-run connection test after saving credentials — user gets immediate feedback
- One project at a time; switch by re-running setup

**Credential storage:**
- Config stored project-local in `.planning/azdo-config.json` — ties config to the repo
- PAT stored base64 encoded (light obfuscation, not encryption)
- JSON format for the config file

**Connection test feedback:**
- Success: minimal output — "Connected to {org}/{project}" with a checkmark
- Failure: error message + suggested fix (e.g. "Authentication failed. Check your PAT has the correct scopes. Run /gsd:azdo-setup to reconfigure.")
- Test verifies auth AND basic permissions — confirms PAT can read work items (needed for Phase 2)

**Skill naming:**
- All Azure DevOps skills use `/gsd:azdo-` prefix
- Setup command: `/gsd:azdo-setup`
- Connection test command: `/gsd:azdo-test`

### Claude's Discretion
- Exact prompt wording during setup wizard
- azdo-tools.cjs internal structure and function signatures
- Error message phrasing beyond the decided patterns
- How base64 encoding/decoding is handled in the helper

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-01 | User can configure Azure DevOps connection with organisation URL, project name, and PAT | GSD skill pattern (`/gsd:azdo-setup`) + `azdo-config.json` storage; config file creation with `fs.writeFileSync` |
| API-02 | User can validate that the connection works and credentials are correct | Azure DevOps Projects List endpoint (`GET /_apis/projects?api-version=7.1`) with PAT Basic auth; HTTP 200 = success, 401/403 = auth failure |
</phase_requirements>

---

## Summary

Phase 1 delivers three artifacts: a `/gsd:azdo-setup` skill command (interactive credential wizard), a `/gsd:azdo-test` skill command (connection verifier), and `azdo-tools.cjs` (shared API helper). The tech stack is locked: Node.js 22 with built-in `https` module only, CommonJS format (`.cjs`), and no external dependencies — matching the existing `gsd-tools.cjs` pattern exactly.

The Azure DevOps REST API uses HTTP Basic authentication with a base64-encoded PAT. The canonical encoding is `Buffer.from(`:${pat}`).toString('base64')` — username is intentionally left empty, only the PAT follows the colon. The best connection-test endpoint is `GET https://dev.azure.com/{org}/_apis/projects?$top=1&api-version=7.1` because it requires both authentication (`vso.project` scope) and basic project read permission, making it ideal for Phase 2 readiness validation.

GSD skill files live at `~/.claude/commands/gsd/` as markdown files with YAML frontmatter. They reference workflows and are not executable scripts. The helper script `azdo-tools.cjs` goes in `~/.claude/get-shit-done/bin/` alongside `gsd-tools.cjs`, following the same CJS module pattern.

**Primary recommendation:** Build `azdo-tools.cjs` as a standalone CJS script with a `makeRequest(options)` core, then expose discrete exported functions (`testConnection`, `getConfig`, `saveConfig`). Skill files call this via `node azdo-tools.cjs <command>` from Bash tool calls.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `https` | Node 22 (available) | HTTP calls to Azure DevOps REST API | No external deps; matches `gsd-tools.cjs` pattern; Node 22 has native `fetch` as alternative |
| Node.js built-in `fs` | Node 22 | Read/write `.planning/azdo-config.json` | Same pattern used throughout gsd-tools.cjs |
| Node.js built-in `path` | Node 22 | Resolve config file paths | Same pattern used throughout gsd-tools.cjs |
| Node.js built-in `readline` | Node 22 | Interactive prompts in setup wizard (if needed in helper) | Built-in; no TTY dependency issues |
| `Buffer` (built-in) | Node 22 | base64 encode/decode PAT | `Buffer.from(':' + pat).toString('base64')` — standard pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AskUserQuestion` tool | GSD built-in | Interactive prompts in skill files | Preferred for Claude-mediated skill interaction; use instead of readline in skill context |
| `Bash` tool | GSD built-in | Execute `node azdo-tools.cjs <cmd>` from skill | Bridge between Claude skill and Node.js helper |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `https` module | Native `fetch` (Node 18+) | Both work; `https` matches existing patterns in gsd-tools.cjs; `fetch` is simpler for async |
| `node azdo-tools.cjs` subprocess | Inline JS in Bash | Subprocess is cleaner, reusable across phases, matches gsd-tools.cjs pattern |
| project-local config | env variables | Config file is locked decision; ties credentials to repo context |

**Installation:**

No installation required. `azdo-tools.cjs` is a new file; all dependencies are Node.js built-ins available in Node 22.

Files to create:
```
~/.claude/get-shit-done/bin/azdo-tools.cjs     # API helper script
~/.claude/commands/gsd/azdo-setup.md            # Setup wizard skill
~/.claude/commands/gsd/azdo-test.md             # Connection test skill
```

---

## Architecture Patterns

### Recommended Project Structure

```
~/.claude/
├── commands/gsd/
│   ├── azdo-setup.md            # /gsd:azdo-setup skill
│   └── azdo-test.md             # /gsd:azdo-test skill
└── get-shit-done/bin/
    ├── gsd-tools.cjs            # (existing) GSD workflow tools
    └── azdo-tools.cjs           # (new) Azure DevOps API helper

.planning/
└── azdo-config.json             # Credential storage (project-local, git-ignored)
```

### Pattern 1: GSD Skill File Structure

**What:** Markdown file with YAML frontmatter that defines a `/gsd:` command. Claude reads the file and executes the described process using the allowed tools.

**When to use:** Every new `/gsd:azdo-*` command is a separate `.md` file in `~/.claude/commands/gsd/`.

**Example:**
```markdown
---
name: gsd:azdo-setup
description: Configure Azure DevOps connection credentials
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Prompt for org URL, project name, and PAT. Store in .planning/azdo-config.json.
Run connection test after saving.
</objective>

<process>
1. Check if .planning/azdo-config.json exists
2. If exists: display current values (PAT masked), offer update or confirm
3. Prompt: organisation URL
4. Prompt: project name
5. Prompt: PAT (sensitive — mask immediately)
6. Save to .planning/azdo-config.json
7. Auto-run: node ~/.claude/get-shit-done/bin/azdo-tools.cjs test
8. Show result to user
</process>
```

### Pattern 2: CJS Helper Script (azdo-tools.cjs)

**What:** Node.js CommonJS script in `~/.claude/get-shit-done/bin/` that handles all Azure DevOps HTTP calls. Follows the same structure as `gsd-tools.cjs`.

**When to use:** All Azure DevOps API calls go through this script. Skills call it via `node azdo-tools.cjs <command>`.

**Example:**
```javascript
// Source: modeled on ~/.claude/get-shit-done/bin/gsd-tools.cjs pattern
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Config helpers ───────────────────────────────────────────────────────────

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'azdo-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('No config found. Run /gsd:azdo-setup first.');
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveConfig(cwd, config) {
  const configPath = path.join(cwd, '.planning', 'azdo-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function encodePat(pat) {
  return Buffer.from(':' + pat).toString('base64');
}

function decodePat(encoded) {
  // base64 decode then strip leading ':'
  return Buffer.from(encoded, 'base64').toString('utf-8').slice(1);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function makeRequest(url, encodedPat) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + encodedPat,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdTest(cwd) {
  const config = loadConfig(cwd);
  const pat = decodePat(config.pat);
  const encodedPat = encodePat(pat);
  const url = `https://dev.azure.com/${config.org}/_apis/projects?$top=1&api-version=7.1`;
  const { status } = await makeRequest(url, encodedPat);
  if (status === 200) {
    console.log(`Connected to ${config.org}/${config.project}`);
    process.exit(0);
  } else if (status === 401) {
    console.error('Authentication failed. Check your PAT is correct.');
    process.exit(1);
  } else if (status === 403) {
    console.error('Authorisation denied. Check your PAT has the correct scopes (vso.project, vso.work).');
    process.exit(1);
  } else {
    console.error(`Unexpected response: HTTP ${status}`);
    process.exit(1);
  }
}

// ─── CLI Router ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const command = args[0];

  switch (command) {
    case 'test': await cmdTest(cwd); break;
    default:
      console.error('Usage: node azdo-tools.cjs <command>');
      process.exit(1);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
```

### Pattern 3: Config File Schema

**What:** `.planning/azdo-config.json` stores credentials project-locally.

**When to use:** Created by `/gsd:azdo-setup`, read by `azdo-tools.cjs` and future phase skills.

**Example:**
```json
{
  "org": "myorganisation",
  "project": "MyProject",
  "pat": "OjRBVE..."
}
```

Notes:
- `org` = organisation name only (not the full URL) — the helper script constructs `https://dev.azure.com/{org}/`
- `pat` = base64-encoded string of `:rawPATvalue` — decode with `Buffer.from(encoded, 'base64').toString('utf-8').slice(1)`
- File MUST be added to `.gitignore` to avoid PAT leakage

### Pattern 4: Azure DevOps PAT Authentication

**What:** HTTP Basic auth with empty username and PAT as password, base64-encoded.

**When to use:** Every request to `https://dev.azure.com/{org}/_apis/...`.

**Example:**
```javascript
// Source: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
// Canonical encoding: empty username, PAT as password
const encodedPat = Buffer.from(':' + rawPat).toString('base64');
const authHeader = 'Basic ' + encodedPat;
// Header: Authorization: Basic OjRBVE9...
```

### Anti-Patterns to Avoid

- **Storing the raw PAT in the config file:** Even with the base64 light-obfuscation decision, never store in plain text — always encode as `Buffer.from(':' + pat).toString('base64')`.
- **Using the org URL as-is from user input:** User may type `https://dev.azure.com/myorg` or just `myorg`. Normalise by extracting the org slug before storing.
- **Hard-coding api-version:** Always pass `?api-version=7.1` (or stable version). Without it, Azure DevOps may default to a different version.
- **Assuming 200 = credentials are valid for all scopes:** A 200 on `/projects` proves `vso.project` scope only. The CONTEXT.md decision says test must also confirm work items read (Phase 2 dependency). Call a work items endpoint too, or use a single endpoint that requires both `vso.project` and `vso.work`.
- **Putting skill wizard logic in the CJS helper:** The wizard interaction (prompts, masking) belongs in the skill file using `AskUserQuestion`. The CJS helper does only HTTP and file I/O.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests | Custom TCP socket | Node.js `https` module | Built-in, handles TLS, redirects, chunked responses |
| Base64 encoding | Custom encoder | `Buffer.from(str).toString('base64')` | Built-in, zero-error, correct padding |
| JSON persistence | Custom flat-file format | `JSON.stringify` / `JSON.parse` + `fs.writeFileSync` | Standard, readable, debuggable |
| URL construction | String concatenation | `new URL(base)` or template literals with validated org slug | Prevents double-slash, encoding bugs |
| Error classification | Regex on error messages | HTTP status codes (200, 401, 403, 404) | Azure DevOps returns correct status codes for auth failures |

**Key insight:** This phase is plumbing — HTTP + file I/O. Everything needed is in Node.js built-ins. Resist introducing `node-fetch`, `axios`, or any npm package.

---

## Common Pitfalls

### Pitfall 1: Wrong PAT Encoding Format

**What goes wrong:** Auth fails with 401 even though the PAT is correct.
**Why it happens:** PAT Basic auth requires `Buffer.from(':' + pat)` — the colon prefix is mandatory. `Buffer.from(pat)` (without colon) produces a different base64 string that Azure DevOps rejects.
**How to avoid:** Always use `:${pat}` (colon + PAT, no username).
**Warning signs:** HTTP 401 despite a valid PAT; the PAT works in a browser but fails in the script.

### Pitfall 2: Org URL Input Normalisation

**What goes wrong:** Config breaks if the user types `https://dev.azure.com/myorg/` vs `myorg`.
**Why it happens:** Users copy the full URL from their browser.
**How to avoid:** In the setup wizard, strip `https://dev.azure.com/` prefix and trailing slashes. Store only the org slug. Reconstruct the URL in `azdo-tools.cjs`.
**Warning signs:** 404 responses when the helper constructs the URL with a doubled scheme (`https://dev.azure.com/https://...`).

### Pitfall 3: Config File Not Git-Ignored

**What goes wrong:** PAT gets committed to git and leaked.
**Why it happens:** `.planning/` directory is new and has no `.gitignore` entry.
**How to avoid:** `/gsd:azdo-setup` must create or update `.planning/.gitignore` (or root `.gitignore`) to exclude `azdo-config.json` before writing the config file.
**Warning signs:** `git status` showing `azdo-config.json` as untracked.

### Pitfall 4: Connection Test Scope Mismatch

**What goes wrong:** Test passes (200) but Phase 2 still fails because the PAT lacks `vso.work` scope.
**Why it happens:** `GET /_apis/projects` only requires `vso.project`. The user could create a read-only project token that cannot read work items.
**How to avoid:** The connection test should also query a work items endpoint. Use `GET /_apis/wit/workitems?ids=1&api-version=7.1` or try `GET /{project}/_apis/wit/wiql?api-version=7.1` — a 403 means `vso.work` is missing.
**Warning signs:** Test says "Connected" but Phase 2 fails with 403 on work item queries.

### Pitfall 5: Skill File vs Helper Script Responsibility Confusion

**What goes wrong:** Setup wizard prompts and config writing end up duplicated in both the skill and the helper.
**Why it happens:** It is tempting to make `azdo-tools.cjs` handle everything.
**How to avoid:** Strict boundary — skill file handles user interaction (via `AskUserQuestion`) and calls helper for I/O and HTTP. Helper has no user interaction logic.
**Warning signs:** The CJS script using `readline` for interactive prompts.

### Pitfall 6: Process Exit Codes Not Used

**What goes wrong:** Skill does not detect test failure; always reports success.
**Why it happens:** `node azdo-tools.cjs test` output is read but exit code ignored.
**How to avoid:** In the Bash tool call, check `$?` or use `&&` / `||`. The CJS script must call `process.exit(1)` on failure and `process.exit(0)` on success.
**Warning signs:** Skill shows "Connected" even when credentials are wrong.

---

## Code Examples

Verified patterns from official sources and the existing gsd-tools.cjs codebase.

### PAT Authentication Header

```javascript
// Source: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
// The username is intentionally empty; PAT follows the colon
const encodedPat = Buffer.from(':' + rawPat).toString('base64');
const headers = {
  'Authorization': 'Basic ' + encodedPat,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
```

### Connection Test Endpoint

```javascript
// Source: https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.2
// Required PAT scope: vso.project (read projects)
const url = `https://dev.azure.com/${org}/_apis/projects?$top=1&api-version=7.1`;

// For Phase 2 readiness — also check vso.work scope:
// Source: Azure DevOps REST API Work Items
const witUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems?ids=1&api-version=7.1`;
// Note: a 404 (item not found) is still a success for auth check; 401/403 = scope missing
```

### Org URL Normalisation

```javascript
// Normalise user input to org slug only
function normaliseOrgUrl(input) {
  // Strip protocol and host if user pasted a full URL
  const stripped = input
    .replace(/^https?:\/\/dev\.azure\.com\//i, '')
    .replace(/^https?:\/\/[^/]+\//i, '')  // on-premises URLs
    .replace(/\/$/, '');                   // trailing slash
  return stripped;
}
// Examples:
//   'https://dev.azure.com/myorg/'  → 'myorg'
//   'myorg'                          → 'myorg'
//   'myorg/'                         → 'myorg'
```

### Config File Read/Write

```javascript
// Source: modeled on ~/.claude/get-shit-done/bin/lib/config.cjs pattern
const fs = require('fs');
const path = require('path');

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'azdo-config.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveConfig(cwd, { org, project, pat }) {
  const configPath = path.join(cwd, '.planning', 'azdo-config.json');
  // Store pat as base64 of ':' + rawPat (light obfuscation per CONTEXT.md decision)
  const encoded = Buffer.from(':' + pat).toString('base64');
  const config = { org, project, pat: encoded };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
```

### HTTPS Request (no external deps)

```javascript
// Source: Node.js 22 built-in https module
const https = require('https');

function makeRequest(url, authHeader) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
```

### .gitignore Update for Config

```bash
# In /gsd:azdo-setup skill, after writing config:
# Add azdo-config.json to .gitignore (create if missing)
GITIGNORE="$CWD/.planning/.gitignore"
if ! grep -q "azdo-config.json" "$GITIGNORE" 2>/dev/null; then
  echo "azdo-config.json" >> "$GITIGNORE"
fi
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Azure DevOps OAuth 2.0 | PAT + Microsoft Entra ID OAuth | April 2025 (new registrations blocked) | Not relevant — we use PAT per locked decision |
| Full-scope PATs | Granular PAT scopes | 2022+ | Must tell user to create PAT with `vso.project` + `vso.work` minimum scopes |
| node-fetch for Node HTTP | Native `fetch` or `https` | Node 18+ | Both work; `https` matches existing codebase style |

**Deprecated/outdated:**
- Azure DevOps OAuth 2.0: New registrations blocked April 2025, full deprecation 2026. Not our concern — PAT is the chosen approach.
- PAT format: PATs are now 84 characters (up from older shorter format), with `AZDO` signature at positions 76-80. Not relevant to implementation but important for user guidance.

---

## Open Questions

1. **Work items scope validation in the connection test**
   - What we know: `GET /_apis/projects?$top=1` only validates `vso.project` scope. Phase 2 needs `vso.work`.
   - What's unclear: Whether a WIQL query with no results (empty sprint) returns 200 or 404 — this affects how we detect scope problems vs empty data.
   - Recommendation: Use `GET /{org}/{project}/_apis/wit/workitems?ids=1&api-version=7.1` — a 404 means the item doesn't exist (auth OK), 401/403 means scope missing.

2. **On-premises Azure DevOps Server vs cloud**
   - What we know: The base URL pattern differs (`https://dev.azure.com/{org}` vs `https://{server}/{collection}`).
   - What's unclear: Whether any users of this tool will use Azure DevOps Server (on-premises).
   - Recommendation: Phase 1 targets Azure DevOps Services (cloud) only. Normalise to cloud URL. Document this limit clearly.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework exists yet |
| Config file | None — Wave 0 must establish if tests are added |
| Quick run command | `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test` (manual smoke test) |
| Full suite command | Manual verification via `/gsd:azdo-test` skill |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-01 | Config file created with org, project, encoded PAT | smoke | `node -e "require('fs').existsSync('.planning/azdo-config.json') && console.log('OK')"` | ❌ Wave 0 |
| API-01 | PAT is base64-encoded (not plain text) | unit | Inspect config file: `node -e "const c=require('./.planning/azdo-config.json'); console.log(c.pat.startsWith('Oj') ? 'encoded' : 'PLAIN')"` | ❌ Wave 0 |
| API-02 | Connection test exits 0 on success | smoke | `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test; echo "exit: $?"` | ❌ Wave 0 |
| API-02 | Connection test exits 1 on bad credentials | smoke | Manual — requires a known-bad PAT | manual-only |
| API-02 | Failure message includes suggested fix | smoke | Manual — read output with bad PAT | manual-only |

### Sampling Rate

- **Per task commit:** `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test` (requires real credentials — may be skipped in CI)
- **Per wave merge:** Full smoke test of both skill commands
- **Phase gate:** Both `/gsd:azdo-setup` and `/gsd:azdo-test` must succeed with real credentials before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/azdo-config.json` must exist (created by `/gsd:azdo-setup` execution, not pre-created)
- [ ] `~/.claude/get-shit-done/bin/azdo-tools.cjs` — new file, created in Wave 0 of plan
- [ ] `~/.claude/commands/gsd/azdo-setup.md` — new file, created in Wave 0 of plan
- [ ] `~/.claude/commands/gsd/azdo-test.md` — new file, created in Wave 0 of plan
- [ ] `.planning/.gitignore` entry for `azdo-config.json` — added during setup execution

---

## Sources

### Primary (HIGH confidence)

- [Azure DevOps REST API — Projects List](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.2) — endpoint URL, required scopes, response format
- [Use personal access tokens — Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops) — PAT format (84 chars), encoding pattern, HTTP header format
- [OAuth 2.0 scopes — Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops#available-scopes) — complete scope list; `vso.project` (project read), `vso.work` (work items read)
- `~/.claude/get-shit-done/bin/gsd-tools.cjs` — CJS structure, CLI router pattern, `--cwd` flag, `output()` helper, file I/O patterns
- `~/.claude/get-shit-done/bin/lib/config.cjs` — config file read/write patterns
- `~/.claude/commands/gsd/discuss-phase.md` — skill file frontmatter format, `allowed-tools`, `AskUserQuestion` usage

### Secondary (MEDIUM confidence)

- [REST API samples for Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/rest/samples?view=azure-devops) — PAT Basic auth header pattern confirmed; `Buffer.from(':' + pat).toString('base64')` is the canonical encoding

### Tertiary (LOW confidence)

- WebSearch results confirming Node.js 22 native fetch and `https` module both work for Azure DevOps REST — not independently verified with an actual API call

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — locked in CONTEXT.md, matches existing gsd-tools.cjs exactly
- Azure DevOps API auth: HIGH — verified from official Microsoft Learn docs
- Architecture (skill file pattern): HIGH — read existing GSD skill files directly
- PAT scopes needed: HIGH — verified from official OAuth scopes page
- Pitfalls: MEDIUM — derived from API docs + code analysis; items 3 and 6 are especially well-supported
- Connection test endpoint choice: MEDIUM — logical choice based on scope documentation; recommend verifying with real credentials during implementation

**Research date:** 2026-03-04
**Valid until:** 2026-09-04 (stable API; Azure DevOps REST API is versioned and backward-compatible)
