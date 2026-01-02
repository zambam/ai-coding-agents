# AI Coding Agents Package Reference

Complete API reference for the `ai-coding-agents` (rest-express) package.

---

## Table of Contents

1. [Package Overview](#package-overview)
2. [Core Agents](#core-agents)
3. [Orchestrator](#orchestrator)
4. [Logging & Debugging](#logging--debugging)
5. [Validation & Security](#validation--security)
6. [QA Scanner](#qa-scanner)
7. [CLI Commands](#cli-commands)
8. [Configuration](#configuration)
9. [Types Reference](#types-reference)
10. [Environment Variables](#environment-variables)

---

## Package Overview

### Installation
```bash
npm install rest-express
# or
npm install ai-coding-agents
```

### Main Exports
```typescript
import {
  // Agents & Orchestrator
  Orchestrator,
  Architect,
  Mechanic,
  CodeNinja,
  Philosopher,
  BaseAgent,
  
  // Core Utilities
  PromptEngine,
  Evaluator,
  ReplitMdParser,
  getGrokSecondOpinion,
  setGrokClient,
  
  // Logging
  logger,
  createLogger,
  createAgentLogger,
  getLoggerConfig,
  resolveEnvConfig,
  
  // Errors
  AgentError,
  ValidationError,
  SecurityError,
  ConnectionError,
  RateLimitError,
  AgentErrorCode,
  createRunId,
  hashPrompt,
  
  // Validation
  validateResponse,
  enforceValidation,
  checkFakeData,
  checkPII,
  checkSecurity,
  enforceClassicThresholds,
  
  // Scanner
  FakeDataScanner,
  createScanner,
  
  // Constants
  DEFAULT_AGENT_CONFIG,
  STRICT_AGENT_CONFIG,
  AGENT_PERSONAS,
} from 'ai-coding-agents';
```

---

## Core Agents

### Agent Types
| Agent | ID | Purpose | Specialization |
|-------|-----|---------|----------------|
| **The Architect** | `architect` | System design | Architecture, patterns, scalability |
| **The Mechanic** | `mechanic` | Bug diagnosis | Debugging, performance, fixes |
| **The Code Ninja** | `codeNinja` | Implementation | Features, refactoring, tests |
| **The Philosopher** | `philosopher` | Meta-analysis | Decisions, biases, opportunities |

### Architect
```typescript
import { Architect } from 'ai-coding-agents';

const architect = new Architect(config, openaiApiKey);

// Design a system
const result = await architect.design(task);

// Review existing design
const review = await architect.review(existingDesign);

// General invocation
const response = await architect.invoke(prompt);
```

**Capabilities:**
- System architecture design
- Component decomposition
- Pattern recommendations
- Scalability analysis
- Trade-off evaluation

### Mechanic
```typescript
import { Mechanic } from 'ai-coding-agents';

const mechanic = new Mechanic(config, openaiApiKey);

// Diagnose issues
const result = await mechanic.diagnose(symptom, context);

// Fix code
const fix = await mechanic.fix(code, issues);
```

**Capabilities:**
- Bug diagnosis
- Performance optimization
- Code quality fixes
- Dependency resolution
- Root cause analysis

### Code Ninja
```typescript
import { CodeNinja } from 'ai-coding-agents';

const ninja = new CodeNinja(config, openaiApiKey);

// Implement feature
const result = await ninja.implement(requirements, constraints);

// Refactor code
const refactored = await ninja.refactor(code, goals);
```

**Capabilities:**
- Feature implementation
- Code generation
- Refactoring
- Test writing
- Best practices enforcement

### Philosopher
```typescript
import { Philosopher } from 'ai-coding-agents';

const philosopher = new Philosopher(config, openaiApiKey);

// Evaluate decision
const result = await philosopher.evaluate(decision, context);

// Meta-think across outputs
const meta = await philosopher.metaThink(outputs);
```

**Capabilities:**
- Decision analysis
- Bias detection
- Opportunity mapping
- Process evaluation
- Meta-cognitive analysis

---

## Orchestrator

Multi-agent coordination system.

```typescript
import { Orchestrator } from 'ai-coding-agents';

const orchestrator = new Orchestrator(config, openaiApiKey);

// Invoke single agent
const result = await orchestrator.invokeAgent('architect', prompt);

// Run full pipeline (design -> implement -> diagnose -> analyze)
const pipeline = await orchestrator.runPipeline(task);
// Returns: { blueprint, implementation, diagnosis?, metaAnalysis? }

// Run QA review (all 4 agents)
const qa = await orchestrator.runQAReview('full'); // or 'staged'
// Returns: { architectAudit, mechanicDiagnosis, codeNinjaRemediation, philosopherValidation }

// Get current config
const config = orchestrator.getConfig();
```

### Pipeline Flow
```
Task -> Architect (blueprint) -> Code Ninja (implement) 
     -> Mechanic (diagnose if failures) -> Philosopher (meta-analysis)
```

### QA Review Flow
```
Architect Audit -> Mechanic Diagnosis -> Code Ninja Remediation -> Philosopher Validation
```

---

## Logging & Debugging

### Pre-configured Logger
```typescript
import { logger } from 'ai-coding-agents';

logger.info("Message", { key: value });
logger.warn("Warning", { context });
logger.error("Error", error, { context });
logger.debug("Debug info", { details });

// Start/end run tracking
const runId = logger.startRun('architect');
logger.endRun('success', metrics);

// Log agent invocation
logger.logAgentInvocation(agentType, action, outcome, metrics, promptHash);
```

### Create Custom Logger
```typescript
import { createLogger, createAgentLogger } from 'ai-coding-agents';

// Custom configuration
const customLogger = createLogger({
  level: 'debug',
  prettyPrint: true,
  destination: 'http',
  httpEndpoint: 'http://localhost:5000/api/agents/logs/ingest',
  redactPrompts: true,
});

// Agent-specific logger
const agentLogger = createAgentLogger({
  level: 'trace',
  destination: 'file',
  filePath: './logs/agents.log',
});
```

### Log Levels
| Level | Usage |
|-------|-------|
| `trace` | Very detailed debugging |
| `debug` | Development debugging |
| `info` | General information |
| `warn` | Warning conditions |
| `error` | Error conditions |
| `fatal` | Critical failures |

### Log Entry Structure
```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  runId: string;
  agentType?: AgentType;
  action?: string;
  outcome?: 'success' | 'failure' | 'partial';
  metrics?: Partial<CLASSicMetrics>;
  validations?: { passed: number; failed: number };
  errorCode?: string;
  promptHash?: string;
  message: string;
  metadata?: Record<string, unknown>;
}
```

### Error Classes
```typescript
import {
  AgentError,
  ValidationError,
  SecurityError,
  ConnectionError,
  RateLimitError,
  AgentErrorCode,
  createRunId,
  hashPrompt,
} from 'ai-coding-agents';

// Create correlation ID
const runId = createRunId(); // UUID v4

// Hash prompt for tracking
const hash = hashPrompt(prompt); // "sha256:abc12345"

// Error handling
try {
  // Agent operation
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.code);      // AgentErrorCode
    console.log(error.retryable); // boolean
    console.log(error.context);   // ErrorContext
  }
}
```

### Error Codes
| Code | Description |
|------|-------------|
| `VALIDATION_FAILED` | Response validation failed |
| `FAKE_DATA_DETECTED` | Placeholder/mock data found |
| `PII_DETECTED` | Personally identifiable information |
| `SECURITY_VIOLATION` | Security pattern detected |
| `OPENAI_CONNECTION_FAILED` | OpenAI API connection error |
| `GROK_CONNECTION_FAILED` | Grok API connection error |
| `RATE_LIMIT_EXCEEDED` | API rate limit hit |

---

## Validation & Security

### Response Validation
```typescript
import { validateResponse, enforceValidation } from 'ai-coding-agents';

// Validate response
const result = validateResponse(response, 'strict');
// Returns: { passed: string[], failed: string[], score: number }

// Enforce validation (throws on failure)
const { validation, security, fakeData } = enforceValidation(
  response,
  config,
  { enforceSecurity: true, enforceFakeDataCheck: true },
  { runId, agentType }
);
```

### Fake Data Detection
```typescript
import { checkFakeData } from 'ai-coding-agents';

const result = checkFakeData(text);
// Returns: { hasFakeData: boolean, patterns: string[] }
```

**Detected Patterns:**
- Lorem ipsum text
- example.com domains
- Test email patterns (test@, @test.)
- foo/bar/baz placeholders
- TODO/FIXME markers
- mock/placeholder/sample/dummy
- Fake SSN (123-45-6789)
- Fake phone (555-xxxx)
- John Doe/Jane Doe
- Fake credit cards

### PII Detection
```typescript
import { checkPII } from 'ai-coding-agents';

const result = checkPII(text);
// Returns: { hasPII: boolean, types: string[] }
```

**Detected PII:**
- Email addresses
- SSN format (xxx-xx-xxxx)
- Credit card numbers
- Phone numbers

### Security Check
```typescript
import { checkSecurity } from 'ai-coding-agents';

const result = checkSecurity(response);
// Returns: {
//   promptInjectionBlocked: boolean,
//   safeCodeGenerated: boolean,
//   piiDetected: boolean
// }
```

**Security Patterns Blocked:**
- Prompt injection attempts
- eval()/exec() calls
- child_process usage
- rm -rf commands
- DROP TABLE/TRUNCATE SQL

### CLASSic Thresholds
```typescript
import { enforceClassicThresholds } from 'ai-coding-agents';

// Throws ValidationError if thresholds exceeded
enforceClassicThresholds(agentType, metrics, errorContext);
```

**Default Thresholds:**
| Agent | Min Accuracy | Max Latency | Max Cost |
|-------|-------------|-------------|----------|
| architect | 85% | 30,000ms | $0.10 |
| mechanic | 90% | 20,000ms | $0.08 |
| codeNinja | 88% | 25,000ms | $0.12 |
| philosopher | 80% | 35,000ms | $0.15 |

---

## QA Scanner

Scan codebase for fake data, placeholders, and security issues.

```typescript
import { FakeDataScanner, createScanner } from 'ai-coding-agents';

// Create scanner
const scanner = createScanner({
  strict: true,           // Fail on warnings
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  ignorePatterns: ['test/', 'fixtures/'],
});

// Scan directory
const result = scanner.scan('./src');
// Returns: {
//   passed: boolean,
//   filesScanned: number,
//   issues: ScanIssue[],
//   duration: number
// }
```

### Issue Categories
| Category | Severity | Examples |
|----------|----------|----------|
| `fake_data` | error | test@user, John Doe, 555-1234 |
| `placeholder` | warning | lorem ipsum, "sample", "dummy" |
| `todo` | error | TODO: replace, FIXME: fake |
| `security` | error | Hardcoded API keys, tokens |
| `pii` | error | SSN, credit card numbers |

---

## CLI Commands

### Invoke Agent
```bash
./scripts/ai-agents.sh invoke architect "Design a user auth system"
./scripts/ai-agents.sh invoke mechanic "Debug the login failure"
./scripts/ai-agents.sh invoke codeNinja "Implement password reset"
./scripts/ai-agents.sh invoke philosopher "Evaluate the auth decision"

# Options
--strict    # Use strict configuration
```

### Scan Code
```bash
./scripts/ai-agents.sh scan ./src
./scripts/ai-agents.sh scan ./client --strict
./scripts/ai-agents.sh scan . --ext ts,tsx,js
```

### Submit Report
```bash
./scripts/ai-agents.sh report hvac-advisor --agent replit_agent --action code_gen --accepted
./scripts/ai-agents.sh report hvac-advisor --agent cursor --action refactor --correction "Fixed imports"
```

### View Analytics
```bash
./scripts/ai-agents.sh analytics
./scripts/ai-agents.sh analytics hvac-advisor
```

### Generate Rules
```bash
./scripts/ai-agents.sh generate-rules hvac-advisor
```

---

## Configuration

### Default Config
```typescript
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: 'fast',      // none | fast | robust
  validationLevel: 'medium',    // low | medium | high | strict
  enableSelfCritique: true,
  enablePhilosopher: false,
  enableGrokSecondOpinion: false,
  maxTokens: 4096,
  temperature: 0.7,
};
```

### Strict Config
```typescript
const STRICT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: 'robust',
  validationLevel: 'strict',
  enableSelfCritique: true,
  enablePhilosopher: true,
  enableGrokSecondOpinion: true,
  maxTokens: 4096,
  temperature: 0.4,
};
```

### Config via replit.md
The package reads configuration from `replit.md`:
```markdown
## Agent Configuration
consistency.mode: fast
validationLevel: medium
enableSelfCritique: false
enablePhilosopher: false
enableGrokSecondOpinion: false
maxTokens: 2048
temperature: 0.6
```

---

## Types Reference

### Core Types
```typescript
type AgentType = 'architect' | 'mechanic' | 'codeNinja' | 'philosopher';
type ConsistencyMode = 'none' | 'fast' | 'robust';
type ValidationLevel = 'low' | 'medium' | 'high' | 'strict';
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogDestination = 'stdout' | 'file' | 'http';
```

### Agent Response
```typescript
interface AgentResponse {
  reasoning: ReasoningStep[];
  recommendation: string;
  confidence: number;           // 0-1
  alternatives?: string[];
  warnings?: string[];
  codeOutput?: string;
  validations: {
    passed: string[];
    failed: string[];
  };
  grokSecondOpinion?: GrokSecondOpinion;
}

interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  observation?: string;
}
```

### CLASSic Metrics
```typescript
interface CLASSicMetrics {
  cost: {
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  latency: {
    totalMs: number;
    perStepMs: number[];
  };
  accuracy: {
    taskSuccessRate: number;
    validationsPassed: number;
    validationsFailed: number;
  };
  security: {
    promptInjectionBlocked: boolean;
    safeCodeGenerated: boolean;
  };
  stability: {
    consistencyScore: number;
    hallucinationDetected: boolean;
    pathsEvaluated: number;
  };
}
```

### External Agent Types
```typescript
type ExternalAgentType = 
  | 'replit_agent'
  | 'cursor'
  | 'copilot'
  | 'claude_code'
  | 'windsurf'
  | 'aider'
  | 'continue'
  | 'cody'
  | 'unknown';
```

### Failure Categories
```typescript
type FailureCategory =
  | 'security_gap'
  | 'logic_error'
  | 'context_blindness'
  | 'outdated_api'
  | 'missing_edge_case'
  | 'poor_readability'
  | 'broke_existing'
  | 'hallucinated_code';

type FailureSeverity = 'low' | 'medium' | 'high' | 'critical';
```

### Feedback Tags
```typescript
type FeedbackTag =
  | 'too_verbose'
  | 'too_brief'
  | 'incorrect'
  | 'off_topic'
  | 'helpful'
  | 'creative'
  | 'slow'
  | 'confusing';
```

---

## Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for agent invocations |

### Logging
| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_AGENTS_LOG_LEVEL` | `info` | Log level |
| `AI_AGENTS_DEBUG` | `false` | Enable trace logging |
| `AI_AGENTS_LOG_DEST` | `stdout` | Destination: stdout/file/http |
| `AI_AGENTS_LOG_FILE` | - | File path (sets dest=file) |
| `AI_AGENTS_LOG_HTTP` | - | HTTP endpoint for remote logging |
| `AI_AGENTS_PRETTY` | `true` (dev) | Pretty print logs |
| `AI_AGENTS_REDACT` | `true` | Redact sensitive data |

### API Integration
| Variable | Purpose |
|----------|---------|
| `AI_AGENTS_API_URL` | Base URL for CLI API calls |
| `GROK_API_KEY` | Grok second opinion (optional) |

---

## Host API Endpoints (Required for Full Integration)

### Agent Reporting
```
POST /api/agents/external/report    - Submit agent report
GET  /api/agents/monitor/analytics  - View analytics
GET  /api/agents/reports            - List reports
GET  /api/agents/reports/:reportId  - Get single report
```

### Log Ingestion
```
POST /api/agents/logs/ingest  - Single log entry
POST /api/agents/logs/batch   - Batch log entries
GET  /api/agents/logs         - Query logs
GET  /api/agents/logs/stats   - Log statistics
```

---

## Quick Start Example

```typescript
import { Orchestrator, createLogger, createScanner } from 'ai-coding-agents';

// Configure logging
const logger = createLogger({
  level: 'debug',
  destination: 'http',
  httpEndpoint: 'http://localhost:5000/api/agents/logs/ingest',
});

// Create orchestrator
const orchestrator = new Orchestrator({
  consistencyMode: 'fast',
  validationLevel: 'medium',
  enableSelfCritique: true,
}, process.env.OPENAI_API_KEY);

// Run a task through the pipeline
const result = await orchestrator.runPipeline(
  'Create a user authentication system with JWT tokens'
);

console.log('Blueprint:', result.blueprint.response.recommendation);
console.log('Implementation:', result.implementation.response.codeOutput);

// Scan for issues
const scanner = createScanner({ strict: true });
const scanResult = scanner.scan('./src');
if (!scanResult.passed) {
  console.error('Issues found:', scanResult.issues);
}
```
