---
name: devsprint-test
description: Test Azure DevOps connection and verify credentials
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<objective>
Verify that the stored Azure DevOps credentials are valid and have the required scopes (vso.project + vso.work). Shows a clear success or failure message.
</objective>

<execution_context>
Helper: ~/.claude/bin/devsprint-tools.cjs
Config file: .planning/devsprint-config.json
</execution_context>

<context>
$CWD is the project directory where .planning/ lives.

devsprint-tools.cjs test contract:
  node ~/.claude/bin/devsprint-tools.cjs test --cwd $CWD
    -> Success: stdout "Connected to {org}/{project}", exit 0
    -> Failure: stderr error message with suggested fix, exit 1
</context>

<process>
1. **Check devsprint-tools.cjs exists:**
   Check that `~/.claude/bin/devsprint-tools.cjs` exists before running.
   If it does not exist: Tell user "Azure DevOps tools not installed. Check that ~/.claude/bin/devsprint-tools.cjs exists."
   Stop.

2. **Run connection test:**
   Run `node ~/.claude/bin/devsprint-tools.cjs test --cwd $CWD`

3. **Show result:**
   - If exit 0: Show the success message from stdout to the user (e.g., "Connected to myorg/MyProject").
   - If exit 1: Show the error message from stderr to the user. Then tell user: "Run `/devsprint-setup` to reconfigure credentials."
</process>

<success_criteria>
- Clear pass/fail output shown to user
- Success output includes the org and project name
- Failure output includes the error details and the actionable next step: run `/devsprint-setup`
</success_criteria>
