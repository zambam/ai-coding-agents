# Phase 1: Easy Fixes Proposal

**Workflow**: Quick Implement (Code Ninja + Mechanic)  
**Scope**: Documentation and copy-paste templates only - no new CLI features  
**Estimated Time**: 45-60 minutes total

---

## Objective

Create a streamlined setup experience using **only existing capabilities**. No new CLI commands, no new flags - just better documentation and ready-to-use templates.

---

## Deliverables

### 1. QUICKSTART.md (New File)

Single-page setup guide with copy-paste blocks:

```markdown
# 5-Minute Quickstart

## Prerequisites
- Node.js 18+
- Express + Drizzle project
- Hub URL (your deployed ai-coding-agents)

## Step 1: Install
npm install github:zambam/ai-coding-agents

## Step 2: Configure
npx ai-agents init --hub-url https://your-hub.replit.app

## Step 3: Add Schema
[COPY-PASTE BLOCK]

## Step 4: Add Routes  
[COPY-PASTE BLOCK]

## Step 5: Implement Storage
[COPY-PASTE BLOCK - 3 methods]

## Step 6: Test
curl http://localhost:5000/api/agents/health
```

**Effort**: 20 min

---

### 2. Templates Directory

Create `npm-package/templates/` with ready-to-copy files:

| File | Purpose | Lines |
|------|---------|-------|
| `storage-adapter.ts` | IAgentStorage implementation template | ~80 |
| `schema-additions.ts` | Drizzle table exports | ~15 |
| `route-setup.ts` | Express router mounting | ~10 |

**Effort**: 15 min

---

### 3. README.md Updates

Add "Quick Start" section at top linking to QUICKSTART.md:

```markdown
## Quick Start

See [QUICKSTART.md](docs/QUICKSTART.md) for 5-minute setup.

### TL;DR
npm install github:zambam/ai-coding-agents
npx ai-agents init --hub-url https://your-hub.replit.app
# Then add schema, routes, storage (see quickstart)
```

**Effort**: 10 min

---

### 4. Init Command Output Enhancement

Update `src/init.ts` to print next steps after generating files:

```
Created .ai-agents.json
Created scripts/ai-agents.sh

NEXT STEPS:
1. Add to shared/schema.ts:
   import { agentReportsTable } from 'ai-coding-agents';
   
2. Add to server/routes.ts:
   import { createAgentRouter } from 'ai-coding-agents';
   app.use('/api/agents', createAgentRouter(storage));

3. Implement storage interface (see templates/storage-adapter.ts)

4. Test: curl http://localhost:5000/api/agents/health
```

**Effort**: 15 min

---

## Files to Create/Modify

| Action | File | Effort |
|--------|------|--------|
| CREATE | `docs/QUICKSTART.md` | 20 min |
| CREATE | `npm-package/templates/storage-adapter.ts` | 10 min |
| CREATE | `npm-package/templates/schema-additions.ts` | 5 min |
| CREATE | `npm-package/templates/route-setup.ts` | 5 min |
| MODIFY | `npm-package/README.md` | 10 min |
| MODIFY | `src/init.ts` | 15 min |
| **TOTAL** | | **~65 min** |

---

## Copy-Paste Blocks

### Schema Block
```typescript
// Add to shared/schema.ts
import { 
  agentReportsTable, 
  agentLogsTable 
} from 'ai-coding-agents';

export { agentReportsTable, agentLogsTable };
```

### Routes Block
```typescript
// Add to server/routes.ts
import { createAgentRouter } from 'ai-coding-agents';

// After storage is initialized
app.use('/api/agents', createAgentRouter(storage));
```

### Storage Block (Minimal)
```typescript
// Implement in server/storage.ts
import { IAgentStorage, detectFailure, categorizeFailure } from 'ai-coding-agents';
import { db } from './db';
import { agentReportsTable } from '@shared/schema';

export const agentStorage: IAgentStorage = {
  async createAgentReport(input) {
    const failure = categorizeFailure(input);
    const [report] = await db.insert(agentReportsTable).values({
      ...input,
      detectedFailure: failure.detected,
      failureCategory: failure.category,
      failureSeverity: failure.severity,
    }).returning();
    return report;
  },
  
  async getAgentReports(projectId, limit = 100) {
    return db.select().from(agentReportsTable)
      .where(projectId ? eq(agentReportsTable.projectId, projectId) : undefined)
      .limit(limit);
  },
  
  async getAgentAnalytics(projectId) {
    const reports = await this.getAgentReports(projectId, 1000);
    const total = reports.length;
    const accepted = reports.filter(r => r.codeAccepted).length;
    return {
      totalReports: total,
      acceptanceRate: total > 0 ? accepted / total : 1,
      healthScore: total > 0 ? (accepted / total) * 100 : 100,
    };
  },
};
```

---

## Verification

After implementation, verify with:

```bash
# 1. Check templates exist
ls npm-package/templates/

# 2. Check QUICKSTART exists
cat docs/QUICKSTART.md | head -20

# 3. Run init and verify output
npx ai-agents init --hub-url http://test.example.com

# 4. Build package
cd npm-package && npm run build:package
```

---

## Out of Scope (Phase 2)

| Feature | Reason |
|---------|--------|
| `npx ai-agents verify` | Requires new CLI command |
| `--generate-storage` flag | Requires new init logic |
| Framework-specific guides | Needs testing on Fastify/Prisma |
| Offline mode | Requires design work |

---

## Approval Checklist

- [ ] Create QUICKSTART.md
- [ ] Create templates directory with 3 files
- [ ] Update README.md with quick start section
- [ ] Update init.ts to print next steps
- [ ] Test end-to-end flow
- [ ] Rebuild npm package

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Templates have bugs | Low | Based on working client code |
| Import paths wrong | Medium | Test after build |
| Init output formatting | Low | Simple string additions |

---

**Status**: PENDING APPROVAL

Approve to proceed with implementation.
