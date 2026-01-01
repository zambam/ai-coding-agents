# The Four Horsemen: AI Coding Agents Platform

## Executive Summary

The Four Horsemen is a multi-agent AI system for software creation, designed for Replit's collaborative, cloud-based environment. It features four specialized personas (Conquest, War, Famine, Death) with dual-LLM reasoning powered by OpenAI and xAI's Grok for innovative, uncensored second opinions.

## Architecture Overview

### The Four Horsemen Personas

| Horseman | Role | Specialty |
|----------|------|-----------|
| **Conquest** | The Architect | System design, component decomposition, scalability analysis |
| **War** | The Mechanic | Bug diagnosis, performance optimization, dependency resolution |
| **Famine** | The Code Ninja | Lean implementation, refactoring, test writing |
| **Death** | The Philosopher | Meta-evaluation, bias detection, opportunity mapping |

### Core Architecture: Personas and Shared Services

**Strengths:** 
- Balanced team mirroring the SDLC with clear role separation
- Conquest's blueprints feed Famine's implementations, which War debugs, while Death provides meta-oversight
- Shared services (Orchestrator, PromptEngine, Evaluator) enable seamless workflows

**Enhancements Implemented:**
- Inter-agent communication via JSON messages for coordination
- Dual-LLM integration with Grok for uncensored second opinions
- ReplitMdParser extended to parse project configurations

### Reliability Mechanisms (2025 Best Practices)

| Mechanism | 2025 Research Tie-In | Implementation |
|-----------|----------------------|----------------|
| Chain-of-Thought | Anthropic's coordination principles | Visual step-by-step reasoning with logging |
| Self-Consistency Voting | Shakudo's framework rankings | Configurable modes: none (1 path), fast (2 paths), robust (3+ paths) |
| Reflection Layer | Galileo AI's self-eval metrics | Self-critique with bias checks |
| CLASSic Metrics | DeepEval's agent-specific measures | Cost, Latency, Accuracy, Security, Stability on every call |
| Grok Second Opinion | Dual-LLM validation | Uncensored analysis via xAI for innovative perspectives |

### CLASSic Metrics Framework

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

## Dual-LLM Architecture

### Primary LLM: OpenAI GPT-4o
- Main reasoning engine for all four horsemen
- Chain-of-Thought and self-consistency processing
- Code generation and analysis

### Secondary LLM: xAI Grok
- Uncensored second opinion on agent responses
- Identifies risks and improvements the primary LLM might miss
- Provides independent quality ratings (1-10)
- Challenges assumptions without censorship

### Benefits of Dual-LLM Approach
1. **Diverse Perspectives**: Different training data and biases lead to complementary insights
2. **Quality Validation**: Second opinion catches errors and oversights
3. **Innovation**: Grok's uncensored nature suggests creative solutions
4. **Reliability**: Consensus between LLMs increases confidence

## Configuration via replit.md

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
- All functions must have explicit return types

## Security Constraints
- No eval() or dynamic code execution
- Sanitize all user inputs
- Use parameterized queries for database access
```

## API Design

### Streaming Endpoint (SSE)
```
POST /api/agents/invoke/stream
Content-Type: application/json

{
  "agentType": "architect",
  "prompt": "Design a real-time collaborative editor",
  "config": {
    "consistencyMode": "fast",
    "enableGrokSecondOpinion": true
  }
}

Response (Server-Sent Events):
event: status
data: {"status": "started", "agent": "architect"}

event: reasoning
data: {"step": {"step": 1, "thought": "..."}, "progress": 0.25}

event: metrics
data: {"metrics": {...}}

event: complete
data: {"response": {...}, "metrics": {...}}
```

## Implementation Status

### Completed
- [x] Four Horsemen personas with specialized system prompts
- [x] PromptEngine with CoT, self-consistency, reflection
- [x] Evaluator with CLASSic metrics
- [x] Grok integration for dual-LLM second opinions
- [x] SSE streaming for real-time reasoning visualization
- [x] Interactive playground with progressive updates
- [x] Rebranded UI with Four Horsemen theme

### Future Enhancements (From Grok Feedback)
- [ ] Guardrail Service for deceptive behavior monitoring
- [ ] Ensemble modes with multiple LLMs voting
- [ ] Dashboard for post-mortem analysis
- [ ] YAML sections in replit.md for structured configs
- [ ] Simulation Mode for testing configs without execution
- [ ] Python package distribution via PyPI

## Risk Mitigation

Based on 2025 Replit incidents analysis:
1. **Data Deletion Prevention**: All destructive operations require explicit confirmation
2. **Fake Report Detection**: Death (Philosopher) meta-evaluates all agent outputs
3. **Rate Limiting**: Built-in token tracking prevents runaway costs
4. **Security Scanning**: Every code generation checked for vulnerabilities

## Competitive Advantage

Compared to tools like Windsurf or Emergent:
- **Dual-LLM Reasoning**: Unique Grok integration for uncensored second opinions
- **Replit-Native**: Deep integration with replit.md configuration
- **Transparency**: Full reasoning chain visibility with CLASSic metrics
- **Lean Design**: Optimized for Replit's resource-constrained environment

## Conclusion

The Four Horsemen represents a robust, innovative multi-agent system that addresses real-world AI coding challenges. By combining specialized personas with dual-LLM reasoning and comprehensive reliability mechanisms, it positions itself ahead of current AI coding tools while maintaining the lean, configurable philosophy suited for Replit's collaborative environment.
