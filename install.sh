#!/bin/bash
set -euo pipefail

# Install GitHub Copilot CLI instructions and skills into ~/.copilot.
#
# This runs automatically when used as a Codespaces dotfiles repository, and can
# also be run manually on any machine:
#
#   ./install.sh

SRC="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.copilot"
cp -r "$SRC/.copilot/." "$HOME/.copilot/"

echo "✅ Copilot instructions and skills installed to ~/.copilot/"
