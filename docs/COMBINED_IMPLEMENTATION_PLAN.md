# Combined Implementation Plan

## AI Coding Agents Platform - Integrated Roadmap

**Version:** 1.0  
**Date:** January 2026  
**Status:** Active  

---

## Executive Summary

This plan integrates three major feature streams into a unified implementation roadmap:

1. **Security & QA** - Enterprise-grade security hardening, privacy controls
2. **Self-Learning** - Outcome tracking, prompt optimization, memory store
3. **GitHub Logging** - Consumer-facing logging/debugging for NPM package

All three streams share common infrastructure (logging, telemetry, data storage) and are sequenced to maximize code reuse and minimize rework.

---

## Current State (Completed)

### Phase 1: Logging + Debugging Infrastructure (DONE)
- Pino-based structured JSON logging
- Error taxonomy with AgentErrorCode enum (E001-E205)
- Run ID tracking across all logs
- Blocking validation with fake data detection, PII blocking
- CLASSic threshold enforcement (throws ValidationError)
- 107 regression tests with real pino payload verification

---

## Integrated Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: FOUNDATION (Weeks 1-3)                                            │
│  Shared infrastructure for all three streams                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  2A. Data Storage Layer           │  2B. Consumer Logger API               │
│  - Run history persistence        │  - createAgentLogger() factory         │
│  - Outcome tracking schema        │  - Environment variable config         │
│  - Feedback storage               │  - Pretty print / file destinations    │
│                                   │                                        │
│  2C. Security Hardening           │  2D. Privacy Controls                  │
│  - Semgrep CI integration         │  - PII redaction enforcement           │
│  - Dependency scanning            │  - Consent framework design            │
│  - Input sanitization             │  - Data retention policies             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: FEEDBACK & DIAGNOSTICS (Weeks 4-6)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  3A. Outcome Tracking             │  3B. Debug Toolkit                     │
│  - Accept/reject/edit signals     │  - DebugToolkit class                  │
│  - Edit distance measurement      │  - captureLastRun() diagnostics        │
│  - Grok disagreement logging      │  - exportRunBundle() for support       │
│                                   │                                        │
│  3C. Human Feedback UI            │  3D. CLI & Endpoints                   │
│  - Thumbs up/down component       │  - npx ai-agents diagnostics           │
│  - Tag selection (verbose, etc)   │  - Express diagnostics router          │
│  - Star rating                    │  - Health check endpoints              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: LEARNING INFRASTRUCTURE (Weeks 7-10)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  4A. Prompt Versioning            │  4B. Memory Store (RAG)                │
│  - Prompt variant schema          │  - Vector storage setup                │
│  - Shadow mode testing            │  - Task embedding pipeline             │
│  - A/B test infrastructure        │  - Similar task retrieval              │
│  - Statistical significance       │  - Few-shot injection                  │
│                                   │                                        │
│  4C. Meta-Evaluation              │  4D. Analytics Dashboard               │
│  - Weekly Philosopher analysis    │  - Acceptance rate charts              │
│  - Automated insight reports      │  - Agent performance comparison        │
│  - Prompt recommendations         │  - Trend visualization                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: ML READINESS (Weeks 11-14)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  5A. Data Pipeline                │  5B. ML Preparation                    │
│  - Training data extraction       │  - Readiness checklist validation      │
│  - Privacy scrubbing pipeline     │  - Task router classifier (prototype)  │
│  - Labeled dataset curation       │  - Quality predictor (prototype)       │
│  - Export format for fine-tuning  │  - Shadow mode evaluation              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Foundation (Weeks 1-3)

### 2A. Data Storage Layer
**Purpose**: Shared persistence for outcomes, feedback, and learning data

| Task | Description | Effort |
|------|-------------|--------|
| 2A.1 | Design RunOutcome schema with accept/reject/edit status | 2h |
| 2A.2 | Create HumanFeedback schema with tags and ratings | 2h |
| 2A.3 | Add PromptVariant schema for versioning | 2h |
| 2A.4 | Implement storage interface (MemStorage + PostgreSQL) | 4h |
| 2A.5 | Add retention policy enforcement | 2h |

**Deliverables**:
```typescript
// shared/schema.ts additions
interface RunOutcome {
  runId: string;
  agentType: AgentType;
  outcomeStatus: 'accepted' | 'rejected' | 'edited' | 'ignored';
  editDistance?: number;
  timeToDecision: number;
  grokAgreed: boolean;
  classicMetrics: CLASSicMetrics;
  createdAt: Date;
}

interface HumanFeedback {
  runId: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  comment?: string;
  submittedAt: Date;
}

interface PromptVariant {
  id: string;
  agentType: AgentType;
  version: number;
  promptText: string;
  status: 'shadow' | 'ab_test' | 'promoted' | 'retired';
  metrics: PromptMetrics;
}
```

### 2B. Consumer Logger API
**Purpose**: Enable GitHub/NPM users to configure logging

| Task | Description | Effort |
|------|-------------|--------|
| 2B.1 | Add LoggerConfig type with all options | 1h |
| 2B.2 | Implement createAgentLogger(config?) factory | 2h |
| 2B.3 | Add environment variable resolution | 2h |
| 2B.4 | Implement file destination handler | 2h |
| 2B.5 | Add pretty print formatter | 1h |
| 2B.6 | Export from src/index.ts | 1h |

**Environment Variables**:
```
AI_AGENTS_LOG_LEVEL=debug
AI_AGENTS_DEBUG=true
AI_AGENTS_LOG_DEST=file
AI_AGENTS_LOG_FILE=./logs/agents.log
AI_AGENTS_PRETTY=true
AI_AGENTS_REDACT=true
```

### 2C. Security Hardening
**Purpose**: Enterprise-grade security controls

| Task | Description | Effort |
|------|-------------|--------|
| 2C.1 | Add Semgrep to CI pipeline | 2h |
| 2C.2 | Configure dependency vulnerability scanning | 2h |
| 2C.3 | Implement input sanitization layer | 3h |
| 2C.4 | Add prompt injection detection patterns | 2h |
| 2C.5 | Create security event audit log | 2h |
| 2C.6 | Document 16-point security checklist | 2h |

**Security Checklist**:
1. [ ] Input validation on all API endpoints
2. [ ] Output sanitization before return
3. [ ] Rate limiting enabled
4. [ ] Authentication required for sensitive endpoints
5. [ ] API keys never logged
6. [ ] PII redaction in all logs
7. [ ] Prompt injection patterns blocked
8. [ ] Dependency vulnerabilities scanned
9. [ ] Semgrep static analysis passing
10. [ ] HTTPS enforced
11. [ ] CORS configured properly
12. [ ] Error messages don't leak internals
13. [ ] Audit log for security events
14. [ ] Session management secure
15. [ ] File uploads validated
16. [ ] SQL injection prevented

### 2D. Privacy Controls
**Purpose**: GDPR/CCPA compliant data handling

| Task | Description | Effort |
|------|-------------|--------|
| 2D.1 | Strengthen PII detection patterns | 2h |
| 2D.2 | Implement redaction for all log outputs | 2h |
| 2D.3 | Design user consent framework | 3h |
| 2D.4 | Add data retention policy (90 days default) | 2h |
| 2D.5 | Create data export endpoint (GDPR) | 3h |
| 2D.6 | Add data deletion endpoint (right to forget) | 2h |

---

## Phase 3: Feedback & Diagnostics (Weeks 4-6)

### 3A. Outcome Tracking
**Purpose**: Capture success/failure signals for learning

| Task | Description | Effort |
|------|-------------|--------|
| 3A.1 | Add outcome tracking to agent response flow | 3h |
| 3A.2 | Implement edit distance calculation | 2h |
| 3A.3 | Track time-to-decision metric | 1h |
| 3A.4 | Log Grok disagreements as learning signals | 2h |
| 3A.5 | Store outcomes in persistence layer | 2h |
| 3A.6 | Add acceptance rate calculation | 2h |

### 3B. Debug Toolkit
**Purpose**: Consumer debugging utilities

| Task | Description | Effort |
|------|-------------|--------|
| 3B.1 | Create DebugToolkit class | 2h |
| 3B.2 | Implement run history buffer (last N runs) | 2h |
| 3B.3 | Add captureLastRun() with diagnostics | 2h |
| 3B.4 | Add getValidationSummary(runId) | 1h |
| 3B.5 | Implement exportRunBundle() with sanitization | 3h |
| 3B.6 | Add tests for Debug Toolkit | 2h |

### 3C. Human Feedback UI
**Purpose**: Structured user feedback collection

| Task | Description | Effort |
|------|-------------|--------|
| 3C.1 | Create FeedbackPanel component | 3h |
| 3C.2 | Add thumbs up/down buttons | 1h |
| 3C.3 | Implement tag selector | 2h |
| 3C.4 | Add star rating component | 1h |
| 3C.5 | Create feedback API endpoint | 2h |
| 3C.6 | Link feedback to run records | 2h |

### 3D. CLI & Endpoints
**Purpose**: Diagnostics for GitHub consumers

| Task | Description | Effort |
|------|-------------|--------|
| 3D.1 | Add bin entry to package.json | 1h |
| 3D.2 | Create cli/diagnostics.ts command | 2h |
| 3D.3 | Implement health checks (API connectivity) | 2h |
| 3D.4 | Create Express diagnostics router | 2h |
| 3D.5 | Add /health, /config, /last-run endpoints | 2h |
| 3D.6 | Add optional auth middleware | 1h |

---

## Phase 4: Learning Infrastructure (Weeks 7-10)

### 4A. Prompt Versioning
**Purpose**: A/B test and promote prompt improvements

| Task | Description | Effort |
|------|-------------|--------|
| 4A.1 | Create prompt versioning system | 3h |
| 4A.2 | Implement shadow mode testing | 3h |
| 4A.3 | Build A/B test traffic splitting | 3h |
| 4A.4 | Add statistical significance calculation | 3h |
| 4A.5 | Create promotion/rollback automation | 3h |
| 4A.6 | Add prompt version audit log | 2h |

### 4B. Memory Store (RAG)
**Purpose**: Learn from successful past responses

| Task | Description | Effort |
|------|-------------|--------|
| 4B.1 | Set up vector storage (pgvector) | 4h |
| 4B.2 | Implement task embedding pipeline | 3h |
| 4B.3 | Create similar task retrieval function | 3h |
| 4B.4 | Add quality filtering (only high-rated) | 2h |
| 4B.5 | Integrate retrieved examples into prompts | 3h |
| 4B.6 | Add memory retention/cleanup | 2h |

### 4C. Meta-Evaluation
**Purpose**: Philosopher analyzes system performance

| Task | Description | Effort |
|------|-------------|--------|
| 4C.1 | Create scheduled weekly analysis job | 2h |
| 4C.2 | Implement pattern detection queries | 3h |
| 4C.3 | Generate automated insight reports | 3h |
| 4C.4 | Route suggestions to prompt versioning | 2h |
| 4C.5 | Create human review workflow | 3h |

### 4D. Analytics Dashboard
**Purpose**: Visualize learning progress

| Task | Description | Effort |
|------|-------------|--------|
| 4D.1 | Create analytics page | 3h |
| 4D.2 | Add acceptance rate chart | 2h |
| 4D.3 | Add agent comparison view | 2h |
| 4D.4 | Add trend lines over time | 2h |
| 4D.5 | Add feedback summary panel | 2h |

---

## Phase 5: ML Readiness (Weeks 11-14)

### 5A. Data Pipeline
**Purpose**: Prepare training data for future ML

| Task | Description | Effort |
|------|-------------|--------|
| 5A.1 | Create training data extraction job | 4h |
| 5A.2 | Implement privacy scrubbing pipeline | 4h |
| 5A.3 | Build labeled dataset curation tools | 4h |
| 5A.4 | Create export format for fine-tuning | 3h |
| 5A.5 | Document data lineage | 2h |

### 5B. ML Preparation
**Purpose**: Prototype ML components for future use

| Task | Description | Effort |
|------|-------------|--------|
| 5B.1 | Create ML readiness checklist validation | 2h |
| 5B.2 | Prototype task router classifier | 6h |
| 5B.3 | Prototype quality predictor | 6h |
| 5B.4 | Implement shadow mode for ML models | 4h |
| 5B.5 | Document ML adoption criteria | 2h |

---

## Timeline Summary

| Phase | Weeks | Focus | Key Deliverables |
|-------|-------|-------|------------------|
| 2 | 1-3 | Foundation | Storage, Logger API, Security, Privacy |
| 3 | 4-6 | Feedback | Outcomes, Debug Toolkit, UI, CLI |
| 4 | 7-10 | Learning | Prompts, Memory, Meta-Eval, Dashboard |
| 5 | 11-14 | ML Prep | Data Pipeline, Prototypes |

**Total Effort**: ~14 weeks

---

## Success Metrics

| Metric | Baseline | Phase 3 Target | Phase 5 Target |
|--------|----------|----------------|----------------|
| Acceptance Rate | TBD | +10% | +25% |
| Avg Edit Distance | TBD | -15% | -40% |
| Security Scan Passing | No | Yes | Yes |
| Human Feedback Collected | 0 | 500+ | 10,000+ |
| Prompt Variants Tested | 0 | 10+ | 50+ |

---

## Dependencies

```
Phase 1 (DONE)
    │
    ├── Phase 2A (Storage) ─────┬──► Phase 3A (Outcomes)
    │                           │
    ├── Phase 2B (Logger API) ──┼──► Phase 3B (Debug Toolkit)
    │                           │
    ├── Phase 2C (Security) ────┘
    │
    └── Phase 2D (Privacy) ─────────► Phase 4B (Memory Store)
                                          │
                                          ▼
                                    Phase 5A (Data Pipeline)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data volume insufficient for ML | Gate ML on 10,000+ labeled examples |
| Privacy breach | PII redaction by default, consent required |
| Prompt degradation | A/B test with rollback capability |
| Scope creep | Phase gates with clear deliverables |

---

## Next Steps

1. **Immediate**: Begin Phase 2A (Data Storage Layer)
2. **Week 1**: Parallel work on 2B (Logger API) and 2C (Security)
3. **Week 2**: Complete 2D (Privacy) and integration tests
4. **Week 3**: Phase 2 sign-off, begin Phase 3
