# Frequently Asked Questions

## General

### What are these dotfiles?

This repository contains personal configuration files and shell utilities, primarily for use with GitHub Codespaces. The main components are:

- **`.copilot/copilot-instructions.md`** -- GitHub Copilot workspace instructions that define branching, commit, and PR conventions.
- **`install.sh`** -- Sets up the Codespaces environment by copying Copilot instructions and appending helper functions to `~/.bashrc`.
- **`install-local.sh`** -- Installs the Copilot instructions locally (outside of Codespaces).

---

## Installation

### How do I install these dotfiles locally?

Run the local install script from the repository root:

```bash
bash install-local.sh
```

This copies the contents of `.copilot/` to `~/.copilot/`.

### How do I install these dotfiles in a GitHub Codespace?

GitHub Codespaces can automatically install dotfiles when a Codespace is created. Configure this in your [Codespaces settings](https://github.com/settings/codespaces) by pointing to this repository under **Dotfiles**. Codespaces will run `install.sh` automatically on creation.

### What does `install.sh` do?

`install.sh` performs two steps:

1. Copies `.copilot/` to `~/.copilot/` so Copilot workspace instructions are available.
2. Appends a block to `~/.bashrc` that, when running inside a Codespace (`$CODESPACES=true`), provides:
   - Auto-generation of `.env.local` for `copilot-agent-runtime` evals (if the required secrets are set).
   - A `vpn()` function to connect to the Tailscale VPN.
   - A `gem-update()` function to vendor a monolith Twirp gem and regenerate code.
   - A reminder to run `/login` if the Copilot CLI prompts for authentication.

### What does `install-local.sh` do?

`install-local.sh` copies `.copilot/` to `~/.copilot/` and prints a confirmation message. It does not modify `~/.bashrc` or add any shell functions.

---

## Codespaces-specific Setup

### What Codespace Secrets do I need?

For the `copilot-agent-runtime` evals `.env.local` to be auto-generated, set the following Codespace Secrets in your [account settings](https://github.com/settings/codespaces):

| Secret name | Description |
|---|---|
| `EVALS_CAPI_HMAC_KEY` | HMAC key for Copilot API evals |
| `EVALS_CAPI_DEV_KEY` | Dev API key for Copilot API evals |
| `COPILOT_INTEGRATION_ID` | Your Copilot integration ID |

All three must be present for `.env.local` to be written. If any are missing, the file is silently skipped.

### How do I connect to the VPN inside a Codespace?

After the dotfiles are installed and a new shell is started, run:

```bash
vpn
```

This runs `tailscale up` with the Codespace hostname and `--accept-routes`. You will need Tailscale credentials configured separately.

### How do I update the monolith Twirp gem inside a Codespace?

Run:

```bash
gem-update <version>
```

Replace `<version>` with the sweagentd proto version number. This bundles the gem from Octofactory, runs database migrations, and regenerates Tapioca DSL types. It requires the `OCTOFACTORY_TOKEN` and `GH_USERNAME` environment variables to be set (as Codespace Secrets or in your environment).

### Why do I see "Remember: run '/login' if Copilot CLI prompts for auth"?

This message is printed each time a Codespace shell starts as a reminder that the Copilot CLI may require a one-time authentication step. If prompted, run `/login` and follow the instructions.

---

## Copilot Instructions

### What is `.copilot/copilot-instructions.md`?

This file contains workspace-level instructions for GitHub Copilot. It defines conventions such as:

- Never pushing to `main` without explicit confirmation.
- Always pulling the latest changes before starting work.
- Branch naming format (`morabbin/<short-description>`).
- Commit message style (imperative mood).
- Pre-commit checks (typechecking, formatting, linting, tests).
- PR creation steps and required PR assignee (`Morabbin`).

Once installed to `~/.copilot/`, these instructions are picked up by Copilot in supported editors.

### How do I update the Copilot instructions?

Edit `.copilot/copilot-instructions.md` in this repository and re-run the install script to copy the updated file to `~/.copilot/`.

---

## Troubleshooting

### The `.env.local` file was not created automatically in my Codespace.

Check that all three required secrets (`EVALS_CAPI_HMAC_KEY`, `EVALS_CAPI_DEV_KEY`, `COPILOT_INTEGRATION_ID`) are set as Codespace Secrets and that the `/workspaces/copilot-agent-runtime` directory exists. Both conditions must be true for the file to be written.

### The `vpn` or `gem-update` commands are not found in my Codespace.

These functions are added to `~/.bashrc` only when `$CODESPACES=true` and the `/workspaces/github` directory exists. Start a new terminal session after the Codespace is created. If the functions are still missing, confirm that `install.sh` ran successfully during Codespace creation.

### I ran `install-local.sh` but Copilot isn't picking up my instructions.

Ensure your editor supports reading workspace instructions from `~/.copilot/copilot-instructions.md`. Restart the editor or reload the Copilot extension after installation.
