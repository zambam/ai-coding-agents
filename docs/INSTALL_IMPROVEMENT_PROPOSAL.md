# Client Installation Improvement Proposal

**Goal**: Reduce client setup time from 30-45 minutes to 5 minutes with clear, automated tooling.

---

## Current Issues Found

### 1. Documentation Fragmentation

| Document | Problem |
|----------|---------|
| README.md | Lists many features but no "start here" flow |
| PUBLISHING_PROPOSAL.md | Offers Option A/B choice before user can try anything |
| INTEGRATION_GUIDE.md | Manual endpoint/schema setup despite router factory existing |
| Client Feedback | Reports 30-45 min manual integration |

**Result**: Users bounce between docs, unclear which path to follow.

### 2. Init Command Under-Documented

Current `npx ai-agents init` documentation:
- Only shows `--framework express --orm drizzle --hub-url` options
- No explanation of generated files
- No guidance for non-Express or non-Drizzle projects
- No post-init verification steps

### 3. Missing Verification Command

No single "did it work?" test documented. Users must guess which command confirms success.

### 4. Templates Not Linked

- `templates/` directory exists but not referenced in docs
- `scripts/ai-agents.sh` generated but not explained
- Schema snippets exist but no copy-paste ready blocks

### 5. Integration Guide Contradicts v1.2.0

Guide still instructs manual endpoint creation despite:
- `createAgentRouter()` available
- `agentReportsTable` exported
- `IAgentStorage` interface exported

---

## Proposed Solutions

### Solution 1: Create QUICKSTART.md (5-Minute Guide)

```markdown
# 5-Minute Quickstart

## Prerequisites
- Node.js 18+
- Express project with Drizzle ORM
- Hub URL (your deployed ai-coding-agents service)

## Step 1: Install (30 seconds)
npm install github:zambam/ai-coding-agents

## Step 2: Initialize (30 seconds)
npx ai-agents init \
  --framework express \
  --orm drizzle \
  --hub-url https://your-hub.replit.app

## Step 3: Add Schema (1 minute)
// shared/schema.ts
import { agentReportsTable, agentLogsTable } from 'ai-coding-agents/drizzle';
export { agentReportsTable, agentLogsTable };

## Step 4: Add Routes (1 minute)
// server/routes.ts
import { createAgentRouter } from 'ai-coding-agents/express';
app.use('/api/agents', createAgentRouter(storage));

## Step 5: Implement Storage (2 minutes)
// Copy from templates/storage-adapter.ts
// Implement 3 required methods

## Step 6: Verify (30 seconds)
npx ai-agents verify

## Done!
```

### Solution 2: Enhance Init Command

Add these capabilities to `npx ai-agents init`:

```bash
# Current
npx ai-agents init --framework express --orm drizzle

# Proposed additions
npx ai-agents init \
  --framework express \
  --orm drizzle \
  --hub-url https://hub.example.com \
  --generate-storage      # Generate storage adapter template
  --generate-routes       # Generate routes file
  --run-migrations        # Run Drizzle migrations
  --verify                # Run verification after setup
```

**Generated files:**
| File | Purpose |
|------|---------|
| `.ai-agents.json` | Project configuration |
| `scripts/ai-agents.sh` | CLI wrapper with env vars |
| `templates/storage-adapter.ts` | Storage implementation template |
| `templates/agent-routes.ts` | Route registration template |
| `AGENT_RULES.md` | Initial rules file (synced from hub) |

### Solution 3: Add Verify Command

```bash
npx ai-agents verify
```

**Checks performed:**
1. `.ai-agents.json` exists and valid
2. Hub URL reachable (`GET /api/agents/health`)
3. Required env vars set (`AI_AGENTS_API_URL`)
4. Reports endpoint responds (`POST /api/agents/external/report` with test)
5. Analytics endpoint responds (`GET /api/agents/monitor/analytics`)

**Output:**
```
AI Agents Setup Verification
============================
[PASS] .ai-agents.json found
[PASS] Hub URL reachable: https://your-hub.replit.app
[PASS] Environment configured
[PASS] Report endpoint working
[PASS] Analytics endpoint working

All checks passed! Your project is ready.
```

### Solution 4: Create Templates Directory

```
npm-package/
  templates/
    storage-adapter.ts      # IAgentStorage implementation
    agent-routes.ts         # Express route registration
    drizzle-migration.ts    # Schema migration script
    .ai-agents.json         # Config file template
    ai-agents.sh            # CLI wrapper script
    github-action.yml       # CI workflow
    pre-commit.sh           # Git hook
```

### Solution 5: Update Documentation

**README.md changes:**
- Add "5-Minute Quickstart" section at top
- Link to QUICKSTART.md for detailed steps
- Remove redundant manual setup instructions

**INTEGRATION_GUIDE.md changes:**
- Remove manual endpoint creation sections
- Reference router factory and schema exports
- Add "Verify Installation" section

**PUBLISHING_PROPOSAL.md changes:**
- Mark as "internal documentation" 
- Reference QUICKSTART.md for client setup

---

## Implementation Checklist

### Phase 1: Documentation (Priority 1)
- [ ] Create `docs/QUICKSTART.md` with step-by-step guide
- [ ] Add "Quick Start" section to README.md linking to QUICKSTART.md
- [ ] Update INTEGRATION_GUIDE.md to remove manual steps
- [ ] Add init command option reference to README

### Phase 2: Templates (Priority 1)
- [ ] Create `npm-package/templates/` directory
- [ ] Add `storage-adapter.ts` template
- [ ] Add `agent-routes.ts` template  
- [ ] Add `.ai-agents.json` template
- [ ] Add `ai-agents.sh` template

### Phase 3: CLI Enhancements (Priority 2)
- [ ] Add `npx ai-agents verify` command
- [ ] Add `--generate-storage` flag to init
- [ ] Add `--generate-routes` flag to init
- [ ] Add `--verify` flag to init (runs verify after)

### Phase 4: Init Command Output (Priority 2)
- [ ] Print clear next steps after init
- [ ] Print generated file locations
- [ ] Print verification command to run

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Setup time | 30-45 min | 5 min |
| Files to manually create | 5+ | 0-1 |
| Commands to run | 10+ | 3 |
| Documentation pages to read | 3+ | 1 |
| Verification method | None | `npx ai-agents verify` |

---

## Mechanic Review: Issues Found

### Critical Issues

| Issue | Problem | Resolution |
|-------|---------|------------|
| **Verify command doesn't exist** | Proposal references `npx ai-agents verify` but it's not implemented | Must implement before documenting, or remove from quickstart |
| **Init flags don't exist** | `--generate-storage`, `--generate-routes`, `--run-migrations` not implemented | Defer to Phase 2 or implement first |
| **Verify makes live calls** | Would POST to hub, fail on auth-protected or offline hubs | Need stub mode or warn about prerequisites |
| **Template directory conflict** | `npm-package/templates` may already exist, risking duplicates | Audit existing templates first |
| **Import path mismatch** | Quickstart uses `'ai-coding-agents'` but init references `'ai-coding-agents/drizzle'` | Standardize import paths |

### Edge Cases Not Covered

| Scenario | Gap |
|----------|-----|
| Non-Express frameworks (Fastify, Hono, Koa) | No guidance provided |
| Non-Drizzle ORMs (Prisma, TypeORM, raw SQL) | No schema generation |
| Read-only environments | Init may fail to write files |
| Auth-protected hubs | Verify command would fail |
| Offline/local development | Hub URL required but may not exist |

### Recommendations

1. **Phase 1 (Do Now)**: Only document what currently exists
   - Quickstart should reference current `init` capabilities
   - Clearly state manual storage implementation is required
   - Remove verify command until implemented

2. **Phase 2 (Implement First)**: Build before documenting
   - Implement verify command with stub/offline mode
   - Add template generation flags
   - Test on non-Express/Drizzle projects

3. **Phase 3 (Polish)**: After implementation proven
   - Update quickstart with new capabilities
   - Add framework-specific guides

---

## Revised Implementation Plan

### Phase 1: Documentation Only (What Exists Today)
- [ ] Create QUICKSTART.md using only current capabilities
- [ ] Document manual storage implementation step (required)
- [ ] Add copy-paste code blocks for schema and routes
- [ ] Update README with quickstart link
- [ ] Remove/update contradicting sections in INTEGRATION_GUIDE.md

### Phase 2: Implement Before Documenting
- [ ] Implement `npx ai-agents verify` with offline mode
- [ ] Add `--generate-storage` flag (writes template file)
- [ ] Test on Fastify/Prisma projects
- [ ] Update quickstart after implementation

---

## Approval

### Immediate (Phase 1 - Documentation)
- [ ] Create QUICKSTART.md (current capabilities only)
- [ ] Update existing docs to reference quickstart
- [ ] Add copy-paste code blocks

### Deferred (Phase 2 - Implementation Required)
- [ ] Implement verify command
- [ ] Add template generation flags
- [ ] Framework-specific guides
