# QA, Security, and Privacy Enhancement Proposal

**Document Version:** 1.0  
**Date:** January 2026  
**Status:** Pending Review  
**Related Documentation:** 
- [QA System Proposal](./QA_SYSTEM_PROPOSAL.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Project Configuration](../replit.md)

---

## Executive Summary

This proposal outlines a comprehensive enhancement program for the AI Coding Agents platform covering Quality Assurance, Debugging Infrastructure, Logging Systems, Security Hardening, and Privacy Protection. The goal is to transform the platform from a development prototype into a production-ready, enterprise-grade NPM package.

---

## 1. Quality Assurance Review

### 1.1 Current State Assessment

| Component | Status | Gap |
|-----------|--------|-----|
| CLASSic Metrics Evaluator | Implemented | Metrics are advisory only, not blocking |
| Self-Consistency Voting | Implemented | No minimum consensus threshold enforced |
| Fake/Placeholder Detection | Proposed in QA_SYSTEM_PROPOSAL.md | Not yet implemented |
| Validation Pipeline | Implemented | Failures don't halt execution |
| Regression Testing | Not present | No automated test suite |

### 1.2 Recommended Improvements

#### Priority 1: Blocking Validation Gates
```typescript
// Current: Validations are advisory
response.validations = { passed: [...], failed: [...] };

// Proposed: Validations block on strict mode
if (config.validationLevel === "strict" && validation.failed.length > 0) {
  throw new ValidationError(validation.failed);
}
```

#### Priority 2: Fake Data Detection (from QA_SYSTEM_PROPOSAL.md Section 2.2)
Implement automated scanning for:
- Lorem ipsum / placeholder text patterns
- `example.com`, `test@`, `foo`, `bar` patterns
- TODO/FIXME markers in production output
- Mock/sample data indicators

#### Priority 3: CLASSic Score Thresholds
| Agent | Min Accuracy | Max Latency | Max Cost |
|-------|-------------|-------------|----------|
| Architect | 0.85 | 30s | $0.10 |
| Mechanic | 0.90 | 20s | $0.08 |
| Code Ninja | 0.88 | 25s | $0.12 |
| Philosopher | 0.80 | 35s | $0.15 |

---

## 2. Debugging Infrastructure

### 2.1 Current State
- Minimal error handling in PromptEngine and BaseAgent
- No structured error taxonomy
- No debug telemetry or tracing
- Console.error used without context

### 2.2 Proposed Debug Harness

#### Error Taxonomy
```typescript
enum AgentErrorCode {
  // Network Errors
  OPENAI_CONNECTION_FAILED = "E001",
  GROK_CONNECTION_FAILED = "E002",
  TIMEOUT_EXCEEDED = "E003",
  
  // Validation Errors
  PROMPT_INJECTION_DETECTED = "E101",
  RESPONSE_VALIDATION_FAILED = "E102",
  CONSISTENCY_THRESHOLD_NOT_MET = "E103",
  
  // Processing Errors
  JSON_PARSE_FAILED = "E201",
  COT_REASONING_INCOMPLETE = "E202",
  SELF_CRITIQUE_LOOP_EXCEEDED = "E203",
}
```

#### Debug Trace Bundle
For failed runs, capture:
- Full prompt chain (redacted)
- All CoT reasoning attempts
- Self-critique iterations
- Evaluator scores
- Grok comparison (if enabled)
- Timing breakdowns per step

#### Feature Flags
```typescript
interface DebugConfig {
  enableDeepTracing: boolean;      // Capture all intermediate states
  enableReproductionBundles: boolean; // Save failed run data
  traceSamplingRate: number;       // 0.0 - 1.0 for production
  maxTraceRetention: string;       // "24h", "7d", etc.
}
```

---

## 3. Logging System

### 3.1 Current State
- No structured logging
- Console statements scattered throughout
- Stack traces may leak to stdout
- No log levels or filtering

### 3.2 Proposed Logging Architecture

#### Log Schema (JSON)
```json
{
  "timestamp": "2026-01-01T12:00:00.000Z",
  "level": "INFO|WARN|ERROR",
  "runId": "uuid-v4",
  "agentType": "architect|mechanic|codeNinja|philosopher",
  "action": "invoke|design|diagnose|implement|evaluate",
  "outcome": "success|failure|partial",
  "metrics": {
    "latencyMs": 1234,
    "tokensUsed": 567,
    "estimatedCost": 0.02
  },
  "validations": {
    "passed": 5,
    "failed": 0
  },
  "errorCode": null,
  "promptHash": "sha256:abc123..."  // Never log raw prompts
}
```

#### Log Levels
| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | Blocking failures | API connection lost |
| WARN | Non-blocking issues | Validation failed but continued |
| INFO | Normal operations | Agent invocation complete |
| DEBUG | Development only | CoT step details |
| TRACE | Deep debugging | Full request/response |

#### Recommended Libraries
- **pino** - Fast, structured JSON logging
- **winston** - Flexible, multiple transports

---

## 4. Security Review

### 4.1 Current State Assessment

| Security Control | Status | Risk Level |
|-----------------|--------|------------|
| API Key Handling | Direct env read | Medium |
| Prompt Injection Detection | Implemented (not enforced) | Medium |
| Response Sanitization | Basic patterns | Low |
| Rate Limiting | Not implemented | Medium |
| Secure Defaults | Permissive (validationLevel: "medium") | Medium |
| Secret Rotation | Not supported | Low |

### 4.2 Security Findings

#### Finding 1: Permissive Default Configuration
**Reference:** `src/constants.ts`, `shared/schema.ts`
```typescript
// Current defaults (RISKY)
DEFAULT_AGENT_CONFIG = {
  validationLevel: "medium",      // Should be "strict"
  enablePhilosopher: false,       // Should be true
  enableGrokSecondOpinion: false, // Should be true
}
```

**Recommendation:** Change defaults to strict mode or require explicit opt-out.

#### Finding 2: Non-Enforced Prompt Injection Detection
**Reference:** `src/agents/evaluator.ts`
```typescript
// Current: Detection only, no enforcement
checkSecurity(response): { promptInjectionBlocked: boolean; ... }
```

**Recommendation:** Wrap in enforcement layer that throws on detection.

#### Finding 3: No Rate Limiting
**Reference:** `server/routes.ts`

**Recommendation:** Implement per-IP and per-API-key rate limits:
- 100 requests/minute for authenticated users
- 10 requests/minute for unauthenticated

#### Finding 4: API Key Governance
**Reference:** `src/agents/grok-client.ts`, `src/agents/prompt-engine.ts`

**Recommendations:**
- Validate API keys on startup
- Support key rotation without restart
- Log key usage (not values) for audit

### 4.3 Proposed Security Hardening

```typescript
// Secure wrapper for all agent invocations
async function secureInvoke(agent: BaseAgent, prompt: string): Promise<Result> {
  // 1. Rate limit check
  await rateLimiter.check(context.clientId);
  
  // 2. Input sanitization
  const sanitizedPrompt = sanitize(prompt);
  
  // 3. Invoke agent
  const result = await agent.invoke(sanitizedPrompt);
  
  // 4. Enforce security checks
  const security = evaluator.checkSecurity(result.response);
  if (!security.promptInjectionBlocked || !security.safeCodeGenerated) {
    throw new SecurityError("Response failed security validation");
  }
  
  // 5. Output sanitization
  return sanitizeOutput(result);
}
```

---

## 5. Privacy Assessment

### 5.1 Data Flow Analysis

```
User Prompt → API → Agent Processing → LLM (OpenAI/Grok) → Response → User
                 ↓
            Logging System
                 ↓
            Metrics Storage
```

### 5.2 Privacy Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| PII in prompts | High | Prompt masking layer |
| Prompt logging | High | Hash-only logging |
| LLM data retention | Medium | Document third-party policies |
| Metrics containing sensitive data | Medium | Field-level redaction |

### 5.3 Proposed Privacy Controls

#### Prompt Redaction Modes
```typescript
enum RedactionMode {
  NONE = "none",           // Development only
  HASH_ONLY = "hash_only", // Log SHA-256 hash only
  FULL = "full",           // No prompt data logged
}
```

#### PII Detection Patterns
```typescript
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  // Email
  /\b\d{3}-\d{2}-\d{4}\b/,                                 // SSN
  /\b\d{16}\b/,                                            // Credit card
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,                        // Phone
];
```

#### Data Retention Policy
| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| Execution logs | 30 days | Debugging window |
| Metrics data | 90 days | Performance analysis |
| Error traces | 14 days | Incident response |
| Prompt hashes | 7 days | Replay detection |

#### User Consent Framework
```typescript
interface ConsentConfig {
  allowPromptLogging: boolean;      // Explicit opt-in
  allowMetricsCollection: boolean;  // Default: true
  allowThirdPartyLLM: boolean;      // Document OpenAI/Grok data handling
  dataRetentionDays: number;        // User-configurable
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Install structured logging library (pino)
- [ ] Implement error taxonomy and debug harness
- [ ] Add run ID tracking across all operations
- [ ] Create blocking validation wrapper

### Phase 2: Security Hardening (Week 3-4)
- [ ] Enforce prompt injection detection
- [ ] Implement rate limiting
- [ ] Change default configuration to strict mode
- [ ] Add API key validation and rotation support

### Phase 3: Privacy Enhancement (Week 5-6)
- [ ] Implement prompt masking layer
- [ ] Add PII detection and redaction
- [ ] Configure data retention policies
- [ ] Create user consent framework

### Phase 4: QA Automation (Week 7-8)
- [ ] Implement fake data detection scanner
- [ ] Add CLASSic score threshold enforcement
- [ ] Create regression test harness
- [ ] Set up CI/CD quality gates

---

## 7. Approval Checklist

- [ ] QA improvements approved
- [ ] Debugging infrastructure design approved
- [ ] Logging schema approved
- [ ] Security hardening plan approved
- [ ] Privacy controls approved
- [ ] Implementation timeline approved
- [ ] Resource allocation confirmed

---

## Appendix A: Package Dependencies to Add

```json
{
  "dependencies": {
    "pino": "^8.0.0",
    "pino-pretty": "^10.0.0",
    "rate-limiter-flexible": "^3.0.0",
    "uuid": "^9.0.0"
  }
}
```

## Appendix B: Configuration Template

Add to consuming project's `replit.md`:

```markdown
## Security Configuration

validationLevel: strict
enableSecurityEnforcement: true
enablePromptInjectionBlocking: true
rateLimitPerMinute: 100

## Privacy Configuration

promptRedactionMode: hash_only
enablePiiDetection: true
dataRetentionDays: 30
requireUserConsent: false

## Logging Configuration

logLevel: INFO
enableStructuredLogging: true
logDestination: stdout
```
