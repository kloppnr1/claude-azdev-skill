# claude-azdev-plugin

An Azure DevOps plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that turns your sprint backlog into working code.

Point it at your sprint, and it will read your stories, analyze the relevant repos, write implementation plans, generate code, create PRs, and resolve tasks — all without leaving your terminal. Run `/azdev-execute` and walk away. Come back to pull requests linked to your stories, tasks marked as resolved, and a summary of everything it did.

**No browser tab juggling. No copy-pasting story descriptions. No manual status updates.** Your sprint board stays in sync because the plugin updates it as it works.

## What can it do?

- **View your sprint** from the terminal — stories, tasks, state, descriptions, all color-coded
- **Create stories and tasks** from natural language — just describe what you need
- **Analyze stories** — reads the target repo, traces code paths, identifies the files that need changes, and writes a detailed implementation spec
- **Execute stories autonomously** — creates a feature branch, writes the code, runs tests, commits, pushes, creates a PR linked to the story, and resolves all tasks
- **Batch mode** — run `/azdev-execute` with no arguments and it loops through every story in your sprint. Errors on one story don't block the next

Zero external dependencies. Just Node.js built-ins and the Azure DevOps REST API.

## Quick start

```
/azdev-setup              →  Connect to Azure DevOps (one-time)
/azdev-sprint             →  See your sprint board
/azdev-create <description> → Create stories & tasks from natural language
/azdev-plan [story-id]    →  Analyze stories → pick repos → verify → generate specs
/azdev-execute [story-id] →  Implement, commit, push, create PR, resolve tasks
```

**The typical workflow:**
1. `/azdev-sprint` — see what's in the sprint
2. `/azdev-create` — add missing stories or tasks (optional)
3. `/azdev-plan` — analyze stories, pick repos, verify understanding, generate implementation specs
4. `/azdev-execute` — implement everything, create PRs, resolve tasks automatically

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js (no external dependencies — uses built-in modules only)
- An Azure DevOps Personal Access Token with these scopes:
  - `vso.project` — read project/iteration data
  - `vso.work` — read work items
  - `vso.work_write` — create/update work items
  - `vso.code` — create pull requests

## Installation

```bash
git clone <this-repo> && cd claude-azdev-plugin
./install.sh
```

This copies commands and the helper script to `~/.claude/`. Restart Claude Code to pick up changes.

### Configure credentials

Run the setup command in any project directory:

```
/azdev-setup
```

This prompts for:
- **Organization URL** — e.g., `https://dev.azure.com/yourorg` or just `yourorg`
- **Project name** — your Azure DevOps project
- **PAT** — your Personal Access Token

Credentials are stored in `.planning/azdev-config.json` (PAT is base64-encoded). This file is project-local — add it to `.gitignore`.

### Verify connection

```
/azdev-test
```

Confirms your credentials work and have the required scopes.

## Commands

### `/azdev-setup`

Interactive setup wizard for Azure DevOps credentials. On re-run, shows current values (PAT masked) and lets you update individual fields.

### `/azdev-test`

Tests the stored credentials against the Azure DevOps API. Verifies both `vso.project` and `vso.work` scopes. Shows a clear success/failure message with suggested fixes.

### `/azdev-sprint`

Fetches and displays the current sprint backlog with ANSI-colored state indicators. Shows:
- Sprint name and dates
- User stories with description and acceptance criteria
- Tasks grouped under their parent story
- State (blue=Active, green=Resolved, etc.), assigned user, and other metadata

Defaults to showing only your assigned items (`--me`). Use `--all` to see the entire sprint.

### `/azdev-create <description>`

Create stories and tasks from a natural language description. Parses your intent, shows a plan for confirmation, then creates work items via the Azure DevOps API — all assigned to the current sprint.

Examples:
- `/azdev-create Tilføj prisområde-kolonne til kundelisten` — creates a single User Story
- `/azdev-create Implementer CSV-eksport: 1) Backend endpoint 2) Frontend knap 3) Tests` — creates a story with 3 tasks
- `/azdev-create Tilføj tasks til #42920: test, deploy` — creates tasks under an existing story

### `/azdev-plan [story-id]`

The main analysis pipeline. Run without arguments to plan all assigned stories, or pass a story ID to plan a single story (e.g., `/azdev-plan 42920`). Already resolved stories are automatically skipped.

**What it does, step by step:**

1. **Fetch stories** — pulls your assigned stories from the current sprint via Azure DevOps API
2. **Pick repos** — lists Azure DevOps project repos and asks which one each story belongs to. Resolves the local clone path automatically (scans sibling directories of `$CWD`)
3. **Deep repo analysis** — for each story, searches the target repo for files matching story keywords, reads relevant code, traces call chains, and checks for existing feature branches
4. **Interactive verification** — presents its understanding of each story (summary, work type, repo analysis, tasks) and asks you to confirm or correct. If the story description is sparse, asks targeted follow-up questions instead of guessing
5. **Update Azure DevOps** — replaces the story description with the verified analysis (revision history preserved)
6. **Generate story spec** — writes `STORY.md` to `{repoPath}/.planning/stories/{storyId}.md` with: goal, background, testable acceptance criteria, key files with paths, architecture/code flow, implementation notes, contacts, open questions, and out-of-scope items
7. **Self-review** — checks the generated spec against a quality checklist (specific goal, real file paths, traced code flow, no vague placeholders, blockers captured) and fixes issues before presenting
8. **User approval** — shows the full spec for approve/changes/skip
9. **Task map** — writes/merges `.planning/azdev-task-map.json` mapping story IDs → repos → task IDs for status tracking during execution

**Research mode:** Stories tagged with `research` in Azure DevOps get a deeper treatment — broader codebase exploration, a multi-round dialogue where you discuss findings and possible approaches together, and a STORY.md that includes a "Research Findings" section with problem analysis, approaches considered, and the agreed approach.

### `/azdev-execute [story-id]`

Execute story plans. Two modes depending on arguments:

- **`/azdev-execute 42920`** — single story, interactive. Creates a feature branch, implements the story spec, resolves tasks, creates a PR. Asks for input on blockers.
- **`/azdev-execute`** — all stories, fully autonomous. Loops through every story in the task map without user interaction. Errors on one story don't block the next. Outputs a full summary with all PR links at the end.

PRs are created via the Azure DevOps REST API and automatically linked to the story via `workItemRefs`.

## Helper script CLI

The `azdev-tools.cjs` script handles all Azure DevOps API communication. It can be used standalone:

```bash
# Credentials
node azdev-tools.cjs save-config --org <url> --project <name> --pat <token> --cwd <path>
node azdev-tools.cjs load-config --cwd <path>
node azdev-tools.cjs test --cwd <path>

# Sprint
node azdev-tools.cjs get-sprint --cwd <path>
node azdev-tools.cjs get-sprint-items [--me] --cwd <path>
node azdev-tools.cjs show-sprint [--me] --cwd <path>

# Work items
node azdev-tools.cjs create-work-item --type <type> --title "<title>" [--description "<html>"] [--parent <id>] [--sprint] [--assigned-to "<name>"] [--area "<path>"] [--tags "<tags>"] --cwd <path>
node azdev-tools.cjs update-state --id <workItemId> --state <state> --cwd <path>
node azdev-tools.cjs update-description --id <workItemId> --description "<text>" --cwd <path>
node azdev-tools.cjs update-acceptance-criteria --id <workItemId> --criteria "<html>" --cwd <path>
node azdev-tools.cjs get-child-states --id <storyId> --cwd <path>

# Comments
node azdev-tools.cjs add-comment --id <workItemId> --text "<html>" --cwd <path>
node azdev-tools.cjs delete-comment --id <workItemId> --comment-id <commentId> --cwd <path>

# Git
node azdev-tools.cjs create-branch --repo <path> --story-id <id> --title <title> [--base <branch>]
node azdev-tools.cjs create-pr --repo <path> --branch <name> --base <branch> --title <title> --body <body> --story-id <id> --cwd <path>

# Repositories
node azdev-tools.cjs list-repos [--top <N>] --cwd <path>
node azdev-tools.cjs get-branch-links --id <workItemId> --cwd <path>
```

All commands output JSON to stdout and use exit code 0/1 for success/failure.

## Project structure

```
claude-azdev-plugin/
├── install.sh                     # One-command installer
├── bin/
│   └── azdev-tools.cjs          # Node.js helper — all Azure DevOps API calls
├── commands/
│   ├── azdev-setup.md            # /azdev-setup — credential configuration
│   ├── azdev-test.md             # /azdev-test — connection verification
│   ├── azdev-sprint.md           # /azdev-sprint — sprint backlog display
│   ├── azdev-create.md           # /azdev-create — create stories & tasks
│   ├── azdev-plan.md             # /azdev-plan — story analysis & spec generation
│   └── azdev-execute.md          # /azdev-execute — story execution & PR creation
└── README.md
```

## Security

- PAT is stored base64-encoded in `.planning/azdev-config.json` — this is light obfuscation, not encryption
- Always add `azdev-config.json` to `.gitignore` — the setup command checks for this
- The PAT never leaves your local machine except in API calls to your Azure DevOps instance
- No external dependencies — the helper script uses only Node.js built-in modules (`https`, `fs`, `path`)

## License

MIT
