# AI Agents QA System: Implementation Plan (Revised)

**Status:** PENDING USER APPROVAL  
**Date:** January 1, 2026  
**Revision:** 2.0 - Root Cause Analysis Focus

---

## Executive Summary

This revised plan identifies the **core system design flaws** that permit rushed, incomplete implementations. The issues are not just missing features - they are **permissive defaults** and **lack of blocking guardrails** baked into the configuration.

---

## Part 1: Core System Flaws Identified

### The Problem Statement

> "The system permits fast & loose action because nothing BLOCKS poor quality work."

### Root Cause: Permissive Default Configuration

**File: `shared/schema.ts` (lines 120-128)**

```typescript
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "fast",        // ⚠️ Only 2 reasoning paths (not enough)
  validationLevel: "medium",      // ⚠️ Allows medium-quality work
  enableSelfCritique: true,       // ✓ Good
  enablePhilosopher: false,       // ⚠️ No mandatory review!
  enableGrokSecondOpinion: false, // ⚠️ No second opinion by default!
  maxTokens: 4096,
  temperature: 0.7,               // ⚠️ Higher variability
};
```

**Problems with these defaults:**

| Setting | Default | Problem | Industry Best Practice |
|---------|---------|---------|----------------------|
| `consistencyMode` | "fast" | Only 2 paths = can still disagree 50/50 | "robust" (3+ paths with consensus) |
| `validationLevel` | "medium" | Doesn't require alternatives or risk analysis | "high" or "strict" |
| `enablePhilosopher` | false | No mandatory meta-review | Always enable for production work |
| `enableGrokSecondOpinion` | false | No second LLM opinion | Enable dual-LLM validation |
| `temperature` | 0.7 | High creativity = less determinism | 0.3-0.5 for code generation |

### Root Cause: Validation Doesn't Block

**File: `server/agents/evaluator.ts` (lines 41-88)**

The `validateResponse()` method **measures but doesn't block**:

```typescript
validateResponse(response: AgentResponse): ValidationResult {
  // Checks are made...
  // But function only RETURNS results
  // Nothing throws or blocks execution
  return { passed, failed, score };  // ← No enforcement!
}
```

**What should happen:** If validation fails, the agent should either:
1. Retry automatically
2. Throw an error blocking completion
3. Require human approval

### Root Cause: Self-Critique Threshold Too High

**File: `server/agents/prompt-engine.ts` (lines 172-200)**

```typescript
if (critique.severity === "high" || critique.improvements?.length > 2) {
  // Only improves if severity is HIGH or 3+ improvements
}
```

**Problem:** "Medium" severity issues pass through without improvement.

### Root Cause: No Pre-Execution Gates

The system has **no blocking guardrails**:

| Gate Type | Research Best Practice | Current Implementation |
|-----------|----------------------|------------------------|
| **Pre-hook** | Block if inputs don't meet criteria | ❌ None |
| **Validation Gate** | Block if outputs fail validation | ❌ Validation is informational only |
| **Approval Gate** | Require human sign-off for risky actions | ❌ None |
| **Post-hook** | Block if quality score < threshold | ❌ None |

---

## Part 2: Research-Backed Solutions

### Industry Best Practices (2024-2025)

From web research on LLM coding agent guardrails:

#### 1. Blocking Execution Mode
> "Blocking execution runs guardrails BEFORE the agent starts; if the guardrail triggers, the agent never executes."
— OpenAI Agents SDK

**Proposal:** Add pre-execution gates that block work without proper specification.

#### 2. Multi-Stage Validation
> "Pre-hooks filter inputs; post-hooks validate outputs for compliance before delivery."
— LangChain Guardrails

**Proposal:** Add validation hooks that throw on failure.

#### 3. Quality Threshold Enforcement
> "If validation fails, block completion and require retry or human approval."
— Codacy Guardrails

**Proposal:** Set minimum quality thresholds that block substandard work.

#### 4. Persistent Memory Pattern
> "Use CLAUDE.md or equivalent to prevent LLMs from contradicting earlier decisions."
— Agentic Coding Best Practices

**Proposal:** Strengthen replit.md as the authoritative configuration.

---

## Part 3: Proposed Configuration Changes

### New Recommended Defaults

```typescript
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "robust",       // ✓ 3+ paths with consensus required
  validationLevel: "high",         // ✓ Require alternatives and depth
  enableSelfCritique: true,        // ✓ Keep enabled
  enablePhilosopher: true,         // ✓ MANDATORY meta-review
  enableGrokSecondOpinion: true,   // ✓ Dual-LLM by default
  maxTokens: 4096,
  temperature: 0.4,                // ✓ Lower for determinism
};
```

### New Configuration Options Needed

```typescript
export interface AgentConfig {
  // Existing fields...
  
  // NEW: Blocking guardrails
  blockOnValidationFailure: boolean;      // Throw if validation fails
  minimumConfidenceThreshold: number;     // Block if confidence < threshold
  minimumConsensusScore: number;          // Block if paths disagree
  requirePhilosopherApproval: boolean;    // Must pass Philosopher review
  
  // NEW: Pre-execution gates
  requireSpecification: boolean;          // Block vague requests
  maxScopePerRequest: "small" | "medium" | "large";  // Limit scope
  
  // NEW: Quality thresholds
  minimumReasoningDepth: number;          // Min reasoning steps required
  requireAlternatives: boolean;           // Must provide alternatives
  requireRiskAnalysis: boolean;           // Must identify risks
}
```

### Proposed Strict Mode Configuration

For production/critical work:

```typescript
export const STRICT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "robust",
  validationLevel: "strict",
  enableSelfCritique: true,
  enablePhilosopher: true,
  enableGrokSecondOpinion: true,
  maxTokens: 4096,
  temperature: 0.3,
  
  // Blocking guardrails
  blockOnValidationFailure: true,
  minimumConfidenceThreshold: 0.7,
  minimumConsensusScore: 0.66,        // 2/3 paths must agree
  requirePhilosopherApproval: true,
  
  // Pre-execution gates
  requireSpecification: true,
  maxScopePerRequest: "medium",
  
  // Quality thresholds
  minimumReasoningDepth: 3,
  requireAlternatives: true,
  requireRiskAnalysis: true,
};
```

---

## Part 4: Structural Changes Required

### 4.1 Add Blocking Validation to Evaluator

**Current:** Returns results
**Proposed:** Throws on failure when configured

```typescript
// server/agents/evaluator.ts
validateResponse(response: AgentResponse, config: AgentConfig): ValidationResult {
  const result = this._validate(response);
  
  // NEW: Blocking mode
  if (config.blockOnValidationFailure && result.failed.length > 0) {
    throw new ValidationBlockedError(result.failed);
  }
  
  if (config.minimumConfidenceThreshold && 
      response.confidence < config.minimumConfidenceThreshold) {
    throw new ConfidenceBlockedError(response.confidence);
  }
  
  return result;
}
```

### 4.2 Add Pre-Execution Gates to BaseAgent

**Current:** Accepts any prompt
**Proposed:** Validates prompt before execution

```typescript
// server/agents/personas/base-agent.ts
async invoke(prompt: string): Promise<AgentInvocationResult> {
  // NEW: Pre-execution gate
  if (this.config.requireSpecification) {
    const isVague = this.checkIfVague(prompt);
    if (isVague) {
      throw new SpecificationRequiredError(
        "Request is too vague. Please provide specific requirements."
      );
    }
  }
  
  // Existing implementation...
}
```

### 4.3 Make Philosopher Approval Blocking

**Current:** Additive analysis
**Proposed:** Can block completion

```typescript
// server/agents/orchestrator.ts
async runPipeline(task: string): Promise<PipelineResult> {
  // ... existing pipeline ...
  
  // NEW: Philosopher approval gate
  if (this.config.requirePhilosopherApproval) {
    const philosopherResult = await this.philosopher.evaluate(implementation);
    
    if (!philosopherResult.approved) {
      throw new PhilosopherRejectedError(philosopherResult.concerns);
    }
  }
  
  return result;
}
```

### 4.4 Lower Self-Critique Threshold

**Current:** Only triggers on "high" severity
**Proposed:** Triggers on "medium" or higher

```typescript
// server/agents/prompt-engine.ts
// Change from:
if (critique.severity === "high" || critique.improvements?.length > 2) {
// To:
if (critique.severity !== "low" || critique.improvements?.length > 0) {
```

---

## Part 5: Quick Wins - Button/Command Approach

As the user suggested, create quick commands that enforce rigor:

### Command Palette for UI

```typescript
const QUICK_COMMANDS = {
  "qa:strict": {
    description: "Run with strict validation (blocking)",
    config: STRICT_AGENT_CONFIG,
  },
  "qa:review": {
    description: "Full 4-agent QA review",
    action: "orchestrator.runQAReview",
  },
  "qa:scan": {
    description: "Scan for fake/placeholder data",
    action: "scripts/scan-placeholders.ts",
  },
  "validate:all": {
    description: "Run all validations before commit",
    action: "npm run typecheck && npm run qa:scan",
  },
};
```

### API Shortcuts

```bash
# Quick strict invocation
POST /api/agents/invoke/strict
# Equivalent to: POST /api/agents/invoke with STRICT_AGENT_CONFIG

# Quick QA review
POST /api/agents/qa/full
# Runs all 4 agents with blocking validation

# Pre-commit check
POST /api/agents/qa/precommit
# Runs typecheck + placeholder scan + basic validation
```

### CLI Commands (package.json scripts)

```json
{
  "scripts": {
    "qa:strict": "tsx scripts/invoke-strict.ts",
    "qa:review": "tsx scripts/run-qa-review.ts",
    "qa:scan": "tsx scripts/scan-placeholders.ts",
    "qa:all": "npm run check && npm run qa:scan && npm run qa:review"
  }
}
```

---

## Part 6: Updated Implementation Phases

### Phase 1: Tighten Default Configuration
| Task | Impact | Effort |
|------|--------|--------|
| Change `validationLevel` default to "high" | Requires alternatives in all responses | Config change |
| Change `enablePhilosopher` default to true | Mandatory meta-review | Config change |
| Change `enableGrokSecondOpinion` default to true | Dual-LLM by default | Config change |
| Lower `temperature` to 0.4 | More deterministic outputs | Config change |
| Add `STRICT_AGENT_CONFIG` export | Easy access to strict mode | New constant |

### Phase 2: Add Blocking Guardrails
| Task | Impact | Effort |
|------|--------|--------|
| Add `blockOnValidationFailure` config option | Validation can throw | 1 hour |
| Add `minimumConfidenceThreshold` config option | Low confidence blocks | 1 hour |
| Add `minimumConsensusScore` config option | Disagreement blocks | 1 hour |
| Implement pre-execution vague-check | Blocks vague requests | 2 hours |

### Phase 3: Lower Self-Critique Threshold
| Task | Impact | Effort |
|------|--------|--------|
| Change severity check from "high" to "not low" | More improvements applied | Config change |
| Add minimum improvements threshold | Always apply some improvements | 30 min |

### Phase 4: Add QA Workflow to Orchestrator
| Task | Impact | Effort |
|------|--------|--------|
| Add `runQAReview()` method | Coordinated 4-agent review | 2 hours |
| Add `runPreCommitCheck()` method | Automated validation | 1 hour |
| Add blocking Philosopher approval gate | Final sign-off required | 1 hour |

### Phase 5: Quick Commands & UI Buttons
| Task | Impact | Effort |
|------|--------|--------|
| Create API shortcuts (/api/agents/invoke/strict) | Easy access | 1 hour |
| Add command palette to playground | UI for quick actions | 2 hours |
| Add npm scripts for QA commands | CLI access | 30 min |

### Phase 6: Fake Data Scanner
| Task | Impact | Effort |
|------|--------|--------|
| Create `scripts/scan-placeholders.ts` | Detect fake data | 1 hour |
| Wire into pre-commit hook | Block fake data commits | 30 min |

---

## Part 7: Success Criteria

The system is fixed when:

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| **No vague requests accepted** | Pre-execution gate triggers | 100% blocked |
| **Low confidence blocked** | Threshold check works | < 0.7 blocked |
| **Disagreement blocked** | Consensus check works | < 0.66 blocked |
| **Philosopher review mandatory** | All outputs reviewed | 100% reviewed |
| **Fake data blocked** | Scanner runs on commit | 0 violations |
| **TypeScript errors blocked** | Check runs on commit | 0 errors |
| **Validation failures block** | Evaluator throws | 0 unhandled failures |

---

## Part 8: Summary of Core Changes

### What Needs to Change

1. **DEFAULT_AGENT_CONFIG** - Tighten all defaults
2. **Evaluator.validateResponse()** - Add blocking mode
3. **PromptEngine.applySelfCritique()** - Lower threshold
4. **BaseAgent.invoke()** - Add pre-execution gates
5. **Orchestrator** - Add QA workflow and blocking gates
6. **New Scripts** - Placeholder scanner, pre-commit checks
7. **New API Routes** - Quick commands for strict mode

### What Stays the Same

- Agent personas and capabilities
- Chain-of-Thought reasoning structure
- CLASSic metrics collection
- Grok integration (already fixed)
- Frontend playground (just needs command buttons)

---

## Approval Request

**Please confirm which phases to implement:**

1. [ ] Phase 1: Tighten Default Configuration
2. [ ] Phase 2: Add Blocking Guardrails  
3. [ ] Phase 3: Lower Self-Critique Threshold
4. [ ] Phase 4: Add QA Workflow to Orchestrator
5. [ ] Phase 5: Quick Commands & UI Buttons
6. [ ] Phase 6: Fake Data Scanner

**Estimated Total Effort:** 12-15 hours (more thorough than previous estimate)

**Risk Level:** Medium (changes default behavior - existing users may need to adjust)

---

*This revised plan focuses on the ROOT CAUSES: permissive defaults and lack of blocking guardrails. The previous plan addressed symptoms; this plan addresses the disease.*
