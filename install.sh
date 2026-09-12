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

# Optional private overlay bootstrap.
#
# Codespaces auto-installs dotfiles by cloning this repo with the codespace's
# built-in token, which is scoped to the workspace repo only -- it cannot read a
# personal private repo. A public repo like this one therefore clones fine, but a
# private overlay does not. So, when a maintainer supplies the two secrets below,
# clone their private overlay here (with a token that *can* read it) and run its
# installer on top of the public base above.
#
# Codespace Secrets (set by the maintainer; unset for everyone else):
#   DOTFILES_TOKEN  fine-grained PAT with Contents:read on the overlay repo
#   DOTFILES_REPO   owner/name of the overlay repo (kept in a secret so this
#                   public script never names a private repo)
#
# Absent either secret this block is a no-op, so the public install above is the
# whole story for anyone else using this repo.
if [ "${CODESPACES:-}" = "true" ] && [ -n "${DOTFILES_TOKEN:-}" ] && [ -n "${DOTFILES_REPO:-}" ]; then
  echo "ℹ️  Private dotfiles overlay requested; bootstrapping…"
  OVERLAY_DIR="$HOME/.dotfiles-internal"
  rm -rf "$OVERLAY_DIR"
  # Force non-interactive git so a bad/expired token fails fast instead of
  # hanging on a credential prompt in the unattended codespace build.
  if GIT_TERMINAL_PROMPT=0 git clone --depth 1 \
      "https://x-access-token:${DOTFILES_TOKEN}@github.com/${DOTFILES_REPO}.git" \
      "$OVERLAY_DIR"; then
    # Scrub the token from .git/config so it is not left on disk in the codespace.
    git -C "$OVERLAY_DIR" remote set-url origin "https://github.com/${DOTFILES_REPO}.git"
    if [ -f "$OVERLAY_DIR/install.sh" ]; then
      bash "$OVERLAY_DIR/install.sh"
    else
      echo "⚠️  overlay repo has no install.sh; skipping overlay install" >&2
    fi
  else
    echo "⚠️  could not clone private overlay repo; continuing with public install only" >&2
  fi
fi
