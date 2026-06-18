# dotfiles

Personal [GitHub Copilot CLI](https://github.com/github/copilot-cli) configuration: global instructions and a set of reusable skills.

Running `install.sh` copies everything under [`.copilot/`](.copilot) into `~/.copilot/`:

- [`.copilot/copilot-instructions.md`](.copilot/copilot-instructions.md) -- always-on global rules for Copilot CLI.
- [`.copilot/skills/`](.copilot/skills) -- task-specific skills Copilot can invoke on demand.

## Install

```bash
./install.sh
```

This is idempotent -- it overwrites the matching files under `~/.copilot/`.

## Use as Codespaces dotfiles

Set this repository as your [dotfiles repository for Codespaces](https://docs.github.com/en/codespaces/setting-your-user-preferences/personalizing-github-codespaces-for-your-account#dotfiles). Codespaces runs `install.sh` automatically when a codespace is created, so your Copilot CLI instructions and skills are available in every codespace.

## Skills

| Skill | Purpose |
| --- | --- |
| `create-issue` | Create a new issue. |
| `create-pr` | Create a new pull request. |
| `gh-api-markdown` | Post markdown bodies through `gh` / the GitHub API intact. |
| `manage-prs` | Refresh, sync, or coordinate one or more PRs. |
| `review-pr` | Review a pull request, including an over-engineering pass. |
| `address-pr-review` | Act on review feedback on a PR. |
| `validate-changes` | Lint, format, test, and sync before committing or opening a PR. |
