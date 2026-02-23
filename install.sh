#!/bin/bash
mkdir -p $HOME/.copilot
cp -r "$(dirname "$0")/.copilot/"* $HOME/.copilot/

# Symlink ~/.copilot into the workspace so Copilot CLI can read it
if [ "$CODESPACES" = "true" ] && [ -d "$HOME/.copilot" ]; then
  ln -sf "$HOME/.copilot" "/workspaces/.copilot"
fi
