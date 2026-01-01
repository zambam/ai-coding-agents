# AI Coding Agents

Enterprise-grade AI coding agents with built-in reliability mechanisms and dual-LLM reasoning powered by OpenAI and xAI's Grok.

## Features

- **Four Specialized Agents**: Architect, Mechanic, Code Ninja, and Philosopher personas
- **Dual-LLM Reasoning**: OpenAI GPT-4 with optional Grok second opinions
- **Reliability Mechanisms**: Chain-of-Thought, self-consistency voting, reflection
- **CLASSic Metrics**: Cost, Latency, Accuracy, Security, Stability tracking
- **Self-Learning**: Outcome tracking, prompt optimization, memory retrieval
- **Enterprise Security**: PII detection, input validation, rate limiting
- **QA Automation**: Fake data scanner for CI/CD integration
- **CLI Tools**: Command-line interface for quick invocations

## Installation

```bash
# Install globally for CLI usage
npm install -g @ai-coding-agents/cli

# Or install locally as a dependency
npm install @ai-coding-agents/cli

# Or use with npx (no install needed)
npx @ai-coding-agents/cli scan ./src
```

## Quick Start

### Programmatic Usage

```typescript
import { Orchestrator, DEFAULT_AGENT_CONFIG } from '@ai-coding-agents/cli';

const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);

// Invoke a single agent
const result = await orchestrator.invokeAgent('architect', 'Design a REST API for user management');

console.log(result.response.recommendation);
console.log(result.response.confidence);
console.log(result.metrics);
```

### CLI Usage

```bash
# Invoke an agent
ai-agents invoke architect "Design a REST API for user management"

# Invoke with strict mode
ai-agents invoke mechanic "Debug this authentication issue" --strict

# Scan code for quality issues
ai-agents scan ./src --ext .ts,.tsx

# Scan with strict mode (fail on warnings)
ai-agents scan ./src --strict
```

## Agents

### The Architect
Designs robust, scalable system blueprints. Use for:
- System design and architecture decisions
- API design and data modeling
- Technology stack recommendations
- Scalability and performance planning

### The Mechanic
Diagnoses and repairs code issues. Use for:
- Debugging complex issues
- Root cause analysis
- Performance bottleneck identification
- Error handling improvements

### The Code Ninja
Executes fast, precise implementations. Use for:
- Quick code implementations
- Refactoring tasks
- Code optimization
- Feature additions

### The Philosopher
Evaluates decisions and identifies opportunities. Use for:
- Code review and critique
- Trade-off analysis
- Technical debt assessment
- Best practices validation

## Configuration

```typescript
import { Orchestrator } from '@ai-coding-agents/cli';
import type { AgentConfig } from '@ai-coding-agents/cli';

const config: AgentConfig = {
  consistency: {
    mode: 'balanced',        // 'fast' | 'balanced' | 'thorough'
    samples: 3,              // Number of samples for self-consistency
    threshold: 0.7,          // Minimum agreement threshold
  },
  validationLevel: 'medium', // 'low' | 'medium' | 'high' | 'strict'
  enableSelfCritique: true,  // Enable reflection step
  enablePhilosopher: true,   // Include Philosopher in pipeline
  enableGrokSecondOpinion: true, // Enable Grok dual-LLM
  enableLearning: true,      // Enable self-learning features
  classicThresholds: {
    maxCost: 0.10,
    maxLatencyMs: 30000,
    minAccuracy: 0.8,
    maxSecurityScore: 0.2,
    minStability: 0.7,
  },
};

const orchestrator = new Orchestrator(config);
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 |
| `XAI_API_KEY` | No | xAI API key for Grok second opinions |
| `AI_AGENTS_LOG_LEVEL` | No | Log level (trace/debug/info/warn/error) |
| `AI_AGENTS_LOG_FILE` | No | Path for file logging |

## QA Scanner

The built-in scanner detects:
- **Fake Data**: Placeholder names, test users, lorem ipsum
- **Security Issues**: Hardcoded secrets, API keys, tokens
- **PII Patterns**: SSN, credit card numbers, personal information

### Programmatic Usage

```typescript
import { FakeDataScanner } from '@ai-coding-agents/cli';

const scanner = new FakeDataScanner({
  strict: true,
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
});

const result = await scanner.scanDirectory('./src');

console.log('Passed:', result.passed);
console.log('Issues:', result.issues.length);
```

### GitHub Actions Integration

```yaml
name: AI Code Quality

on: [push, pull_request]

jobs:
  qa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install AI Agents CLI
        run: npm install -g @ai-coding-agents/cli
      
      - name: Run QA Scanner
        run: ai-agents scan ./src --ext .ts,.tsx
```

## Response Format

```typescript
interface AgentResponse {
  recommendation: string;
  confidence: number;
  reasoning: ReasoningStep[];
  alternatives?: string[];
  warnings?: string[];
  grokSecondOpinion?: {
    rating: number;
    agreements: string[];
    concerns: string[];
    improvements: string[];
  };
}

interface AgentResult {
  response: AgentResponse;
  metrics: CLASSicMetrics;
  runId: string;
  agent: string;
}
```

## Metrics

All invocations return CLASSic metrics:

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

## Logging

The package uses structured JSON logging with Pino:

```typescript
import { createLogger } from '@ai-coding-agents/cli';

const logger = createLogger({
  level: 'debug',
  runId: 'my-run-123',
});

logger.info('Agent invoked', { agent: 'architect', prompt: '...' });
```

## Error Handling

Errors are categorized with specific codes:

```typescript
import { AgentErrorCode, isRecoverable } from '@ai-coding-agents/cli';

try {
  const result = await orchestrator.invokeAgent('architect', prompt);
} catch (error) {
  if (error.code === AgentErrorCode.RATE_LIMIT_EXCEEDED) {
    // Retry after delay
  } else if (!isRecoverable(error.code)) {
    // Fatal error, don't retry
  }
}
```

## Self-Learning

Enable outcome tracking and prompt optimization (requires storage backend):

```typescript
import { Orchestrator, MemStorage } from '@ai-coding-agents/cli';

// Create storage for learning data
const storage = new MemStorage();

// Create orchestrator with learning enabled
const orchestrator = new Orchestrator(
  DEFAULT_AGENT_CONFIG,
  { enableLearning: true, enablePromptOptimization: true, enableMemoryContext: true },
  storage
);

// Invoke with learning features
const { result, runId, promptVersion } = await orchestrator.invokeWithLearning('architect', prompt);

// Record outcome after user interaction
await orchestrator.recordOutcome(runId, 'architect', 'accepted', {
  promptVersion,
  classicMetrics: result.metrics,
});

// Get learning insights
const insights = await orchestrator.getLearningInsights('architect');
console.log(insights.performanceSignal, insights.improvementSuggestions);

// Evaluate and promote winning prompts
const optimizationResult = await orchestrator.evaluateAndOptimize('architect');
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  AgentType,
  AgentConfig,
  AgentResponse,
  AgentResult,
  CLASSicMetrics,
  ReasoningStep,
  ScanResult,
  ScanIssue,
} from '@ai-coding-agents/cli';
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.
