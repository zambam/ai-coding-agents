# API Reference

Complete API documentation for the AI Coding Agents package.

## Table of Contents

- [Orchestrator](#orchestrator)
- [Agents](#agents)
- [Scanner](#scanner)
- [Logger](#logger)
- [Validation](#validation)
- [Types](#types)
- [Constants](#constants)

---

## Orchestrator

The main entry point for invoking AI agents.

### Constructor

```typescript
new Orchestrator(
  config?: Partial<AgentConfig>,
  learningConfig?: Partial<LearningEnabledConfig>,
  storage?: IDataTelemetry
)
```

**Parameters:**
- `config` - Optional configuration object (defaults to `DEFAULT_AGENT_CONFIG`)
- `learningConfig` - Optional learning configuration
- `storage` - Optional storage backend for learning features

```typescript
interface LearningEnabledConfig {
  enableLearning: boolean;         // Enable learning infrastructure
  enableMemoryContext: boolean;    // Enable RAG-style memory retrieval
  enablePromptOptimization: boolean; // Enable A/B testing of prompts
}
```

### Methods

#### invokeAgent

```typescript
invokeAgent(agent: AgentType, prompt: string): Promise<AgentResult>
```

Invokes a single agent with the given prompt.

**Parameters:**
- `agent` - Agent type: `'architect'`, `'mechanic'`, `'codeNinja'`, or `'philosopher'`
- `prompt` - The task or question for the agent

**Returns:** `Promise<AgentResult>`

**Example:**
```typescript
const result = await orchestrator.invokeAgent('architect', 'Design a caching strategy');
```

#### runPipeline

```typescript
runPipeline(prompt: string): Promise<PipelineResult>
```

Runs the full multi-agent pipeline.

**Parameters:**
- `prompt` - The task for the pipeline

**Returns:** `Promise<PipelineResult>` with results from each agent stage

#### invokeWithLearning

```typescript
invokeWithLearning(
  type: AgentType,
  prompt: string
): Promise<{ result: AgentInvocationResult; runId: string; promptVersion?: string }>
```

Invokes an agent with learning features (prompt variant selection, memory context).

**Parameters:**
- `type` - Agent type
- `prompt` - The task or question

**Returns:** Object with `result`, `runId` for tracking, and optional `promptVersion`

#### recordOutcome

```typescript
recordOutcome(
  runId: string,
  agentType: AgentType,
  outcomeStatus: 'accepted' | 'rejected' | 'edited' | 'ignored',
  options?: {
    editDistance?: number;
    timeToDecision?: number;
    grokAgreed?: boolean;
    promptVersion?: string;
    classicMetrics?: { cost, latency, accuracy, security, stability };
  }
): Promise<void>
```

Records the outcome of an agent invocation for learning.

**Parameters:**
- `runId` - The run ID from invokeWithLearning
- `agentType` - Agent type
- `outcomeStatus` - How the user handled the response
- `options` - Additional metrics and metadata

#### getLearningInsights

```typescript
getLearningInsights(agentType: AgentType): Promise<{
  performanceSignal?: PerformanceAnalysis;
  improvementSuggestions?: string[];
  memoryStats?: MemoryStats;
}>
```

Gets learning insights for a specific agent.

**Parameters:**
- `agentType` - Agent type

**Returns:** Promise with performance analysis, improvement suggestions, and memory statistics

#### evaluateAndOptimize

```typescript
evaluateAndOptimize(agentType: AgentType): Promise<{
  promoted: boolean;
  winner?: string;
  loser?: string;
}>
```

Evaluates A/B test results and promotes winning prompt variants.

**Parameters:**
- `agentType` - Agent type

**Returns:** Object indicating if a winner was promoted

---

## Agents

Individual agent classes for direct usage.

### BaseAgent

Abstract base class for all agents.

```typescript
abstract class BaseAgent {
  constructor(config: AgentConfig);
  abstract invoke(prompt: string): Promise<AgentResponse>;
  invokeWithSystemPrompt(prompt: string, systemPrompt: string): Promise<AgentResponse>;
}
```

### ArchitectAgent

```typescript
class ArchitectAgent extends BaseAgent {
  invoke(prompt: string): Promise<AgentResponse>;
}
```

Specializes in system design and architecture.

### MechanicAgent

```typescript
class MechanicAgent extends BaseAgent {
  invoke(prompt: string): Promise<AgentResponse>;
}
```

Specializes in debugging and issue diagnosis.

### CodeNinjaAgent

```typescript
class CodeNinjaAgent extends BaseAgent {
  invoke(prompt: string): Promise<AgentResponse>;
}
```

Specializes in fast, precise implementations.

### PhilosopherAgent

```typescript
class PhilosopherAgent extends BaseAgent {
  invoke(prompt: string): Promise<AgentResponse>;
}
```

Specializes in evaluation and critique.

---

## Scanner

Code quality scanning for fake data, security issues, and PII.

### FakeDataScanner

```typescript
class FakeDataScanner {
  constructor(options?: ScannerOptions);
  scanContent(content: string): Promise<ScanIssue[]>;
  scanFile(filePath: string): Promise<ScanIssue[]>;
  scanDirectory(dirPath: string): Promise<ScanResult>;
}
```

#### Constructor Options

```typescript
interface ScannerOptions {
  strict?: boolean;           // Fail on warnings (default: false)
  extensions?: string[];      // File extensions to scan (default: ['.ts', '.tsx', '.js', '.jsx'])
}
```

#### scanContent

```typescript
scanContent(content: string): Promise<ScanIssue[]>
```

Scans a string content for issues.

**Parameters:**
- `content` - The code content to scan

**Returns:** `Promise<ScanIssue[]>`

#### scanFile

```typescript
scanFile(filePath: string): Promise<ScanIssue[]>
```

Scans a single file for issues.

**Parameters:**
- `filePath` - Path to the file

**Returns:** `Promise<ScanIssue[]>`

#### scanDirectory

```typescript
scanDirectory(dirPath: string): Promise<ScanResult>
```

Scans all matching files in a directory recursively.

**Parameters:**
- `dirPath` - Path to the directory

**Returns:** `Promise<ScanResult>`

### createScanner

Factory function for creating scanners.

```typescript
function createScanner(options?: ScannerOptions): FakeDataScanner
```

---

## Logger

Structured JSON logging with Pino.

### createLogger

```typescript
function createLogger(options?: LoggerOptions): Logger
```

Creates a configured logger instance.

**Options:**
```typescript
interface LoggerOptions {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  runId?: string;
  stream?: NodeJS.WritableStream;
}
```

**Example:**
```typescript
const logger = createLogger({ level: 'debug', runId: 'run-123' });
logger.info('Agent started', { agent: 'architect' });
logger.error('Failed', { error: err.message });
```

### LoggerFactory

```typescript
class LoggerFactory {
  static create(options?: LoggerOptions): Logger;
  static createFromEnv(): Logger;
}
```

Creates loggers with environment variable configuration.

**Environment Variables:**
- `AI_AGENTS_LOG_LEVEL` - Log level
- `AI_AGENTS_LOG_FILE` - Output file path
- `AI_AGENTS_LOG_HTTP` - HTTP endpoint for log shipping

---

## Validation

Input validation and security enforcement.

### BlockingValidationWrapper

```typescript
class BlockingValidationWrapper {
  constructor(config: ValidationConfig);
  validate(input: string): ValidationResult;
  validateWithBlocking(input: string): void; // Throws on failure
}
```

**Validation Config:**
```typescript
interface ValidationConfig {
  level: 'low' | 'medium' | 'high' | 'strict';
  blockPII: boolean;
  blockFakeData: boolean;
  maxInputLength: number;
}
```

### validateInput

```typescript
function validateInput(input: string, config?: ValidationConfig): ValidationResult
```

Validates input against security rules.

**Returns:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  piiDetected: boolean;
  fakeDataDetected: boolean;
}
```

---

## Types

### AgentType

```typescript
type AgentType = 'architect' | 'mechanic' | 'codeNinja' | 'philosopher';
```

### AgentConfig

```typescript
interface AgentConfig {
  consistency: {
    mode: 'fast' | 'balanced' | 'thorough';
    samples: number;
    threshold: number;
  };
  validationLevel: 'low' | 'medium' | 'high' | 'strict';
  enableSelfCritique: boolean;
  enablePhilosopher: boolean;
  enableGrokSecondOpinion: boolean;
  enableLearning: boolean;
  classicThresholds: {
    maxCost: number;
    maxLatencyMs: number;
    minAccuracy: number;
    maxSecurityScore: number;
    minStability: number;
  };
}
```

### AgentResponse

```typescript
interface AgentResponse {
  recommendation: string;
  confidence: number;
  reasoning: ReasoningStep[];
  alternatives?: string[];
  warnings?: string[];
  grokSecondOpinion?: GrokOpinion;
}
```

### ReasoningStep

```typescript
interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  observation?: string;
}
```

### AgentResult

```typescript
interface AgentResult {
  response: AgentResponse;
  metrics: CLASSicMetrics;
  runId: string;
  agent: string;
}
```

### CLASSicMetrics

```typescript
interface CLASSicMetrics {
  cost: {
    tokens: number;
    estimatedCost: number;
  };
  latency: {
    totalMs: number;
    llmMs: number;
    processingMs: number;
  };
  accuracy: {
    taskSuccessRate: number;
    selfConsistencyScore: number;
  };
  security: {
    piiDetected: boolean;
    securityScore: number;
  };
  stability: {
    consistencyScore: number;
    errorRate: number;
  };
}
```

### ScanResult

```typescript
interface ScanResult {
  passed: boolean;
  filesScanned: number;
  issues: ScanIssue[];
}
```

### ScanIssue

```typescript
interface ScanIssue {
  file: string;
  line: number;
  message: string;
  pattern: string;
  severity: 'error' | 'warning';
  category: 'fake_data' | 'security' | 'pii' | 'placeholder';
}
```

---

## Constants

### DEFAULT_AGENT_CONFIG

Default configuration for balanced performance.

```typescript
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistency: { mode: 'balanced', samples: 3, threshold: 0.7 },
  validationLevel: 'medium',
  enableSelfCritique: true,
  enablePhilosopher: false,
  enableGrokSecondOpinion: true,
  enableLearning: false,
  classicThresholds: {
    maxCost: 0.10,
    maxLatencyMs: 30000,
    minAccuracy: 0.8,
    maxSecurityScore: 0.2,
    minStability: 0.7,
  },
};
```

### STRICT_AGENT_CONFIG

Strict configuration for high-reliability scenarios.

```typescript
const STRICT_AGENT_CONFIG: AgentConfig = {
  consistency: { mode: 'thorough', samples: 5, threshold: 0.8 },
  validationLevel: 'strict',
  enableSelfCritique: true,
  enablePhilosopher: true,
  enableGrokSecondOpinion: true,
  enableLearning: true,
  classicThresholds: {
    maxCost: 0.25,
    maxLatencyMs: 60000,
    minAccuracy: 0.9,
    maxSecurityScore: 0.1,
    minStability: 0.85,
  },
};
```

### AGENT_NAMES

Human-readable agent names.

```typescript
const AGENT_NAMES: Record<AgentType, string> = {
  architect: 'The Architect',
  mechanic: 'The Mechanic',
  codeNinja: 'The Code Ninja',
  philosopher: 'The Philosopher',
};
```

---

## Error Codes

### AgentErrorCode

```typescript
enum AgentErrorCode {
  // Validation Errors (E001-E099)
  VALIDATION_FAILED = 'E001',
  PII_DETECTED = 'E002',
  FAKE_DATA_DETECTED = 'E003',
  INPUT_TOO_LONG = 'E004',
  
  // LLM Errors (E100-E149)
  LLM_API_ERROR = 'E100',
  LLM_TIMEOUT = 'E101',
  RATE_LIMIT_EXCEEDED = 'E102',
  TOKEN_LIMIT_EXCEEDED = 'E103',
  
  // Agent Errors (E150-E199)
  AGENT_NOT_FOUND = 'E150',
  AGENT_INVOCATION_FAILED = 'E151',
  PIPELINE_FAILED = 'E152',
  
  // System Errors (E200-E299)
  CONFIGURATION_ERROR = 'E200',
  STORAGE_ERROR = 'E201',
  TELEMETRY_ERROR = 'E202',
}
```

### isRecoverable

```typescript
function isRecoverable(code: AgentErrorCode): boolean
```

Returns true if the error is potentially recoverable (e.g., rate limits, timeouts).
