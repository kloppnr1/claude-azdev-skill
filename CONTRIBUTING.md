# Contributing to claude-devsprint-plugin

Thanks for your interest in contributing!

## How it works

This plugin is a set of Claude Code slash commands (`.md` files in `commands/`) backed by a single Node.js helper script (`bin/devsprint-tools.cjs`). The commands define the workflow — what to do, in what order, what to show the user. The helper script handles all Azure DevOps API communication.

## Getting started

1. Fork and clone the repo
2. Run `./install.sh` to install commands and helper to `~/.claude/`
3. Run `/devsprint-setup` in Claude Code to connect to your Azure DevOps org
4. Make changes, re-run `./install.sh`, restart Claude Code to test

## What to work on

- **Bug reports** — open an issue describing what happened vs. what you expected
- **Command improvements** — better prompts, smarter defaults, fewer unnecessary interactions
- **New Azure DevOps integrations** — anything the REST API supports that would be useful
- **Helper script** — new CLI subcommands for Azure DevOps operations

## Guidelines

- **No external dependencies.** The helper script uses only Node.js built-in modules. Keep it that way.
- **Commands are markdown.** They instruct Claude Code what to do — think of them as detailed prompts, not code. Test changes by running the actual slash commands.
- **Keep it autonomous.** Only prompt the user when a wrong choice would waste significant work or be hard to undo. Show what's happening, but don't block on approval.
- **Azure DevOps only.** This plugin targets Azure DevOps. GitHub/GitLab/Jira support would be separate projects.

## Pull requests

1. Keep PRs focused — one feature or fix per PR
2. Test your changes by running the affected `/devsprint-*` commands
3. Describe what you changed and why in the PR description

## Questions?

Open an issue — happy to help.
