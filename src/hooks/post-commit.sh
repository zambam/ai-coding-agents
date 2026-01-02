#!/bin/bash
# AI Agent Monitor - Post-commit hook
# Reports accepted AI-generated code changes to the central hub
#
# Install: ai-agents hooks install
# Uninstall: ai-agents hooks uninstall

set -e

# Configuration (from environment or defaults)
PROJECT_ID="${AI_AGENTS_PROJECT_ID:-}"
API_URL="${AI_AGENTS_API_URL:-http://localhost:5000}"

# Auto-detect project ID from git remote if not set
if [ -z "$PROJECT_ID" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE_URL" ]; then
    PROJECT_ID=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]//' | sed 's/\.git$//')
  else
    PROJECT_ID=$(basename "$(pwd)")
  fi
fi

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ',' | sed 's/,$//')
AUTHOR=$(git log -1 --pretty=%an)

# Detect AI agent markers in commit message
DETECTED_AGENT="unknown"
if echo "$COMMIT_MSG" | grep -qiE "copilot|github copilot"; then
  DETECTED_AGENT="copilot"
elif echo "$COMMIT_MSG" | grep -qiE "cursor"; then
  DETECTED_AGENT="cursor"
elif echo "$COMMIT_MSG" | grep -qiE "claude|anthropic"; then
  DETECTED_AGENT="claude_code"
elif echo "$COMMIT_MSG" | grep -qiE "replit|agent"; then
  DETECTED_AGENT="replit_agent"
elif echo "$COMMIT_MSG" | grep -qiE "windsurf"; then
  DETECTED_AGENT="windsurf"
elif echo "$COMMIT_MSG" | grep -qiE "aider"; then
  DETECTED_AGENT="aider"
elif echo "$COMMIT_MSG" | grep -qiE "continue"; then
  DETECTED_AGENT="continue"
elif echo "$COMMIT_MSG" | grep -qiE "cody|sourcegraph"; then
  DETECTED_AGENT="cody"
elif echo "$COMMIT_MSG" | grep -qiE "gpt|openai|ai-generated|ai generated"; then
  DETECTED_AGENT="unknown"
else
  # No AI marker detected, skip reporting
  exit 0
fi

# Report to the hub
echo "[AI Agent Monitor] Detected $DETECTED_AGENT code in commit $COMMIT_HASH"

PAYLOAD=$(cat <<EOF
{
  "projectId": "$PROJECT_ID",
  "externalAgent": "$DETECTED_AGENT",
  "action": "commit_accepted",
  "codeAccepted": true,
  "context": {
    "commitHash": "$COMMIT_HASH",
    "commitMessage": "$COMMIT_MSG",
    "changedFiles": "$CHANGED_FILES",
    "author": "$AUTHOR",
    "source": "post-commit-hook"
  }
}
EOF
)

# Send report (fail silently to not block commits)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/agents/external/report" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --max-time 5 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "[AI Agent Monitor] Report submitted successfully"
else
  echo "[AI Agent Monitor] Report submission failed (HTTP $HTTP_CODE) - continuing"
fi

exit 0
