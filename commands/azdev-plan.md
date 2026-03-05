---
name: azdev-plan
description: Analyze and plan sprint stories — all assigned or a single story by ID
argument-hint: "[story-id]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Fetch assigned stories from the current Azure DevOps sprint, ask the user which repo each story belongs to, interactively verify each story with the user, update story descriptions in Azure DevOps, generate PROJECT.md + ROADMAP.md + REQUIREMENTS.md per target repo, and present each for user approval. Write azdev-task-map.json for status tracking during execution.

If a story ID is provided as argument, only process that single story (skip multi-story summary, go straight to analysis).
</objective>

<execution_context>
Helper: ~/.claude/bin/azdev-tools.cjs
Config file: .planning/azdev-config.json
$CWD is the project directory where .planning/ lives.
</execution_context>

<context>
azdev-tools.cjs CLI contracts:

  node ~/.claude/bin/azdev-tools.cjs load-config --cwd $CWD
    -> stdout: JSON {"org":"...","project":"...","pat":"<raw-decoded>"}
    -> exit 0 on success, exit 1 if no config

  node ~/.claude/bin/azdev-tools.cjs get-sprint --cwd $CWD
    -> stdout: JSON {"iterationId":"...","name":"...","path":"...","startDate":"...","finishDate":"..."}
    -> exit 0 on success, exit 1 on error

  node ~/.claude/bin/azdev-tools.cjs get-sprint-items --me --cwd $CWD
    -> stdout: JSON array [{id, type, title, state, description, acceptanceCriteria, parentId, assignedTo}]
    -> --me: filter to authenticated user's items (parent stories + child tasks)
    -> exit 0 on success, exit 1 on error

  node ~/.claude/bin/azdev-tools.cjs update-description --id <workItemId> --description "<html>" --cwd $CWD
    -> stdout: JSON {"status":"updated","id":N}
    -> Uses PATCH API with application/json-patch+json content type
    -> exit 0 on success, exit 1 on error
</context>

<process>

**Step 0 — Parse arguments:**

Check if the user passed a story ID as argument (e.g., `/azdev-plan 42920` or `/azdev-plan #42920`).
- If a numeric ID is provided: set `singleStoryMode = true` and `targetStoryId = <the ID>`.
- If no argument: set `singleStoryMode = false` (process all assigned stories).
- If argument is a task ID (not a story), it will be resolved to its parent story in Step 3.

**Step 1 — Check prerequisites:**

1. Verify `~/.claude/bin/azdev-tools.cjs` exists via Bash `test -f ~/.claude/bin/azdev-tools.cjs`.
   If it does not exist: tell the user "Azure DevOps tools not installed. Check that ~/.claude/bin/azdev-tools.cjs exists." Stop.

2. Run `node ~/.claude/bin/azdev-tools.cjs load-config --cwd $CWD`.
   If exit 1: tell the user "No Azure DevOps config found. Run `/azdev-setup` to configure your connection." Stop.

**Step 2 — Fetch sprint metadata:**

Run `node ~/.claude/bin/azdev-tools.cjs get-sprint --cwd $CWD`.
- If exit 1: show the error message to the user. Stop.
- If exit 0: parse the JSON. Extract `name` for display.

**Step 3 — Fetch assigned stories:**

Run `node ~/.claude/bin/azdev-tools.cjs get-sprint-items --me --cwd $CWD`.
- If exit 1: show the error message to the user. Stop.
- If exit 0: parse the JSON array.

Filter to top-level stories only:
- Items where `type === "User Story"` AND (`parentId === null` OR `parentId` is not present in the items list).
- Collect child tasks for each story: items where `parentId === storyId`.

**Single-story filtering (if `singleStoryMode`):**
- Find the item matching `targetStoryId` in the fetched items.
- If the matching item is a Task (not a User Story), use its `parentId` to find the parent story. Process that parent story only.
- If the matching item IS a User Story, process it directly.
- If `targetStoryId` is not found in the sprint items, tell the user: "Story #{targetStoryId} not found in your current sprint items." Stop.
- After filtering, continue with only this one story — skip Step 5 (multi-story summary) and go directly to Step 4.

**Step 4 — Ask user for target repo per story:**

For each story to process, ask the user which local repository it belongs to.

1. **Scan for known repos:** List git repos in the parent directory of `$CWD` by running:
   `ls -d {parentDir}/*/.git 2>/dev/null | sed 's|/.git||' | xargs -I{} basename {}`
   This gives a list of candidate repo names.

2. **Check existing task map:** If `$CWD/.planning/azdev-task-map.json` exists, check if this story already has a `repoPath` mapping. If so, use it as the default suggestion.

3. **Ask the user** using `AskUserQuestion`:
   - Question: "Which repo should story #{id} ({title}) be planned in?"
   - Options: list the discovered repo names as options (max 4, prioritize repos already in the task map). The user can also type a custom path via "Other".
   - If only one repo is found, still confirm with the user.

4. **Resolve the local path:**
   - If the user picks a repo name: use `{parentDir}/{repoName}` as the path.
   - If the user provides a custom path: use that path.
   - Verify the path exists and contains `.git` via Bash. If not, warn and re-ask.

5. Store the resolved `repoPath` for this story. Continue to Step 4.5.

**Step 4.5 — Repo analysis per story:**

After resolving the target repo for each story, analyze the repo to understand the codebase.

For each story with a resolved local repo path:

1. **Switch to the target repo directory** and look at the repo structure:
   - Look at key directories, tech stack indicators (package.json, *.csproj, *.sln, etc.).
   - Run `git branch -a` to see available branches.

2. **Check for existing work:** Check if a feature branch for this story already exists:
   - Run `git branch -a | grep -i {storyId}` to find branches matching the story ID.
   - If a matching branch exists, get the diff against the default branch to see existing progress.

3. **Produce a repo analysis summary** for each story:
   - **Tech stack**: detected from repo (e.g., "C# / .NET", "TypeScript / React", "Python / FastAPI")
   - **Architecture observations**: key patterns or layers in the repo (e.g., "API controller + service layer + DB migration")
   - **Existing branch**: if a feature branch for this story was found, note it and summarize progress
   - **Risks or concerns**: anything notable (e.g., "large repo", "complex build setup")

Store this analysis per story — it is used in Step 5.5 for the interactive verification and in Steps 8-10 for project file generation.

**Step 5 — Show summary and confirm:**

**Skip this step entirely if `singleStoryMode` is true.** Go directly to Step 5.5.

Display summary in this format:
```
=== Analysis: {sprintName} ===

You have {N} stories:

  [US] #{id} -- {title} ({state}) → {repoName}
  [US] #{id} -- {title} ({state}) → {repoName}

Proceed to analyze? (yes/no)
```

Use `AskUserQuestion` tool for confirmation. If the user says "no" or anything other than "yes", stop with: "Analysis cancelled. No changes made."

**Step 5.5 — Interactive verification per story:**

For each story, present the following to the user:

```
### #{id} — {title} ({state})

**My understanding:**
{2-3 sentences summarizing what the story is about, based on description + acceptance criteria + child tasks}

**Work type:** [Code change / Manual/operational / Blocked]

**Target repo:** {repoName} ({repoPath})

**Repo analysis** (from Step 4.5):
  Tech stack: {detected tech stack}
  Architecture: {key patterns/layers}
  {If existing branch found: "Existing branch: {branchName} — {progress summary}"}
  {If risks/concerns: "Risks: {risks}"}

**Tasks:**
{list of child tasks with their state}
```

Use `AskUserQuestion` with:
- Question: "Is this understanding correct for #{id}?"
- Options: "Yes" / "No, let me correct it"

If "Yes": store the verified understanding (summary text + work type) for this story.
If "No, let me correct it": ask "What is the correct understanding?" as a free-text follow-up. Then re-present the corrected version for confirmation. Repeat until approved.

The verified understanding per story is used in later steps for project file generation.

**Step 5.6 — Update story description in Azure DevOps:**

For each verified story, **replace** the description with the verified analysis. Azure DevOps keeps revision history, so the original description is not lost.

Construct the new description HTML:
```html
<strong>Arbejdstype:</strong> {Code change/Manual/operational/Blocked}<br>
<strong>Opsummering:</strong> {verified understanding text}<br>
<strong>Opgaver:</strong><br>
{for each child task: "- {task.title} ({task.state})<br>"}
<br>
<em>Sprint-analyse verificeret {today's date}</em>
```

Then run:
```
node ~/.claude/bin/azdev-tools.cjs update-description --id {storyId} --description "{newDescriptionHtml}" --cwd $CWD
```

If update fails, warn the user but continue (non-blocking error). The verified understanding is still used locally for file generation.

**Step 7 — Check for existing .planning/ in target repo:**

For each repo that will be processed:
- Check if `{repoPath}/.planning/PROJECT.md` exists via Bash `test -f`.
- If it exists, use `AskUserQuestion`:
  "Repo {repoName} already has a project at {repoPath}/.planning/PROJECT.md. Overwrite it? (yes/no)"
  If the user says "no", skip this repo. Default to no if unclear.

**Step 8 — Generate PROJECT.md for each target repo:**

Use the `Write` tool to create `{repoPath}/.planning/PROJECT.md`. Ensure `.planning/` directory exists first (create via Bash `mkdir -p "{repoPath}/.planning"` if needed).

**IMPORTANT:** Use the **verified understanding** from Step 5.5 (not the raw AzDO description) for "What This Is" and "Core Value" sections. The verified understanding has been validated by the user and correctly describes what the work actually involves.

Map Azure DevOps fields to PROJECT.md sections:

```markdown
# {repoName}

## What This Is

{verified understanding from Step 5.5 — the user-approved summary of what this story is about}
This work is tracked as Azure DevOps story #{story.id}: "{story.title}".

## Core Value

{Derived from the verified understanding — the single must-work thing. One sentence.}

## Requirements

### Validated

(None yet — ship to validate)

### Active

{For each criterion in story.acceptanceCriteria (split on newlines, skip blank lines):}
- [ ] {criterion text}
{For each child task in the story's child tasks:}
- [ ] {task.title}

### Out of Scope

(Defined during phase planning)

## Context

- Azure DevOps Story: #{story.id} -- {story.title}
- Sprint: {sprintName}
- Target repo: {repoName}
- State: {story.state}
- Work type: {verified work type from Step 5.5}

## Repo Analysis

{Repo analysis summary from Step 4.5:}
- **Tech stack**: {detected tech stack}
- **Architecture**: {key patterns/layers}
- **Existing branch**: {branch info or "None"}
- **Risks**: {any concerns, or "None identified"}

## Constraints

- **Tech stack**: {detected tech stack from repo analysis}
- **Auth**: Azure DevOps PAT for API access

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| (Defined during phase planning) | | |

---
*Last updated: {today's date} after analysis via /azdev-plan*
```

Formatting rules:
- Strip all HTML from description and acceptanceCriteria before writing (already done by azdev-tools.cjs stripHtml for sprint items; acceptance criteria from `get-sprint-items` is already plain text).
- If acceptanceCriteria is empty or null, omit the acceptance criteria checkboxes — just include the child task checkboxes.
- If description is empty, write "(No description provided)" in What This Is.
- Do NOT include any HTML tags in the generated file.

**Step 9 — Generate ROADMAP.md for each target repo:**

Use the `Write` tool to create `{repoPath}/.planning/ROADMAP.md`.

**IMPORTANT:** Use the **verified work type** from Step 5.5 to decide the roadmap structure:
- **Code change**: Generate full phase details with implementation plans.
- **Manual/operational**: Generate a simplified roadmap noting the work is manual — no detailed code phases needed. Include a single "Execute manual steps" phase.
- **Blocked**: Note the blocker in the overview and generate a single "Unblock and implement" phase.

Map Azure DevOps fields:
```markdown
# Roadmap: {story.title}

## Overview

This roadmap tracks the implementation of Azure DevOps story #{story.id}: {story.title}, as part of sprint {sprintName}. The work is organized into phases based on the acceptance criteria and child tasks.

{If work type is Manual/operational: "Note: This story involves manual/operational work, not code changes. Phases reflect manual steps to complete."}
{If work type is Blocked: "Note: This story is currently blocked. Phase 1 focuses on resolving the blocker."}

## Phases

- [ ] **Phase 1: Implementation** - {Use verified understanding to write a more accurate phase description}

## Phase Details

### Phase 1: Implementation
**Goal**: {Use verified understanding to write an accurate goal}
**Depends on**: Nothing (first phase)
**Requirements**: [{requirement IDs from REQUIREMENTS.md, e.g., REQ-01, REQ-02}]
**Success Criteria** (what must be TRUE):
{For each acceptance criterion:}
  1. {criterion text}
**Plans**: TBD

Plans:
- [ ] 01-01: Initial implementation

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Implementation | 0/1 | Not started | - |
```

Adapt the phase structure if child tasks naturally group into multiple phases (e.g., separate frontend/backend phases). Keep it simple — single story = 1-2 phases is the default.

**Step 10 — Generate REQUIREMENTS.md for each target repo:**

Use the `Write` tool to create `{repoPath}/.planning/REQUIREMENTS.md`.

Derive requirement IDs from acceptance criteria and child tasks. Format:

```markdown
# Requirements: {repoName}

## Active Requirements

| ID | Description | Source | Status |
|----|-------------|--------|--------|
| REQ-01 | {first acceptance criterion or child task} | AzDO #{story.id} | Active |
| REQ-02 | {second criterion} | AzDO #{story.id} | Active |

## Requirement Details

### REQ-01: {short name}

**Description**: {full criterion text}
**Source**: Azure DevOps story #{story.id}, acceptance criteria
**Status**: Active
**Acceptance**: {same criterion text}

---
*Generated from Azure DevOps sprint analysis via /azdev-plan*
*Sprint: {sprintName}*
*Story: #{story.id} -- {story.title}*
```

Number requirements sequentially (REQ-01, REQ-02, ...). Use acceptance criteria first, then child task titles for any remaining requirements.

**Step 11 — Present for approval per repo:**

After generating the three files for a repo, show the user the generated content. Use `AskUserQuestion`:

"Review the generated project for {repoName}:

PROJECT.md has been written to {repoPath}/.planning/PROJECT.md
ROADMAP.md has been written to {repoPath}/.planning/ROADMAP.md
REQUIREMENTS.md has been written to {repoPath}/.planning/REQUIREMENTS.md

[Show key sections: What This Is, Core Value, Requirements Active list, Roadmap phases]

Approve, request changes, or skip? (approve/changes/skip)"

- If "approve": keep the written files, move to next repo.
- If "changes": ask "What would you like to change?" then regenerate the affected files incorporating the feedback, and re-present for approval. Repeat until approved or skipped.
- If "skip": delete the generated files (run `rm "{repoPath}/.planning/PROJECT.md" "{repoPath}/.planning/ROADMAP.md" "{repoPath}/.planning/REQUIREMENTS.md"` via Bash). Note the skip in the final summary.

**Step 11.5 — Write azdev-task-map.json:**

After all repos have been processed (approved or skipped), update the task map for status tracking.

**Merge behavior:** If `$CWD/.planning/azdev-task-map.json` already exists, read it first and merge:
- Keep existing mappings for stories NOT being re-planned.
- Add or replace mappings for the story/stories just processed.
- Update `generatedAt` timestamp.

If the file does not exist, create it fresh.

For each **approved** repo, create a mapping entry:
- `storyId`: the Azure DevOps story ID (number)
- `storyTitle`: the story title
- `repoPath`: the resolved local repo path (from Step 4)
- `taskIds`: array of child task IDs that belong to this story
- `taskTitles`: object mapping task ID (as string key) to task title

Write the complete map to `$CWD/.planning/azdev-task-map.json` using the Write tool:
```json
{
  "version": 1,
  "sprintName": "{sprintName from Step 2}",
  "generatedAt": "{ISO timestamp}",
  "mappings": [ ... entries for approved repos ... ]
}
```

If all repos were skipped (no approved entries) and no existing file, do NOT write the file.

This file is used for automatic Azure DevOps status updates during execution: tasks are identified by their IDs and can be transitioned New → Active → Resolved using `azdev-tools.cjs update-state`.

**Step 12 — Final summary:**

After processing all repos, display:
```
=== Analysis Complete ===

Projects bootstrapped:
  #{storyId} {storyTitle} → {repoName}: {repoPath}/.planning/ (approved)

Skipped:
  #{storyId} {storyTitle}: user skipped

Task map written to: $CWD/.planning/azdev-task-map.json

Next steps:
  Navigate to each target repo to begin implementation.
  Use azdev-task-map.json to track and update task status in Azure DevOps.
```

If `singleStoryMode`: simplify the summary to just show the single story result.

</process>

<error_handling>

**Common errors and responses:**

- Story has no description: Generate "What This Is" with "(No description provided). This work is tracked as Azure DevOps story #{story.id}: \"{story.title}\"."

- Story has no acceptance criteria AND no child tasks: Generate a single placeholder requirement: `- [ ] Implement story #{story.id}: {story.title}`.

- Empty sprint or no assigned stories: Display "No stories assigned to you in the current sprint. Nothing to analyze."

- Story ID not found (single-story mode): Display "Story #{targetStoryId} not found in your current sprint items. Run `/azdev-sprint` to see your assigned items."

- Repo path does not exist or has no .git: Warn user and re-ask for repo.

</error_handling>

<success_criteria>
- Single-story mode: `/azdev-plan 42920` processes only story #42920 without multi-story summary
- All-stories mode: `/azdev-plan` (no args) processes all assigned stories as before
- Task/child ID argument resolves to parent story automatically
- User is asked which repo each story belongs to (no automatic branch link resolution)
- Repo choice is stored in azdev-task-map.json for use during execution
- Each story is interactively verified with the user before file generation (Step 5.5)
- Verified analysis replaces the story description in Azure DevOps (Step 5.6)
- PROJECT.md, ROADMAP.md, and REQUIREMENTS.md use the verified understanding (not raw AzDO data)
- Stories are correctly categorized by work type (code change vs manual/operational vs blocked)
- User can approve or request changes per repo before files are finalized
- No HTML artifacts appear in any generated file
- azdev-task-map.json merges with existing entries (does not overwrite unrelated stories)
- Task IDs in the map can be used to update status (New → Active → Resolved) during execution
</success_criteria>
