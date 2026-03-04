---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual smoke tests via Node.js CLI |
| **Config file** | None — Wave 0 creates azdo-tools.cjs |
| **Quick run command** | `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test` |
| **Full suite command** | Manual verification via `/gsd:azdo-test` skill |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test` (requires real credentials)
- **After every plan wave:** Full smoke test of both skill commands
- **Before `/gsd:verify-work`:** Both `/gsd:azdo-setup` and `/gsd:azdo-test` must succeed with real credentials
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | API-01 | smoke | `node -e "require('fs').existsSync('.planning/azdo-config.json') && console.log('OK')"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | API-01 | unit | `node -e "const c=require('./.planning/azdo-config.json'); console.log(c.pat.startsWith('Oj') ? 'encoded' : 'PLAIN')"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | API-02 | smoke | `node ~/.claude/get-shit-done/bin/azdo-tools.cjs test; echo "exit: $?"` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | API-02 | manual | Manual — requires known-bad PAT | N/A | ⬜ pending |
| 1-01-05 | 01 | 1 | API-02 | manual | Manual — read output with bad PAT | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `~/.claude/get-shit-done/bin/azdo-tools.cjs` — new file, HTTP helper for Azure DevOps API
- [ ] `~/.claude/commands/gsd/azdo-setup.md` — new skill file for setup wizard
- [ ] `~/.claude/commands/gsd/azdo-test.md` — new skill file for connection test
- [ ] `.planning/.gitignore` entry for `azdo-config.json`

*Wave 0 creates foundational files; no pre-existing test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connection test exits 1 on bad credentials | API-02 | Requires intentionally invalid PAT | Run `/gsd:azdo-test` with a revoked or wrong PAT; verify exit code 1 and error message |
| Failure message includes suggested fix | API-02 | Output inspection required | Read stderr/stdout for actionable remediation text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
