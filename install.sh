#!/bin/bash

mkdir -p $HOME/.copilot
cp -r "$(dirname "$0")/.copilot/"* $HOME/.copilot/

cat >> ~/.bashrc << 'EOF'

if [ "$CODESPACES" = "true" ]; then
  # gh CLI: force use of hosts.yml / GH_TOKEN instead of codespace GITHUB_TOKEN
  gh() {
    GITHUB_TOKEN= command gh "$@"
  }

  # Symlink ~/.copilot into workspace for Copilot CLI path access
  if [ -d "$HOME/.copilot" ] && [ ! -L "/workspaces/.copilot" ]; then
    ln -sf "$HOME/.copilot" "/workspaces/.copilot"
  fi

  # One-time Copilot CLI login reminder
  echo "💡 Remember: run '/login' if Copilot CLI prompts for auth"
fi
EOF
