#!/bin/bash
# AI Agent Monitor - Post-merge hook
# Syncs AGENT_RULES.md from the central hub after merges
#
# Install: ai-agents hooks install
# Uninstall: ai-agents hooks uninstall

set -e

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

# Fetch guidelines from hub
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$API_URL/api/agents/guidelines/$PROJECT_ID" \
  --max-time 10 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  # Extract rulesMarkdown from JSON response
  RULES=$(echo "$BODY" | grep -o '"rulesMarkdown":"[^"]*"' | sed 's/"rulesMarkdown":"//;s/"$//' | sed 's/\\n/\n/g' | sed 's/\\"/"/g')
  
  if [ -n "$RULES" ]; then
    echo "$RULES" > "$RULES_FILE"
    echo "[AI Agent Monitor] AGENT_RULES.md synced successfully"
    
    # Check if file changed
    if git diff --quiet "$RULES_FILE" 2>/dev/null; then
      echo "[AI Agent Monitor] No changes to AGENT_RULES.md"
    else
      echo "[AI Agent Monitor] AGENT_RULES.md updated - consider committing changes"
    fi
  else
    echo "[AI Agent Monitor] No rules content in response"
  fi
elif [ "$HTTP_CODE" = "404" ]; then
  echo "[AI Agent Monitor] No guidelines found for project (need more failure reports)"
else
  echo "[AI Agent Monitor] Failed to sync rules (HTTP $HTTP_CODE) - continuing"
fi

exit 0
