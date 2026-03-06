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

  # Write .env.local, to permit running copilot-agent-runtime evals tests
  # Only if the Copilot secrets are available (they're injected as Codespace Secrets)
  if [[ -n "$COPILOT_API_TOKEN" && -n "$COPILOT_INTEGRATION_ID" ]]; then
    # Target the workspace root; codespaces clone repos to /workspaces/<repo-name>
    ENV_FILE="/workspaces/copilot-agent-runtime/.env.local"
    if [[ -d "/workspaces/copilot-agent-runtime" ]]; then
      cat > "$ENV_FILE" <<ENV
CAPI_PROD_KEY=${CAPI_DEV_KEY}
GITHUB_COPILOT_INTEGRATION_ID=${COPILOT_INTEGRATION_ID}
ENV
      echo "✅ .env.local written for copilot-agent-runtime"
    fi
  fi

  # One-time Copilot CLI login reminder
  echo "💡 Remember: run '/login' if Copilot CLI prompts for auth"
fi
EOF
