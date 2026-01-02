# AI Agent Reporting Integration Setup Report

## Overview

This document outlines the steps required to integrate the `ai-coding-agents` package's reporting functionality into a host project. The goal is to identify configuration requirements that should be automated in future package versions.

## Integration Components Required

### 1. Database Schema (shared/schema.ts)

The host project must add a table to store agent reports:

```typescript
export const agentReports = pgTable("agent_reports", {
  id: serial("id").primaryKey(),
  reportId: varchar("report_id", { length: 255 }).notNull().unique(),
  projectId: varchar("project_id", { length: 255 }).notNull(),
  externalAgent: varchar("external_agent", { length: 100 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  codeGenerated: text("code_generated"),
  codeAccepted: boolean("code_accepted"),
  humanCorrection: text("human_correction"),
  detectedFailure: boolean("detected_failure").default(false),
  failureCategory: varchar("failure_category", { length: 100 }),
  failureSeverity: varchar("failure_severity", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Package Improvement**: Provide a migration script or Drizzle schema generator that can be imported.

### 2. Storage Interface (server/storage.ts)

Required CRUD operations:

| Method | Purpose |
|--------|---------|
| `createAgentReport(report)` | Insert new report with failure detection |
| `getAgentReports(projectId?, limit?)` | Retrieve reports with optional filtering |
| `getAgentAnalytics(projectId?)` | Calculate health metrics and patterns |

**Failure Detection Logic** (should be package-provided):
```typescript
function detectFailure(report) {
  if (report.codeAccepted === false) return true;
  if (report.humanCorrection && report.humanCorrection.length > 50) return true;
  return false;
}

function categorizeFailure(report) {
  if (!report.humanCorrection) return { category: "rejection", severity: "medium" };
  const len = report.humanCorrection.length;
  if (len > 200) return { category: "major_rewrite", severity: "high" };
  if (len > 50) return { category: "significant_changes", severity: "medium" };
  return { category: "minor_correction", severity: "low" };
}
```

**Package Improvement**: Export these as utility functions from the package.

### 3. API Routes (server/routes/agent-routes.ts)

Three endpoints required:

```
POST /api/agents/external/report
GET  /api/agents/monitor/analytics
GET  /api/agents/reports
```

**Request/Response Formats**:

#### POST /api/agents/external/report
```json
// Request
{
  "projectId": "string",
  "externalAgent": "replit_agent|cursor|copilot|claude_code|other",
  "action": "string",
  "codeGenerated": "string (optional)",
  "codeAccepted": "boolean (optional)",
  "humanCorrection": "string (optional)",
  "metadata": "object (optional)"
}

// Response
{
  "reportId": "uuid",
  "detectedFailure": "boolean",
  "failureCategory": "string (if failure)",
  "failureSeverity": "string (if failure)"
}
```

#### GET /api/agents/monitor/analytics
```json
// Response (CLI expects this exact structure)
{
  "projectId": "string|null",
  "analytics": {
    "totalReports": "number",
    "acceptanceRate": "number (0-1)",
    "failuresByCategory": { "category": "count" },
    "failuresBySeverity": { "severity": "count" },
    "topPatterns": [{ "pattern": "string", "count": "number" }]
  },
  "healthScore": "number (0-100)"
}
```

**Package Improvement**: Provide an Express router factory or middleware that handles these routes.

### 4. CLI Wrapper (scripts/ai-agents.sh)

```bash
#!/bin/bash
export AI_AGENTS_API_URL="http://localhost:5000/api/agents"
npx ai-agents "$@"
```

**Package Improvement**: Auto-detect API URL from environment or config file.

### 5. Route Registration (server/routes.ts)

```typescript
import { agentRouter } from "./routes/agent-routes";
app.use("/api/agents", agentRouter);
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `AI_AGENTS_API_URL` | Yes | Base URL for CLI to reach host API |

## Recommended Package Improvements

### Priority 1: Reduce Manual Setup

1. **Export Express Router Factory**
   ```typescript
   import { createAgentRouter } from 'ai-coding-agents/express';
   app.use('/api/agents', createAgentRouter(storage));
   ```

2. **Export Drizzle Schema**
   ```typescript
   import { agentReportsTable } from 'ai-coding-agents/drizzle';
   ```

3. **Export Storage Adapter Interface**
   ```typescript
   import { IAgentStorage } from 'ai-coding-agents';
   class MyStorage implements IAgentStorage { ... }
   ```

### Priority 2: Improve DX

1. **Auto-configuration CLI**
   ```bash
   npx ai-agents init --framework express --orm drizzle
   ```

2. **Health Check Endpoint**
   - Package should provide `/api/agents/health` for connectivity testing

3. **Standardized Response Formats**
   - Document exact CLI expectations to avoid mismatched field names

### Priority 3: Advanced Features

1. **Webhook Support**
   - Allow configuring webhooks for failure notifications

2. **Dashboard Component**
   - Export a React component for viewing analytics

3. **Batch Import**
   - Support importing historical reports from CSV/JSON

## Testing Verification

After setup, verify with:

```bash
# Submit test report
./scripts/ai-agents.sh report myproject --agent test --action test --accepted

# Check analytics
./scripts/ai-agents.sh analytics myproject

# Should see:
# - Health Score: 100.0%
# - Total Reports: 1
```

## Files Modified During Integration

| File | Changes |
|------|---------|
| `shared/schema.ts` | Added `agentReports` table |
| `server/storage.ts` | Added 3 CRUD methods + failure detection |
| `server/routes/agent-routes.ts` | New file with 3 endpoints |
| `server/routes.ts` | Imported and mounted agent router |
| `scripts/ai-agents.sh` | New CLI wrapper |

## Time Estimate

Current manual integration: ~30-45 minutes

With proposed improvements: ~5 minutes (just `npx ai-agents init`)

---

# Logging & Debugging Services Integration

## Overview

The `ai-coding-agents` package provides comprehensive logging and debugging services that can be connected to your host project for centralized log aggregation and error tracking.

## Package Exports Available

### Logger Exports
```typescript
import { 
  logger,              // Pre-configured Pino logger instance
  createLogger,        // Factory for custom loggers
  createAgentLogger,   // Agent-specific logger with run tracking
  getLoggerConfig,     // Get current configuration
  resolveEnvConfig,    // Resolve config from environment
  type LogContext, 
  type LogEntry,
  type LoggerConfig,
} from 'ai-coding-agents';
```

### Error Handling Exports
```typescript
import {
  AgentError,          // Base error class with context
  ValidationError,     // Validation failures  
  SecurityError,       // Security violations (PII, API keys)
  ConnectionError,     // API connection issues
  RateLimitError,      // Rate limit exceeded
  AgentErrorCode,      // Error code enum
  createRunId,         // Generate correlation ID (UUID)
  hashPrompt,          // Hash for prompt tracking
  type ErrorContext,
} from 'ai-coding-agents';
```

## Environment Configuration

The package logger auto-configures from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_AGENTS_LOG_LEVEL` | `info` | trace/debug/info/warn/error/fatal |
| `AI_AGENTS_DEBUG` | `false` | Set `true` for trace-level logging |
| `AI_AGENTS_LOG_DEST` | `stdout` | stdout/file/http |
| `AI_AGENTS_LOG_FILE` | - | Path for file logging (sets dest=file) |
| `AI_AGENTS_LOG_HTTP` | - | HTTP endpoint for remote logging |
| `AI_AGENTS_PRETTY` | `true` (dev) | Human-readable output |
| `AI_AGENTS_REDACT` | `true` | Auto-redact API keys/passwords |

## HTTP Log Forwarding Setup

To capture agent logs in your host project, set up an HTTP log receiver.

### 1. Database Schema (shared/schema.ts)

Add a table to store agent logs:

```typescript
export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  level: text("level").notNull(),
  service: text("service").notNull().default("ai-coding-agents"),
  agentType: text("agent_type"),
  action: text("action"),
  outcome: text("outcome"),
  message: text("message").notNull(),
  errorCode: text("error_code"),
  promptHash: text("prompt_hash"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});
```

### 2. Storage Methods (server/storage.ts)

| Method | Purpose |
|--------|---------|
| `ingestAgentLog(log)` | Store incoming log entry |
| `getAgentLogs(options)` | Query logs with filters |
| `getAgentLogStats()` | Get aggregated statistics |

### 3. API Endpoints (server/routes/agent-routes.ts)

```
POST /api/agents/logs/ingest   - Single log entry ingestion
POST /api/agents/logs/batch    - Batch log ingestion
GET  /api/agents/logs          - Query logs with filters
GET  /api/agents/logs/stats    - Get log statistics
```

#### POST /api/agents/logs/ingest
```json
// Request (Pino log format compatible)
{
  "runId": "uuid",
  "level": "info|warn|error|...",
  "message": "string",
  "service": "ai-coding-agents",
  "agentType": "architect|mechanic|ninja|philosopher",
  "action": "string",
  "outcome": "success|failure|partial",
  "errorCode": "string (optional)",
  "promptHash": "string (optional)",
  "metadata": "object (optional)",
  "timestamp": "ISO datetime (optional)"
}

// Response
{
  "ingested": true,
  "id": 123
}
```

#### POST /api/agents/logs/batch
```json
// Request
{
  "logs": [
    { "runId": "...", "level": "info", "message": "..." },
    { "runId": "...", "level": "error", "message": "..." }
  ]
}

// Response
{
  "ingested": 2
}
```

#### GET /api/agents/logs
Query parameters: `runId`, `level`, `agentType`, `since`, `limit`

#### GET /api/agents/logs/stats
```json
// Response
{
  "stats": {
    "totalLogs": 150,
    "byLevel": { "info": 120, "warn": 20, "error": 10 },
    "byAgent": { "architect": 50, "mechanic": 100 },
    "errorCount": 10,
    "recentRuns": [
      { "runId": "abc-123", "logCount": 25, "hasErrors": false }
    ]
  }
}
```

### 4. Enable HTTP Forwarding

Configure the package to forward logs to your endpoint:

```bash
# In your environment or .env file
export AI_AGENTS_LOG_HTTP="http://localhost:5000/api/agents/logs/ingest"
export AI_AGENTS_LOG_LEVEL="debug"
```

Or programmatically:
```typescript
import { createLogger } from 'ai-coding-agents';

const logger = createLogger({
  destination: 'http',
  httpEndpoint: 'http://localhost:5000/api/agents/logs/ingest',
  level: 'debug',
});
```

### 5. CLI Wrapper Update

Update the CLI wrapper to enable log forwarding:

```bash
#!/bin/bash
export AI_AGENTS_API_URL="http://localhost:5000/api/agents"
export AI_AGENTS_LOG_HTTP="http://localhost:5000/api/agents/logs/ingest"
export AI_AGENTS_LOG_LEVEL="debug"
npx ai-agents "$@"
```

## Error Handling Integration

### Using Error Classes
```typescript
import { 
  ValidationError, 
  SecurityError, 
  AgentErrorCode,
  createRunId 
} from 'ai-coding-agents';

const runId = createRunId();

try {
  // Agent operation
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation failure
    console.log('Error code:', error.code);
    console.log('Is retryable:', error.retryable);
  }
  if (error instanceof SecurityError) {
    // Handle security violation (PII detected, etc.)
    console.log('Security context:', error.context);
  }
}
```

### Error Codes Reference
| Code | Description |
|------|-------------|
| `VALIDATION_FAILED` | Response validation failed |
| `FAKE_DATA_DETECTED` | Placeholder/mock data found |
| `PII_DETECTED` | Personally identifiable information |
| `SECURITY_VIOLATION` | Security pattern detected |
| `OPENAI_CONNECTION_FAILED` | OpenAI API connection error |
| `GROK_CONNECTION_FAILED` | Grok API connection error |
| `RATE_LIMIT_EXCEEDED` | API rate limit hit |

## Testing Log Forwarding

```bash
# Test log ingestion
curl -X POST http://localhost:5000/api/agents/logs/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "test-run-001",
    "level": "info",
    "message": "Test log entry",
    "service": "ai-coding-agents",
    "agentType": "architect"
  }'

# Check log stats
curl http://localhost:5000/api/agents/logs/stats

# Query logs
curl "http://localhost:5000/api/agents/logs?level=error&limit=10"
```

## Files Modified for Logging Integration

| File | Changes |
|------|---------|
| `shared/schema.ts` | Added `agentLogs` table |
| `server/storage.ts` | Added `ingestAgentLog`, `getAgentLogs`, `getAgentLogStats` |
| `server/routes/agent-routes.ts` | Added 4 log endpoints |
| `scripts/ai-agents.sh` | Added `AI_AGENTS_LOG_HTTP` env var |

## Recommended Package Improvements for Logging

1. **Export HTTP Transport**
   ```typescript
   import { createHttpTransport } from 'ai-coding-agents/transports';
   ```

2. **Auto-Discovery**
   - Package should auto-detect host API from `AI_AGENTS_API_URL`

3. **Buffering & Retry**
   - Built-in log buffering with retry on failure

4. **OpenTelemetry Integration**
   - Export spans and traces compatible with OTEL collectors

---

# Package Capabilities Summary

For full API reference, see: `docs/AI_CODING_AGENTS_REFERENCE.md`

## Available Agents

| Agent | ID | Purpose | Key Methods |
|-------|-----|---------|-------------|
| The Architect | `architect` | System design, patterns, scalability | `design()`, `review()` |
| The Mechanic | `mechanic` | Bug diagnosis, performance, fixes | `diagnose()`, `fix()` |
| The Code Ninja | `codeNinja` | Feature implementation, refactoring | `implement()`, `refactor()` |
| The Philosopher | `philosopher` | Meta-analysis, bias detection | `evaluate()`, `metaThink()` |

## Orchestrator Capabilities

```typescript
import { Orchestrator } from 'ai-coding-agents';

const orchestrator = new Orchestrator(config, openaiApiKey);

// Single agent invocation
await orchestrator.invokeAgent('architect', prompt);

// Full pipeline: design -> implement -> diagnose -> analyze
await orchestrator.runPipeline(task);

// QA review with all 4 agents
await orchestrator.runQAReview('full');
```

## Validation & Security Services

| Service | Function | Purpose |
|---------|----------|---------|
| `checkFakeData(text)` | Detect placeholder/mock data | Lorem ipsum, test@, foo/bar |
| `checkPII(text)` | Detect PII | SSN, credit cards, emails |
| `checkSecurity(response)` | Security analysis | Injection, unsafe code, PII |
| `validateResponse(response, level)` | Validate agent output | Reasoning, confidence, depth |
| `enforceClassicThresholds(agent, metrics)` | Threshold enforcement | Cost, latency, accuracy |

## QA Scanner

```typescript
import { createScanner } from 'ai-coding-agents';

const scanner = createScanner({ strict: true, extensions: ['.ts', '.tsx'] });
const result = scanner.scan('./src');

// Returns: { passed, filesScanned, issues, duration }
```

**Issue Categories:** fake_data, placeholder, todo, security, pii

## CLASSic Metrics (Tracked Per Invocation)

| Category | Metrics |
|----------|---------|
| **Cost** | tokens, inputTokens, outputTokens, estimatedCost |
| **Latency** | totalMs, perStepMs[] |
| **Accuracy** | taskSuccessRate, validationsPassed, validationsFailed |
| **Security** | promptInjectionBlocked, safeCodeGenerated |
| **Stability** | consistencyScore, hallucinationDetected, pathsEvaluated |

## Configuration Options

```typescript
const config = {
  consistencyMode: 'fast',      // none | fast | robust
  validationLevel: 'medium',    // low | medium | high | strict
  enableSelfCritique: true,     // Reflection loop
  enablePhilosopher: false,     // Meta-analysis on strict
  enableGrokSecondOpinion: false, // Second opinion from Grok
  maxTokens: 4096,
  temperature: 0.7,
};
```

## All Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | - | Required for agent invocations |
| `AI_AGENTS_API_URL` | - | Base URL for CLI API calls |
| `AI_AGENTS_LOG_HTTP` | - | HTTP endpoint for log forwarding |
| `AI_AGENTS_LOG_LEVEL` | `info` | trace/debug/info/warn/error/fatal |
| `AI_AGENTS_DEBUG` | `false` | Enable trace-level logging |
| `AI_AGENTS_LOG_DEST` | `stdout` | stdout/file/http |
| `AI_AGENTS_LOG_FILE` | - | File path for file logging |
| `AI_AGENTS_PRETTY` | `true` (dev) | Pretty print logs |
| `AI_AGENTS_REDACT` | `true` | Auto-redact sensitive data |
| `GROK_API_KEY` | - | Grok second opinion (optional) |

## CLI Quick Reference

```bash
# Invoke agents
./scripts/ai-agents.sh invoke architect "Design auth system"
./scripts/ai-agents.sh invoke mechanic "Debug login failure"

# Scan codebase
./scripts/ai-agents.sh scan ./src --strict

# Submit reports
./scripts/ai-agents.sh report myproject --agent cursor --action refactor --accepted

# View analytics
./scripts/ai-agents.sh analytics myproject
```

## Complete File List for Integration

| File | Purpose |
|------|---------|
| `shared/schema.ts` | agentReports + agentLogs tables |
| `server/storage.ts` | 6 storage methods for reports + logs |
| `server/routes/agent-routes.ts` | 7 API endpoints |
| `server/routes.ts` | Router registration |
| `scripts/ai-agents.sh` | CLI wrapper with env config |
| `docs/AI_CODING_AGENTS_REFERENCE.md` | Full API reference |
| `docs/AI_AGENT_REPORTING_SETUP.md` | This setup guide |
