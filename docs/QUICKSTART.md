# 5-Minute Quickstart

## Prerequisites

- Node.js 18+
- Express project with Drizzle ORM
- A deployed hub (or local hub at localhost:5000)

## Step 1: Install

```bash
npm install github:zambam/ai-coding-agents
```

## Step 2: Initialize

```bash
npx ai-agents init --hub-url https://your-hub.replit.app
```

Creates:
- `.ai-agents.json` - project config
- `scripts/ai-agents.sh` - CLI wrapper with env vars

## Step 3: Add Schema

Add to `shared/schema.ts`:

```typescript
import { 
  agentReportsTable, 
  agentLogsTable,
  projectGuidelinesTable 
} from 'ai-coding-agents/drizzle';

export { agentReportsTable, agentLogsTable, projectGuidelinesTable };
```

Run migration:
```bash
npm run db:push
```

## Step 4: Implement Storage

Create `server/agent-storage.ts`:

```typescript
import { db } from './db';
import { agentReportsTable, agentLogsTable } from 'ai-coding-agents/drizzle';
import { IAgentStorage, detectFailure, categorizeFailure } from 'ai-coding-agents/express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

export const agentStorage: IAgentStorage = {
  async createAgentReport(input) {
    const failure = categorizeFailure(input);
    const [inserted] = await db.insert(agentReportsTable).values({
      ...input,
      reportId: uuidv4(),
      detectedFailure: detectFailure(input),
      failureCategory: failure?.category,
      failureSeverity: failure?.severity,
    }).returning();
    return inserted;
  },
  
  async getAgentReports(projectId, limit = 100) {
    let query = db.select().from(agentReportsTable)
      .orderBy(desc(agentReportsTable.createdAt))
      .limit(limit);
    if (projectId) {
      query = query.where(eq(agentReportsTable.projectId, projectId));
    }
    return await query;
  },
  
  async getAgentAnalytics(projectId) {
    const reports = await this.getAgentReports(projectId, 1000);
    const total = reports.length;
    const accepted = reports.filter(r => r.codeAccepted === true).length;
    return {
      totalReports: total,
      acceptanceRate: total > 0 ? accepted / total : 1,
      failuresByCategory: {},
      failuresBySeverity: {},
      topPatterns: []
    };
  },
};
```

## Step 5: Mount Router

Add to `server/routes.ts`:

```typescript
import { createAgentRouter } from 'ai-coding-agents/express';
import { agentStorage } from './agent-storage';

// Mount agent endpoints
app.use('/api/agents', createAgentRouter(agentStorage));
```

## Step 6: Test

```bash
curl http://localhost:5000/api/agents/health
```

Expected: `{"status":"ok"}`

## Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents/health` | GET | Health check |
| `/api/agents/external/report` | POST | Receive agent reports |
| `/api/agents/analytics` | GET | View failure analytics |
| `/api/agents/guidelines/:projectId` | GET | Get project guidelines |

## Reporting from External Agents

```typescript
import { createMonitorClient } from 'ai-coding-agents';

const client = createMonitorClient({
  hubUrl: 'https://your-hub.replit.app',
  projectId: 'my-project'
});

await client.report({
  externalAgent: 'cursor',
  action: 'generate_function',
  codeGenerated: 'function foo() { ... }',
  codeAccepted: false,
  humanCorrection: 'function foo() { return null; }'
});
```

## Done

Your project now reports AI agent failures to the hub for ML learning.
