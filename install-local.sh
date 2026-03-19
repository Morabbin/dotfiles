#!/bin/bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.copilot"
cp -r "$DOTFILES_DIR/.copilot/"* "$HOME/.copilot/"

echo "✅ Copilot instructions installed to ~/.copilot/"
