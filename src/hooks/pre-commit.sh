#!/bin/bash
# AI Agent Monitor - Pre-commit hook
# Runs QA scan on staged files before commit
#
# Install: ai-agents hooks install
# Uninstall: ai-agents hooks uninstall

set -e

# Configuration
STRICT_MODE="${AI_AGENTS_STRICT:-false}"

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "[AI Agent Monitor] Running pre-commit QA scan..."

# Check if ai-agents CLI is available
if ! command -v npx &> /dev/null; then
  echo "[AI Agent Monitor] npx not found, skipping scan"
  exit 0
fi

# Create temp directory with staged files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy staged files to temp directory
for FILE in $STAGED_FILES; do
  if [ -f "$FILE" ]; then
    mkdir -p "$TEMP_DIR/$(dirname "$FILE")"
    git show ":$FILE" > "$TEMP_DIR/$FILE" 2>/dev/null || true
  fi
done

# Run the scan
SCAN_ARGS="$TEMP_DIR"
if [ "$STRICT_MODE" = "true" ]; then
  SCAN_ARGS="$SCAN_ARGS --strict"
fi

SCAN_OUTPUT=$(npx ai-agents scan $SCAN_ARGS 2>&1 || true)
SCAN_EXIT=$?

# Parse results
if echo "$SCAN_OUTPUT" | grep -q "critical"; then
  echo "[AI Agent Monitor] CRITICAL issues found in staged files:"
  echo "$SCAN_OUTPUT" | grep -A2 "critical"
  
  if [ "$STRICT_MODE" = "true" ]; then
    echo ""
    echo "Commit blocked due to critical issues. Fix issues or run:"
    echo "  AI_AGENTS_STRICT=false git commit"
    exit 1
  else
    echo ""
    echo "WARNING: Critical issues found but STRICT mode is off. Proceeding..."
  fi
fi

if echo "$SCAN_OUTPUT" | grep -q "warning"; then
  echo "[AI Agent Monitor] Warnings found in staged files:"
  echo "$SCAN_OUTPUT" | grep -A2 "warning"
fi

if [ $SCAN_EXIT -eq 0 ]; then
  echo "[AI Agent Monitor] Pre-commit scan passed"
fi

exit 0
