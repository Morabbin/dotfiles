#!/bin/bash

mkdir -p $HOME/.copilot
cp -r "$(dirname "$0")/.copilot/"* $HOME/.copilot/

cat >> ~/.bashrc << 'EOF'

if [ "$CODESPACES" = "true" ]; then
  # gh CLI: force use of hosts.yml / GH_TOKEN instead of codespace GITHUB_TOKEN
  gh() {
    GITHUB_TOKEN= command gh "$@"
  }

  # Write .env.local, to permit running copilot-agent-runtime evals tests
  # Do so only if the relevants secrets have been injected as Codespace Secrets
  if [[ -n "$EVALS_CAPI_HMAC_KEY" && -n "$EVALS_CAPI_DEV_KEY" && -n "$COPILOT_INTEGRATION_ID" ]]; then
    # Target the workspace root; codespaces clone repos to /workspaces/<repo-name>
    ENV_FILE="/workspaces/copilot-agent-runtime/.env.local"
    if [[ -d "/workspaces/copilot-agent-runtime" ]]; then
      cat > "$ENV_FILE" <<ENV
CAPI_HMAC_KEY=${EVALS_CAPI_HMAC_KEY}
CAPI_DEV_KEY=${EVALS_CAPI_DEV_KEY}
CAPI_PROD_KEY=${EVALS_CAPI_DEV_KEY}
GITHUB_COPILOT_INTEGRATION_ID=${COPILOT_INTEGRATION_ID}
GITHUB_COPILOT_API_TOKEN=${GH_TOKEN}
GITHUB_MCP_ACCESS_TOKEN=
AUTOFIND_DOWNLOAD_GITHUB_TOKEN=
ENV
      echo "✅ .env.local written for copilot-agent-runtime"
    fi
  fi

  # For github/github Gem update when the dotcom <-> sweagentd protobuf spec has been bumped
  if [[ -d "/workspaces/github" ]]; then
    
    # Connect to VPN
    vpn() {
      echo "Connecting to VPN"
      sudo tailscale up --hostname $CODESPACE_NAME --accept-routes --report-posture
    }

    # Download Gem, and generate code
    gem-update() {
      if [[ -n "$1" ]]; then
        cd "/workspaces/github" && \
          bin/bundle config set https://octofactory.githubapp.com/artifactory/api/gems/monolith-twirp-gems-releases-local "$GH_USERNAME:$OCTOFACTORY_TOKEN" && \
          script/vendor-monolith-twirp-gem sweagentd sweagentd "$1" && \
          bin/rails db:migrate db:test:soft_reset; bin/tapioca dsl
      else
        echo "gem-update: supply sweagentd proto version number"
      fi
    }
  fi
  
  # One-time Copilot CLI login reminder
  echo "💡 Remember: run '/login' if Copilot CLI prompts for auth"
fi
EOF
