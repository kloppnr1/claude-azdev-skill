# claude-azdev-skill

Azure DevOps sprint integration for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Connects your sprint backlog to your local repos — analyzes stories, reviews code on linked branches, generates project plans, executes work, and keeps Azure DevOps in sync.

## Quick overview

```
/azdev-setup            →  Connect to Azure DevOps (one-time)
/azdev-sprint           →  See your sprint backlog
/azdev-analyze          →  Analyze stories → resolve branches → review code → generate plans
/azdev-execute          →  Execute one story → feature branch → PR to develop
/azdev-execute-sprint   →  Execute ALL stories autonomously → zero interaction
```

**The typical workflow:**
1. Run `/azdev-analyze` — it finds your stories, checks out linked branches, analyzes the code, and generates project plans per repo
2. Run `/azdev-execute` — it works through the plan, writes code, and updates Azure DevOps as tasks get done

## What it does

### `/azdev-setup`
Configure your Azure DevOps connection (org URL, project name, PAT). Stores credentials locally and verifies the connection works.

### `/azdev-sprint`
Display the current sprint backlog with visual state indicators. Stories are grouped with their child tasks, showing state (⚪ New, 🔵 Active, 🟢 Resolved, ✅ Done), description, acceptance criteria, and assigned team members.

### `/azdev-analyze`
The main analysis pipeline. Fetches your assigned stories and resolves their **branch links** — each story in Azure DevOps can be linked to a Git branch, and this command uses that link to find the corresponding local repo automatically. For each story:

1. **Resolve branch link** — looks up the linked branch and maps it to a local repo (clones if needed)
2. **Analyze code changes** — diffs the branch against main/master, reads changed files, detects tech stack and architecture patterns
3. **Interactive verification** — presents its understanding of each story (summary, work type, code analysis) for your approval
4. **Update story in Azure DevOps** — writes the verified analysis back to the story description (Azure DevOps keeps revision history)
5. **Generate project files** — creates `PROJECT.md`, `ROADMAP.md`, and `REQUIREMENTS.md` in each target repo's `.planning/` directory
6. **Write task map** — saves story-to-task mappings for `/azdev-execute` to use

### `/azdev-execute`
Execute the project plan for a single story. Creates a **feature branch** from develop, sets tasks to **Active**, works through the ROADMAP.md phases, auto-resolves tasks and story when done, pushes the branch, and creates a **PR to develop**. Only asks for input when selecting between multiple stories or hitting implementation blockers.

### `/azdev-execute-sprint`
Fully autonomous mode — executes **all stories** in the task map sequentially without any user interaction. Each story gets its own feature branch and PR. Errors on one story don't block the next. Outputs a full sprint summary with all PR links at the end.

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

## Usage

```
/azdev-setup           # First time: configure credentials
/azdev-sprint          # View current sprint backlog
/azdev-analyze         # Analyze stories and generate project plans
/azdev-execute         # Execute one story → feature branch → PR
/azdev-execute-sprint  # Execute entire sprint autonomously
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
│   ├── azdev-analyze.md         # /azdev-analyze
│   ├── azdev-execute.md         # /azdev-execute
│   └── azdev-execute-sprint.md  # /azdev-execute-sprint
├── LICENSE
└── README.md
```

## Security

- PAT is base64-encoded (not encrypted) in `.planning/azdev-config.json`
- Always add `azdev-config.json` to `.gitignore`
- No external dependencies — only Node.js built-ins (`https`, `fs`, `path`)

## License

MIT
