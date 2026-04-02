# Contributing

Thanks for your interest in contributing to these dotfiles!

## Getting Started

1. Fork the repository and clone your fork locally.
2. Create a new branch from `main` for your changes:
   ```bash
   git checkout -b morabbin/<short-description>
   ```
3. Make your changes, keeping commits small and focused.

## Branch Naming

Use the format `morabbin/<short-description>`, e.g. `morabbin/add-zsh-aliases`.

## Commit Messages

Write commit messages in the imperative mood, e.g.:

- `Add alias for git status`
- `Fix install script path handling`
- `Update copilot instructions`

## Pre-PR Checklist

Before opening a pull request:

- [ ] Scripts are tested locally (`bash install-local.sh`).
- [ ] No secrets or personal credentials are included.
- [ ] Changes are rebased on top of `origin/main`.

## Submitting a Pull Request

1. Push your branch and open a PR against `main`.
2. Give the PR a clear title and a brief description of what changed and why.
3. Assign `Morabbin` as the reviewer.

## Notes

- Keep changes minimal and focused -- one concern per PR.
- Avoid committing machine-specific paths or credentials.
- Shell scripts should use `set -euo pipefail` for safety.
