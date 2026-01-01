# AI Coding Agents

AI-powered coding agents with dual-LLM reasoning (OpenAI GPT-4o + xAI Grok).

## Features

- **Four Specialized Agents:**
  - **The Architect** - Designs robust, scalable system blueprints
  - **The Mechanic** - Diagnoses and repairs code issues
  - **The Code Ninja** - Executes fast, precise implementations
  - **The Philosopher** - Evaluates decisions and identifies opportunities

- **Reliability Mechanisms:**
  - Chain-of-Thought (CoT) reasoning
  - Self-consistency voting across multiple reasoning paths
  - Self-critique and improvement loops
  - CLASSic metrics (Cost, Latency, Accuracy, Security, Stability)

- **Dual-LLM Second Opinion:**
  - Primary: OpenAI GPT-4o
  - Secondary: xAI Grok for independent review

## Installation

```bash
npm install ai-coding-agents
```

## Quick Start

```typescript
import { Orchestrator, STRICT_AGENT_CONFIG } from 'ai-coding-agents';

// Create orchestrator with strict validation
const orchestrator = new Orchestrator(STRICT_AGENT_CONFIG);

// Run a full pipeline (Architect -> Code Ninja -> Mechanic -> Philosopher)
const result = await orchestrator.runPipeline("Build a user authentication system");

console.log(result.blueprint.response.recommendation);
console.log(result.implementation.response.codeOutput);
```

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

## QA Review

Run a full QA review using all four agents:

```typescript
const qaResult = await orchestrator.runQAReview("full");

console.log(qaResult.architectAudit.response);
console.log(qaResult.mechanicDiagnosis.response);
console.log(qaResult.codeNinjaRemediation.response);
console.log(qaResult.philosopherValidation.response);
```

## Environment Variables

```bash
# Required for OpenAI
OPENAI_API_KEY=your-openai-key
# or
AI_INTEGRATIONS_OPENAI_API_KEY=your-openai-key

# Optional for Grok second opinions
XAI_API_KEY=your-xai-key
```

## Replit.md Configuration

The package reads configuration from `replit.md` in your project root:

```markdown
## Agent Configuration

consistency.mode: robust
validationLevel: strict
enableSelfCritique: true
enablePhilosopher: true
enableGrokSecondOpinion: true

## Code Standards

- TypeScript strict mode
- No implicit any types
- Functional components with hooks
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
} from 'ai-coding-agents';
```

## License

MIT
