# AI Agent Monitor - GitHub Integration & ML Reporting Status

**Version:** 1.0  
**Date:** January 2, 2026  
**Status:** AWAITING REVIEW  
**Purpose:** Document all services, APIs, hooks and their integration status for external project reporting

---

## Executive Summary

This document details how the AI Agent Monitor system will be deployed to external GitHub projects and how those projects will report back to the central ML learning hub.

**Current State:** Core infrastructure complete (Phases 1-5). Missing: Client SDKs, webhook handlers, GitHub App, and client-side integration hooks.

---

## Part 1: Service & API Inventory

### 1.1 Server-Side APIs (IMPLEMENTED)

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/agents/external/report` | POST | IMPLEMENTED | Receive external agent failure reports |
| `/api/agents/guidelines/:projectId` | GET | IMPLEMENTED | Retrieve project-specific AGENT_RULES.md |
| `/api/agents/guidelines/generate` | POST | IMPLEMENTED | Force regenerate guidelines |
| `/api/agents/monitor/analytics` | GET | IMPLEMENTED | Get failure analytics (global or per-project) |
| `/api/agents/monitor/analytics/export` | GET | IMPLEMENTED | Export CSV/JSON data |
| `/api/agents/monitor/trends` | GET | IMPLEMENTED | Get failure trends over time |
| `/api/agents/monitor/patterns` | GET | IMPLEMENTED | List detected failure patterns |
| `/api/github/pr/review` | POST | IMPLEMENTED | AI-powered PR review |
| `/api/github/issue/analyze` | POST | IMPLEMENTED | AI-powered issue analysis |
| `/api/agents/invoke` | POST | IMPLEMENTED | Invoke AI agents directly |
| `/api/agents/invoke/stream` | POST | IMPLEMENTED | SSE streaming agent invocation |

### 1.2 CLI Commands (IMPLEMENTED)

| Command | Status | Purpose |
|---------|--------|---------|
| `ai-agents report <projectId>` | IMPLEMENTED | Submit report via CLI |
| `ai-agents generate-rules <projectId>` | IMPLEMENTED | Generate AGENT_RULES.md |
| `ai-agents analytics [projectId]` | IMPLEMENTED | View analytics |
| `ai-agents invoke <agent> <prompt>` | IMPLEMENTED | Invoke AI agent |
| `ai-agents scan <path>` | IMPLEMENTED | Scan for fake data/security issues |

### 1.3 Core Monitor Modules (IMPLEMENTED)

| Module | Location | Status | Purpose |
|--------|----------|--------|---------|
| ReportProcessor | `server/monitor/report-processor.ts` | IMPLEMENTED | Process incoming reports with validation |
| FailureDetector | `server/monitor/failure-detector.ts` | IMPLEMENTED | Pattern matching for 8 failure categories |
| GuidelinesGenerator | `server/monitor/guidelines-generator.ts` | IMPLEMENTED | Generate AGENT_RULES.md markdown |
| AnalyticsService | `server/monitor/analytics.ts` | IMPLEMENTED | Metrics, trends, exports |
| MonitorLearningIntegration | `server/monitor/learning-integration.ts` | IMPLEMENTED | Bridge to ML system |

### 1.4 ML Infrastructure (IMPLEMENTED)

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| OutcomeLearner | `server/agents/learning/outcome-learner.ts` | IMPLEMENTED | Learn from success/failure outcomes |
| MemoryManager | `server/agents/learning/memory-manager.ts` | IMPLEMENTED | RAG-style context retrieval |
| PromptOptimizer | `server/agents/learning/prompt-optimizer.ts` | IMPLEMENTED | A/B test prompt variants |

### 1.5 Database Tables (IMPLEMENTED)

| Table | Status | Purpose |
|-------|--------|---------|
| `agentReports` | IMPLEMENTED | Store external agent reports |
| `projectGuidelines` | IMPLEMENTED | Store generated AGENT_RULES.md |
| `failurePatterns` | IMPLEMENTED | Store detected failure patterns |

---

## Part 2: External Project Integration Points

### 2.1 GitHub Actions Integration (TEMPLATE EXISTS)

**File:** `templates/github-action.yml`  
**Status:** TEMPLATE EXISTS - Needs Enhancement

Current capabilities:
- QA scanning via CLI
- TypeScript checking
- AI agent review on PRs

**Missing for full integration:**
- Post-commit report submission hook
- Automatic failure detection from CI logs
- AGENT_RULES.md sync on guideline updates

### 2.2 Git Hooks (NOT IMPLEMENTED)

| Hook | Status | Purpose |
|------|--------|---------|
| `pre-commit` | NOT IMPLEMENTED | Scan staged files before commit |
| `post-commit` | NOT IMPLEMENTED | Report accepted code to monitor |
| `prepare-commit-msg` | NOT IMPLEMENTED | Inject agent attribution |
| `post-merge` | NOT IMPLEMENTED | Sync AGENT_RULES.md from server |

### 2.3 Client SDK (NOT IMPLEMENTED)

**Status:** NOT IMPLEMENTED - Required for easy integration

A lightweight client SDK is needed for:
- Automatic report submission
- Guidelines sync
- IDE plugin communication

### 2.4 Webhook Receiver (NOT IMPLEMENTED)

**Status:** NOT IMPLEMENTED

For real-time integration with external services:
- GitHub webhook handler for PR/Issue events
- VS Code/Cursor extension callbacks
- CI/CD pipeline callbacks

---

## Part 3: Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL PROJECTS (GitHub Repos)                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ Cursor/Copilot │  │ Replit Agent   │  │ Claude Code    │  │ Other Agents   │    │
│  │ IDE Extensions │  │ Replit Project │  │ VS Code        │  │ Aider, Cody    │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │                   │              │
│          ▼                   ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                     CLIENT SDK / GIT HOOKS / CI ACTIONS                      │   │
│  │                     (NOT IMPLEMENTED - See Plan Below)                       │   │
│  └───────────────────────────────────────────┬─────────────────────────────────┘   │
│                                              │                                      │
└──────────────────────────────────────────────┼──────────────────────────────────────┘
                                               │
                          HTTP POST /api/agents/external/report
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        CENTRAL MONITOR HUB (This Project)                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐                   │
│  │ ReportProcessor │──▶│ FailureDetector │──▶│ GuidelinesGen   │                   │
│  │ (Validates)     │   │ (Categorizes)   │   │ (Creates Rules) │                   │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘                   │
│           │                     │                     │                             │
│           ▼                     ▼                     ▼                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         STORAGE (agentReports, patterns, guidelines)         │   │
│  └───────────────────────────────────┬─────────────────────────────────────────┘   │
│                                      │                                              │
│                                      ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │            ML LEARNING HUB (OutcomeLearner, MemoryManager)                   │   │
│  │            Cross-project insights, pattern generalization                    │   │
│  └───────────────────────────────────┬─────────────────────────────────────────┘   │
│                                      │                                              │
└──────────────────────────────────────┼──────────────────────────────────────────────┘
                                       │
                          GET /api/agents/guidelines/:projectId
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL PROJECTS (Guidelines Sync)                          │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           AGENT_RULES.md                                     │   │
│  │  Auto-generated rules based on failure patterns                              │   │
│  │  Synced via CLI/webhook on updates                                           │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Missing Components - Implementation Plan

### Phase 6: Client SDK & Git Hooks (NEW)

**Priority:** HIGH  
**Effort:** 2-3 days  
**Dependencies:** Phases 1-5 (complete)

#### 6.1 Client SDK (`src/client-sdk.ts`)

```typescript
// Proposed API
export class AgentMonitorClient {
  constructor(config: {
    projectId: string;
    apiUrl?: string;  // defaults to hosted service or localhost:5000
    autoSync?: boolean;
  });

  // Report a code generation event
  async report(event: {
    agent: ExternalAgentType;
    action: string;
    codeGenerated?: string;
    codeAccepted?: boolean;
    humanCorrection?: string;
    errorMessage?: string;
  }): Promise<ReportResult>;

  // Get current guidelines
  async getGuidelines(): Promise<Guidelines>;

  // Sync AGENT_RULES.md to local file
  async syncRules(outputPath?: string): Promise<void>;

  // Get analytics for this project
  async getAnalytics(): Promise<AnalyticsResult>;
}
```

**Implementation Tasks:**
- [ ] Create `src/client-sdk.ts` with HTTP client wrapper
- [ ] Add automatic retry with exponential backoff
- [ ] Support both authenticated and unauthenticated modes
- [ ] Export from `src/index.ts`
- [ ] Add unit tests

#### 6.2 Git Hooks Package (`src/hooks/`)

```typescript
// templates/hooks/post-commit.sh
#!/bin/bash
# AI Agent Monitor - Post-commit hook
# Syncs accepted code changes to monitor

PROJECT_ID="${AI_AGENTS_PROJECT_ID:-$(git remote get-url origin | md5sum | cut -d' ' -f1)}"
API_URL="${AI_AGENTS_API_URL:-https://ai-agents-hub.replit.app}"

# Get last commit info
COMMIT_MSG=$(git log -1 --pretty=%B)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Detect if commit was AI-assisted (look for markers)
if echo "$COMMIT_MSG" | grep -qiE "(copilot|cursor|claude|gpt|ai-generated)"; then
  # Submit report
  curl -s -X POST "$API_URL/api/agents/external/report" \
    -H "Content-Type: application/json" \
    -d "{
      \"projectId\": \"$PROJECT_ID\",
      \"externalAgent\": \"unknown\",
      \"action\": \"commit_accepted\",
      \"codeAccepted\": true,
      \"context\": {
        \"commitHash\": \"$(git rev-parse HEAD)\",
        \"files\": \"$CHANGED_FILES\"
      }
    }"
fi
```

**Implementation Tasks:**
- [ ] Create `src/hooks/post-commit.sh` template
- [ ] Create `src/hooks/pre-commit.sh` template (QA scan)
- [ ] Create `src/hooks/post-merge.sh` template (rules sync)
- [ ] Add CLI command: `ai-agents hooks install`
- [ ] Add CLI command: `ai-agents hooks uninstall`

#### 6.3 Enhanced GitHub Action (`templates/github-action-full.yml`)

```yaml
# Full integration workflow
name: AI Agent Monitor Integration

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  report-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect AI-generated code
        id: detect
        run: |
          # Check commit messages for AI markers
          COMMITS=$(git log --oneline ${{ github.event.before }}..${{ github.sha }})
          if echo "$COMMITS" | grep -qiE "(copilot|cursor|claude|gpt)"; then
            echo "ai_detected=true" >> $GITHUB_OUTPUT
          fi

      - name: Report to Monitor
        if: steps.detect.outputs.ai_detected == 'true'
        env:
          AI_AGENTS_API_URL: ${{ secrets.AI_AGENTS_API_URL }}
          AI_AGENTS_PROJECT_ID: ${{ github.repository }}
        run: |
          npx @ai-coding-agents/cli report ${{ github.repository }} \
            --agent unknown \
            --action push_accepted \
            --accepted

  sync-rules:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Sync AGENT_RULES.md
        env:
          AI_AGENTS_API_URL: ${{ secrets.AI_AGENTS_API_URL }}
        run: |
          npx @ai-coding-agents/cli generate-rules ${{ github.repository }} \
            --output AGENT_RULES.md

      - name: Commit updated rules
        run: |
          git config user.name "AI Agent Monitor"
          git config user.email "monitor@ai-agents.dev"
          git add AGENT_RULES.md
          git diff --staged --quiet || git commit -m "chore: sync AGENT_RULES.md"
          git push
```

**Implementation Tasks:**
- [ ] Create `templates/github-action-full.yml`
- [ ] Add GitHub App manifest for automatic setup
- [ ] Document secrets configuration

### Phase 7: Webhook Handlers (NEW)

**Priority:** MEDIUM  
**Effort:** 1-2 days  
**Dependencies:** Phase 6

#### 7.1 Webhook Endpoints

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/webhooks/github` | GitHub webhook receiver | NOT IMPLEMENTED |
| `POST /api/webhooks/vscode` | VS Code extension callback | NOT IMPLEMENTED |
| `POST /api/webhooks/cursor` | Cursor extension callback | NOT IMPLEMENTED |

**Implementation Tasks:**
- [ ] Add `server/webhooks/github.ts` - Handle PR/Issue events
- [ ] Add `server/webhooks/extensions.ts` - Handle IDE extension events
- [ ] Add webhook signature verification
- [ ] Register routes in `server/routes.ts`

### Phase 8: VS Code/Cursor Extension (NEW)

**Priority:** LOW  
**Effort:** 3-5 days  
**Dependencies:** Phases 6-7

**Scope:** Lightweight extension that:
- Detects AI code generation in IDE
- Reports acceptance/rejection to monitor
- Shows AGENT_RULES.md warnings inline

**Implementation Tasks:**
- [ ] Create extension scaffold
- [ ] Implement code generation detection
- [ ] Add report submission on acceptance
- [ ] Add inline rule display

---

## Part 5: Configuration & Environment

### 5.1 Required Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AI_AGENTS_API_URL` | No | `http://localhost:5000` | Monitor hub URL |
| `AI_AGENTS_PROJECT_ID` | Yes | - | Unique project identifier |
| `OPENAI_API_KEY` | Yes | - | For AI agent invocations |
| `XAI_API_KEY` | No | - | For Grok second opinions |
| `GITHUB_TOKEN` | No | - | For GitHub API access |

### 5.2 Project Configuration File (`.ai-agents.json`)

```json
{
  "projectId": "my-project-unique-id",
  "monitorUrl": "https://ai-agents-hub.replit.app",
  "agents": ["cursor", "copilot", "claude_code"],
  "autoReport": true,
  "autoSyncRules": true,
  "hooks": {
    "postCommit": true,
    "preCommit": true,
    "postMerge": true
  },
  "crossProjectLearning": true
}
```

---

## Part 6: Verification Checklist

### Currently Working (VERIFIED)

- [x] Report submission API (`POST /api/agents/external/report`)
- [x] Auto-detection of 8 failure categories
- [x] Guidelines generation with 3+ pattern threshold
- [x] Analytics with health scores
- [x] Trends and patterns endpoints
- [x] CSV/JSON export
- [x] CLI commands (report, generate-rules, analytics)
- [x] GitHub PR/Issue analysis
- [x] ML learning integration
- [x] 341 tests passing

### Pending Implementation

- [ ] Client SDK for easy integration
- [ ] Git hooks (post-commit, pre-commit, post-merge)
- [ ] Enhanced GitHub Actions workflow
- [ ] Webhook handlers
- [ ] VS Code/Cursor extension
- [ ] Project configuration file support

---

## Part 7: Recommended Implementation Order

1. **Phase 6.1** - Client SDK (enables all other integrations)
2. **Phase 6.3** - Enhanced GitHub Action (most common use case)
3. **Phase 6.2** - Git hooks (local development workflow)
4. **Phase 7** - Webhook handlers (real-time integration)
5. **Phase 8** - IDE extension (advanced integration)

**Estimated Total Effort:** 7-12 days

---

## Appendix A: API Request/Response Examples

### Report Submission

**Request:**
```bash
curl -X POST https://your-hub.replit.app/api/agents/external/report \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "github.com/user/repo",
    "externalAgent": "cursor",
    "action": "code_generation",
    "codeGenerated": "function login() { eval(input); }",
    "codeAccepted": false,
    "humanCorrection": "function login(u, p) { return auth(u, p); }",
    "errorMessage": "Security issue detected"
  }'
```

**Response:**
```json
{
  "success": true,
  "reportId": "uuid-here",
  "detectedFailure": true,
  "failureCategory": "security_gap",
  "failureSeverity": "critical"
}
```

### Guidelines Retrieval

**Request:**
```bash
curl https://your-hub.replit.app/api/agents/guidelines/github.com/user/repo
```

**Response:**
```json
{
  "success": true,
  "guidelines": {
    "projectId": "github.com/user/repo",
    "rulesMarkdown": "# AGENT_RULES.md\n\n...",
    "ruleCount": 3,
    "confidence": 0.75,
    "observationCount": 15
  }
}
```

---

**Document Status:** AWAITING REVIEW  
**Next Action:** Approve implementation phases 6-8 or request modifications
