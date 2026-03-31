# dotfiles

Personal dotfiles for shell configuration and developer tooling.

## Contents

### Copilot instructions

The `.copilot/` directory contains custom instructions for GitHub Copilot that
are installed into `~/.copilot/` by the install scripts.

### Install scripts

| Script | Purpose |
|--------|---------|
| `install.sh` | Full install — copies Copilot instructions and appends Codespaces-specific shell helpers to `~/.bashrc`. |
| `install-local.sh` | Lightweight local install — copies Copilot instructions only. |

### itunes-dedup

A Rust CLI tool that scans an iTunes / Apple Music library directory for
duplicate audio files. See [`src/README.md`](src/README.md) for detailed usage,
supported formats, and build instructions.

## Quick start

```bash
# Clone and install (Codespaces)
git clone https://github.com/Morabbin/dotfiles.git
cd dotfiles
bash install.sh

# Or install locally (Copilot instructions only)
bash install-local.sh
```

## License

This repository is provided as-is for personal use.
