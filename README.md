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

### Optional private overlay

Codespaces auto-installs dotfiles using the codespace's built-in token, which is scoped to the workspace repo and can't read a personal private repo -- so a private dotfiles repo fails to auto-clone, but this public one clones fine. To layer a private overlay on top of this public base, set two Codespace Secrets and `install.sh` will clone the overlay (with a token that can read it) and run its installer after the public install:

- `DOTFILES_TOKEN` -- a fine-grained PAT with **Contents: read** on the overlay repo.
- `DOTFILES_REPO` -- the overlay repo as `owner/name`.

With either secret unset, this step is skipped and the public install is all that runs.

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
