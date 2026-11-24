#!/usr/bin/env bash
# Squeaky step 7b: copy every secret file into OneDrive\keys-for-claude, which OneDrive
# syncs to the cloud. Secrets live in NO repo, so this folder is their off-machine copy
# (Briggsy's call 2026-11-24; Google Drive for desktop was uninstalled 11-23 because it
# fought OneDrive, and the Chrome extension refuses to upload secret files).
#
# A secret is: every git-ignored .env* file, and everything ignored under .secrets/ and
# utils/, in both repos; plus ~/.claude.json (its mcpServers block holds context7's key).
# A new project's .env is picked up at the first close after it exists.
#
# Never deletes anything from the backup.
# Exit 0: copied, OneDrive running.  Exit 1: a copy failed or a repo is missing.
# Exit 2: copied, but OneDrive isn't running, so nothing reaches the cloud until it starts.
# Exits 1 and 2 go in the close report; never skip them silently.
set -uo pipefail

DEST="$HOME/OneDrive/keys-for-claude"
[ -d "$HOME/OneDrive" ] || { echo "SECRETS BACKUP FAILED: no OneDrive folder at $HOME/OneDrive"; exit 1; }

copied=0; same=0; missing=""

copy_one() { # $1 = source file, $2 = its path under DEST
  local dst="$DEST/$2"
  if [ -f "$dst" ] && cmp -s "$1" "$dst"; then same=$((same + 1)); return; fi
  if mkdir -p "$(dirname "$dst")" && cp -p "$1" "$dst"; then
    copied=$((copied + 1)); echo "  copied: $2"
  else
    echo "SECRETS BACKUP FAILED copying $2"; exit 1
  fi
}

for repo in ai-learning-journey ai-learning-journey-private; do
  root="$HOME/$repo"
  [ -d "$root/.git" ] || { missing="$missing $repo"; continue; }
  while IFS= read -r -d '' f; do
    case "$f" in */node_modules/*) continue ;; esac
    copy_one "$root/$f" "$repo/$f"
  done < <(git -C "$root" ls-files -z --others --ignored --exclude-standard -- \
             ':(glob)**/.env*' ':(glob).secrets/**' ':(glob)utils/**')
done
copy_one "$HOME/.claude.json" "home/.claude.json"

echo "Secrets backup: $copied copied, $same unchanged, in $DEST"
if [ -n "$missing" ]; then echo "SECRETS BACKUP: repo not found, skipped:$missing"; exit 1; fi
if ! tasklist //FI "IMAGENAME eq OneDrive.exe" //NH 2>/dev/null | grep -qi 'OneDrive.exe'; then
  echo "SECRETS BACKUP: OneDrive isn't running, so the copy won't reach the cloud until it starts"; exit 2
fi
