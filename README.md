# claude-azdev-skill

Azure DevOps sprint integration for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). View your sprint backlog, analyze user stories, generate project plans, and update work item status — all from the terminal.

## What it does

1. **`/azdev-setup`** — Configure Azure DevOps credentials (org, project, PAT)
2. **`/azdev-test`** — Verify your connection works
3. **`/azdev-sprint`** — Display the current sprint backlog with stories, tasks, and metadata
4. **`/azdev-analyze`** — The main pipeline:
   - Fetch your assigned stories
   - Resolve linked branches to local repos
   - Verify your understanding of each story interactively
   - Generate PROJECT.md + ROADMAP.md + REQUIREMENTS.md per repo
   - Update story descriptions in Azure DevOps
   - Write task maps for status tracking

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+ (no npm dependencies — uses built-in modules only)
- Azure DevOps PAT with scopes: `vso.project`, `vso.work`, `vso.work_write`, `vso.code`

## Installation

```bash
# Clone the repo
git clone https://github.com/kloppnr1/claude-azdev-skill.git

# Copy commands to Claude Code
cp claude-azdev-skill/commands/azdev-*.md ~/.claude/commands/

# Copy helper script
mkdir -p ~/.claude/azdev-skill/bin
cp claude-azdev-skill/bin/azdev-tools.cjs ~/.claude/azdev-skill/bin/
```

Restart Claude Code. The `/azdev-*` commands are now available.

## Setup

In any project directory:

```
/azdev-setup
```

Credentials are stored in `.planning/azdev-config.json` (base64-encoded PAT). Add this to your `.gitignore`.

## Usage

```
/azdev-sprint          # View current sprint backlog
/azdev-analyze         # Analyze stories and generate project plans
```

## How it works

- **Command files** (`.md`) in `commands/` define Claude Code slash commands that orchestrate the workflow
- **Helper script** (`bin/azdev-tools.cjs`) handles all Azure DevOps REST API v7.1 calls — pure Node.js, zero dependencies
- **Config** is project-local at `.planning/azdev-config.json`

```
claude-azdev-skill/
├── bin/
│   └── azdev-tools.cjs       # Azure DevOps API helper
├── commands/
│   ├── azdev-setup.md         # /azdev-setup
│   ├── azdev-test.md          # /azdev-test
│   ├── azdev-sprint.md        # /azdev-sprint
│   └── azdev-analyze.md       # /azdev-analyze
├── LICENSE
└── README.md
```

## Helper script CLI

The helper can be used standalone:

```bash
node azdev-tools.cjs save-config --org <url> --project <name> --pat <token> --cwd <path>
node azdev-tools.cjs load-config --cwd <path>
node azdev-tools.cjs test --cwd <path>
node azdev-tools.cjs get-sprint --cwd <path>
node azdev-tools.cjs get-sprint-items [--me] --cwd <path>
node azdev-tools.cjs get-branch-links --id <workItemId> --cwd <path>
node azdev-tools.cjs update-state --id <workItemId> --state <state> --cwd <path>
node azdev-tools.cjs update-description --id <workItemId> --description "<text>" --cwd <path>
node azdev-tools.cjs get-child-states --id <storyId> --cwd <path>
```

All commands output JSON to stdout. Exit 0 = success, exit 1 = error.

## Security

- PAT is base64-encoded (not encrypted) in `.planning/azdev-config.json`
- Always add `azdev-config.json` to `.gitignore`
- No external dependencies — only Node.js built-ins (`https`, `fs`, `path`)

## License

MIT
