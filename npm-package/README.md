# AI Coding Agents

AI-powered coding guidance agents with built-in reliability mechanisms, dual-LLM reasoning (OpenAI + xAI Grok), and enterprise-grade ML learning.

> **New to integration?** See [QUICKSTART.md](../docs/QUICKSTART.md) for 5-minute setup.

## Features

- **4 Specialized AI Agents**: Architect, Mechanic, Code Ninja, Philosopher
- **Dual-LLM Second Opinion**: OpenAI GPT-4o + xAI Grok-3 for validation
- **Chain-of-Thought Reasoning**: Progressive reasoning with self-consistency
- **CLASSic Metrics**: Cost, Latency, Accuracy, Security, Stability evaluation
- **Client SDK**: Automatic ML reporting from client projects to central hub
- **Express Router Factory**: One-line integration for host projects
- **Drizzle Schema Exports**: Ready-to-use database tables
- **Git Hooks**: Automatic reporting on commits and merges
- **QA Scanner**: Detect fake data, placeholders, PII, and security issues

## Installation

```bash
# From GitHub
npm install github:zambam/ai-coding-agents

# Or clone and link locally
git clone https://github.com/zambam/ai-coding-agents.git
cd ai-coding-agents && npm link
```

## Quick Start

### CLI Usage

```bash
# Invoke an agent
npx ai-agents invoke architect "Design a REST API for user management"
npx ai-agents invoke mechanic "Debug this authentication issue"
npx ai-agents invoke ninja "Implement password reset feature"
npx ai-agents invoke philosopher "Evaluate the auth decision"

# Scan for issues
npx ai-agents scan ./src --ext .ts,.tsx

# Submit a report
npx ai-agents report my-project --agent cursor --action code_gen --accepted

# View analytics
npx ai-agents analytics my-project

# Initialize a new project
npx ai-agents init --framework express --orm drizzle --hub-url https://your-hub.replit.app

# Manage git hooks
npx ai-agents hooks install
npx ai-agents hooks status
```

### Programmatic Usage

```typescript
import { Orchestrator, DEFAULT_AGENT_CONFIG } from 'ai-coding-agents';

const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);

// Invoke single agent
const result = await orchestrator.invokeAgent('architect', 'Design a user auth system');

// Run full pipeline (all 4 agents)
const pipeline = await orchestrator.runPipeline('Build a payment system');
```

---

## What's New in v1.2.0

### Express Router Factory

Mount all agent endpoints in one line:

```typescript
import express from 'express';
import { createAgentRouter } from 'ai-coding-agents';

const app = express();
app.use('/api/agents', createAgentRouter(storage));
```

**Endpoints provided:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/external/report` | POST | Receive external agent reports |
| `/monitor/analytics` | GET | Failure analytics and health score |
| `/reports` | GET | List reports |
| `/guidelines/:projectId` | GET | Get AGENT_RULES.md |
| `/guidelines/generate` | POST | Regenerate guidelines |
| `/logs/ingest` | POST | Single log ingestion |
| `/logs/batch` | POST | Batch log ingestion |
| `/logs` | GET | Query logs |
| `/logs/stats` | GET | Log statistics |

### Drizzle Schema Exports

```typescript
import { 
  agentReportsTable, 
  agentLogsTable,
  projectGuidelinesTable,
  failurePatternsTable,
  FAILURE_CATEGORIES,
  EXTERNAL_AGENT_TYPES
} from 'ai-coding-agents';

// Add to your schema.ts
export { agentReportsTable, agentLogsTable };
```

### Storage Interface

Implement the `IAgentStorage` interface for your project:

```typescript
import { IAgentStorage, detectFailure, categorizeFailure } from 'ai-coding-agents';

const storage: IAgentStorage = {
  async createAgentReport(input) {
    const failure = categorizeFailure(input);
    // ... save to database
  },
  async getAgentReports(projectId, limit) { /* ... */ },
  async getAgentAnalytics(projectId) { /* ... */ },
  // Optional: log ingestion
  async ingestAgentLog(log) { /* ... */ },
  async getAgentLogs(options) { /* ... */ },
  async getAgentLogStats() { /* ... */ },
};
```

### Project Initialization

Auto-configure a project for agent reporting:

```bash
npx ai-agents init --framework express --orm drizzle --hub-url https://your-hub.replit.app
```

Creates:
- `.ai-agents.json` - Project configuration
- `scripts/ai-agents.sh` - CLI wrapper with environment variables

### Client SDK

Report from client projects to central hub:

```typescript
import { createMonitorClient } from 'ai-coding-agents';

const client = createMonitorClient({
  projectId: 'my-project',
  hubUrl: 'https://your-hub.replit.app'
});

// Report agent interaction
await client.report({
  agent: 'cursor',
  action: 'code_generated',
  codeAccepted: true,
  humanCorrection: 'Fixed import statement'
});

// Sync AGENT_RULES.md
await client.syncRules();

// Get analytics
const analytics = await client.getAnalytics();
```

### Git Hooks

Automatic reporting on Git operations:

```bash
# Install hooks
npx ai-agents hooks install

# Hooks installed:
# - pre-commit: Runs QA scan
# - post-commit: Reports code changes
# - post-merge: Syncs AGENT_RULES.md
```

---

## Individual Agents

```typescript
import { Architect, Mechanic, CodeNinja, Philosopher, DEFAULT_AGENT_CONFIG } from 'ai-coding-agents';

// Use individual agents
const architect = new Architect(DEFAULT_AGENT_CONFIG);
const design = await architect.design("Design a REST API for a todo app");

const mechanic = new Mechanic(DEFAULT_AGENT_CONFIG);
const diagnosis = await mechanic.diagnose("Function returns undefined", "code context here");

const ninja = new CodeNinja(DEFAULT_AGENT_CONFIG);
const impl = await ninja.implement("Create a login form with validation");

const philosopher = new Philosopher(DEFAULT_AGENT_CONFIG);
const review = await philosopher.evaluate(design.response.recommendation);
```

## Configuration

### Agent Configuration

```typescript
import type { AgentConfig } from 'ai-coding-agents';

const config: AgentConfig = {
  consistencyMode: "robust",      // "none" | "fast" | "robust"
  validationLevel: "strict",      // "low" | "medium" | "high" | "strict"
  enableSelfCritique: true,       // Enable self-improvement loop
  enablePhilosopher: true,        // Enable meta-analysis
  enableGrokSecondOpinion: true,  // Enable Grok second opinion
  maxTokens: 4096,
  temperature: 0.4,
};

const orchestrator = new Orchestrator(config);
```

### .ai-agents.json

```json
{
  "projectId": "my-project",
  "hubUrl": "https://your-hub.replit.app",
  "autoSync": true,
  "rulesFile": "AGENT_RULES.md",
  "reporting": {
    "enabled": true,
    "onCommit": true,
    "onMerge": true
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for agent invocation |
| `XAI_API_KEY` | Optional for Grok second opinions |
| `AI_AGENTS_API_URL` | Hub API URL (default: http://localhost:5000) |
| `AI_AGENTS_PROJECT_ID` | Project identifier |
| `AI_AGENTS_LOG_LEVEL` | Log level: trace/debug/info/warn/error |
| `AI_AGENTS_LOG_HTTP` | HTTP endpoint for log forwarding |

## Agent Types

| Agent | Purpose | Use When |
|-------|---------|----------|
| **Architect** | System design, architecture | Planning new features, system design |
| **Mechanic** | Bug diagnosis, performance | Debugging, optimization |
| **Code Ninja** | Implementation, refactoring | Writing code, tests |
| **Philosopher** | Meta-analysis, decisions | Evaluating approaches, trade-offs |

## Failure Categories

Reports are automatically classified:

| Category | Description |
|----------|-------------|
| `rejection` | Code not accepted |
| `minor_correction` | Small fixes (<50 chars) |
| `significant_changes` | Medium changes (50-200 chars) |
| `major_rewrite` | Large rewrites (>200 chars) |
| `security_gap` | Security vulnerabilities |
| `logic_error` | Incorrect logic |
| `context_blindness` | Missed project context |
| `hallucinated_code` | Non-existent APIs/patterns |

## External Agent Types

Supported AI coding agents:

- `replit_agent`
- `cursor`
- `copilot`
- `claude_code`
- `windsurf`
- `aider`
- `continue`
- `cody`

## QA Scanner

Scan for fake data, placeholders, and security issues:

```typescript
import { FakeDataScanner, createScanner } from 'ai-coding-agents';

const scanner = createScanner({
  strict: true,
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
});

const result = scanner.scan('./src');
console.log(result.passed, result.issues);
```

## Utilities

```typescript
import { 
  detectFailure,      // Check if report is a failure
  categorizeFailure,  // Get category and severity
  checkFakeData,      // Detect placeholder data
  checkPII,           // Detect personally identifiable info
  checkSecurity,      // Security pattern check
  validateResponse,   // Validate agent response
} from 'ai-coding-agents';
```

## Logging

```typescript
import { logger, createLogger } from 'ai-coding-agents';

logger.info("Message", { context });
logger.error("Error", error);

const customLogger = createLogger({
  level: 'debug',
  destination: 'http',
  httpEndpoint: 'https://your-hub.replit.app/api/agents/logs/ingest'
});
```

## Architecture

```
Hub (Central)                          Client Projects
+---------------------+               +---------------------+
|  AI Agents Service  |<---- HTTP ----|  Your Project       |
|  - 4 AI Agents      |               |  - Client SDK       |
|  - ML Learning      |---- Rules --->|  - Git Hooks        |
|  - Analytics        |               |  - AGENT_RULES.md   |
+---------------------+               +---------------------+
```

## Types

```typescript
import type {
  AgentType,
  AgentConfig,
  AgentResponse,
  AgentInvocationResult,
  CLASSicMetrics,
  GrokSecondOpinion,
  ReasoningStep,
  IAgentStorage,
  AgentReport,
  AgentAnalytics,
} from 'ai-coding-agents';
```

## License

MIT
