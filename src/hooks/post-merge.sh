#!/bin/bash
# AI Agent Monitor - Post-merge hook
# Syncs AGENT_RULES.md from the central hub after merges
#
# Install: ai-agents hooks install
# Uninstall: ai-agents hooks uninstall

# Configuration
PROJECT_ID="${AI_AGENTS_PROJECT_ID:-}"
API_URL="${AI_AGENTS_API_URL:-http://localhost:5000}"
AUTO_SYNC="${AI_AGENTS_AUTO_SYNC:-true}"
RULES_FILE="${AI_AGENTS_RULES_FILE:-AGENT_RULES.md}"

# Skip if auto-sync is disabled
if [ "$AUTO_SYNC" != "true" ]; then
  exit 0
fi

# Auto-detect project ID from git remote if not set
if [ -z "$PROJECT_ID" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE_URL" ]; then
    PROJECT_ID=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]//' | sed 's/\.git$//')
  else
    PROJECT_ID=$(basename "$(pwd)")
  fi
fi

echo "[AI Agent Monitor] Syncing AGENT_RULES.md from hub..."

# Use npx to sync rules (handles JSON parsing properly)
if command -v npx &>/dev/null; then
  npx ai-agents generate-rules "$PROJECT_ID" --output "$RULES_FILE" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "[AI Agent Monitor] AGENT_RULES.md synced successfully"
  else
    echo "[AI Agent Monitor] Sync failed or no guidelines available"
  fi
else
  echo "[AI Agent Monitor] npx not found, skipping sync"
fi

exit 0
