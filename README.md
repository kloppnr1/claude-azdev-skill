# claude-azdev-skill

Azure DevOps integration skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Pull your sprint backlog into the terminal, analyze user stories, bootstrap project plans, and automatically update work item status — all without leaving your editor.

## What it does

This skill set bridges Azure DevOps and Claude Code so you can go from "pick a sprint task" to "analyzed, planned, and executed" with minimal friction.

The pipeline:

1. **Connect** — Configure your Azure DevOps org, project, and Personal Access Token
2. **View sprint** — Fetch the current sprint backlog with stories, tasks, descriptions, and acceptance criteria
3. **Analyze** — Run `/azdev` to analyze stories, verify understanding with the user, update descriptions in Azure DevOps, and generate project plans (PROJECT.md + ROADMAP.md + REQUIREMENTS.md) in each target repo
4. **Execute** — Navigate to target repos and implement. Task status updates (New → Active → Resolved) are tracked via `azdev-task-map.json`

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js (no external dependencies — uses built-in modules only)
- An Azure DevOps Personal Access Token with these scopes:
  - `vso.project` — read project/iteration data
  - `vso.work` — read work items
  - `vso.work_write` — update work item state
  - `vso.code` — read Git repository info (for branch link resolution)

## Installation

### 1. Copy skill commands

Copy the skill files to your Claude Code commands directory:

```bash
cp commands/azdev*.md ~/.claude/commands/
```

### 2. Copy helper script

Copy the Node.js helper script to Claude Code's bin directory:

```bash
mkdir -p ~/.claude/bin
cp bin/azdev-tools.cjs ~/.claude/bin/
```

### 3. Configure credentials

Run the setup command in any project directory:

```
/azdev-setup
```

This prompts for:
- **Organization URL** — e.g., `https://dev.azure.com/yourorg` or just `yourorg`
- **Project name** — your Azure DevOps project
- **PAT** — your Personal Access Token

Credentials are stored in `.planning/azdev-config.json` (PAT is base64-encoded). This file is project-local — add it to `.gitignore`.

### 4. Verify connection

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

Fetches and displays the current sprint backlog. Shows:
- Sprint name and dates
- User stories with description and acceptance criteria
- Tasks grouped under their parent story
- State, assigned user, and other metadata

Supports `--me` flag to filter to your assigned items only.

### `/azdev`

The main pipeline command. It:

1. Fetches your assigned stories from the current sprint
2. Resolves branch links on each story to find the target repository
3. Shows a summary: "You have N stories across M repos"
4. For each story, presents its analysis for your review and verification
5. Updates story descriptions in Azure DevOps with the verified analysis
6. Generates PROJECT.md, ROADMAP.md, and REQUIREMENTS.md in each target repo
7. Writes `.planning/azdev-task-map.json` — maps DevOps work item IDs to repos for status tracking

## Status tracking

The `azdev-task-map.json` file maps Azure DevOps task IDs to local repos. During execution, use `azdev-tools.cjs update-state` to transition tasks:

- **Start work** → set tasks to **Active**
- **Complete work** → set tasks to **Resolved**
- **Check story** → use `get-child-states` to verify all children are done before resolving the story

Status updates use the Azure DevOps REST API and require the `vso.work_write` PAT scope.

## Helper script CLI

The `azdev-tools.cjs` script handles all Azure DevOps API communication. It can be used standalone:

```bash
# Save/load credentials
node azdev-tools.cjs save-config --org <url> --project <name> --pat <token> --cwd <path>
node azdev-tools.cjs load-config --cwd <path>

# Test connection
node azdev-tools.cjs test --cwd <path>

# Sprint data
node azdev-tools.cjs get-sprint --cwd <path>
node azdev-tools.cjs get-sprint-items [--me] --cwd <path>

# Branch links (for repo resolution)
node azdev-tools.cjs get-branch-links --id <workItemId> --cwd <path>

# Work item updates
node azdev-tools.cjs update-state --id <workItemId> --state <state> --cwd <path>
node azdev-tools.cjs update-description --id <workItemId> --description "<text>" --cwd <path>

# Child task state check (for story resolution logic)
node azdev-tools.cjs get-child-states --id <storyId> --cwd <path>
```

All commands output JSON to stdout and use exit code 0/1 for success/failure.

## Project structure

```
claude-azdev-skill/
├── bin/
│   └── azdev-tools.cjs          # Node.js helper — all Azure DevOps API calls
├── commands/
│   ├── azdev-setup.md            # /azdev-setup — credential configuration
│   ├── azdev-test.md             # /azdev-test — connection verification
│   ├── azdev-sprint.md           # /azdev-sprint — sprint backlog display
│   └── azdev.md                  # /azdev — story analysis & project bootstrap pipeline
└── README.md
```

## How it works

### Architecture

- **Skill files** (`.md`) — Claude Code command definitions that orchestrate the workflow through prompts and tool calls
- **Helper script** (`.cjs`) — Pure Node.js (no dependencies) that handles HTTP requests to the Azure DevOps REST API v7.1
- **Config** — Project-local `.planning/azdev-config.json` with base64-encoded PAT

### Data flow

```
Azure DevOps Sprint
        │
        ▼
    /azdev
        │
        ├── Fetch stories (get-sprint-items --me)
        ├── Resolve repos (get-branch-links per story)
        ├── User verifies understanding per story
        ├── Update story descriptions in Azure DevOps
        ├── Generate PROJECT.md + ROADMAP.md + REQUIREMENTS.md per repo
        └── Write azdev-task-map.json
                │
                ▼
        Target Repo
                │
                ├── Implement changes
                ├── update-state: tasks → Active
                ├── update-state: tasks → Resolved
                └── Done
```

## Security

- PAT is stored base64-encoded in `.planning/azdev-config.json` — this is light obfuscation, not encryption
- Always add `azdev-config.json` to `.gitignore` — the setup command checks for this
- The PAT never leaves your local machine except in API calls to your Azure DevOps instance
- No external dependencies — the helper script uses only Node.js built-in modules (`https`, `fs`, `path`, `url`)

## License

MIT
