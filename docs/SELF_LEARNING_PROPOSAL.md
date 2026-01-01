# Self-Learning AI Agents System

## Executive Summary

Enable the AI Coding Agents platform to learn from its own outputs and improve over time through a closed-loop learning pipeline that captures outcomes, codifies feedback, and continuously tunes prompts and policies.

## Core Learning Mechanisms

### 1. Outcome Tracking & Feedback Loop

**What it does**: Capture whether each agent response was successful, accepted, or needed revision.

```
Run Invocation → Response → User Action → Feedback Signal
                                ↓
                    [Accept / Reject / Edit / Ignore]
                                ↓
                    Structured Feedback Record
```

**Implementation**:
- Extend run logs to include `outcome_status`: `accepted | rejected | edited | ignored`
- Track edit distance when user modifies AI output (measures accuracy)
- Record time-to-accept (fast = good suggestion)
- Store Grok disagreements as learning signals

**Data Model**:
```typescript
interface RunOutcome {
  runId: string;
  agentType: AgentType;
  outcomeStatus: 'accepted' | 'rejected' | 'edited' | 'ignored';
  editDistance?: number;        // How much user changed output
  timeToDecision: number;       // Seconds to accept/reject
  grokAgreed: boolean;          // Second opinion alignment
  classicMetrics: CLASSicMetrics;
  feedbackTags?: string[];      // "too_verbose", "incorrect", "helpful"
}
```

### 2. Prompt Optimization Service

**What it does**: A/B test prompt variations and automatically promote winners.

**Stages**:
1. **Shadow Mode**: New prompt runs alongside current, results logged but not shown
2. **A/B Test**: 10% of traffic sees new prompt, measure CLASSic metrics
3. **Promotion**: If new prompt beats baseline by threshold, promote it
4. **Rollback**: Auto-revert if metrics degrade

**Implementation**:
```typescript
interface PromptVariant {
  id: string;
  agentType: AgentType;
  version: number;
  promptText: string;
  status: 'shadow' | 'ab_test' | 'promoted' | 'retired';
  metrics: {
    acceptanceRate: number;
    avgEditDistance: number;
    avgLatency: number;
    sampleSize: number;
  };
}
```

**Governance**:
- Minimum sample size before promotion (e.g., 100 runs)
- Statistical significance required (p < 0.05)
- Human approval for major prompt changes
- Audit trail of all prompt versions

### 3. Memory Store (Retrieval-Augmented Learning)

**What it does**: Remember high-quality past responses to inform future ones.

**How it works**:
1. Embed each successful task description
2. Store task + response pairs in vector database
3. On new request, retrieve similar past successes
4. Include as few-shot examples in prompt

**Implementation**:
```typescript
interface MemoryEntry {
  id: string;
  taskEmbedding: number[];      // Vector representation
  taskDescription: string;
  response: string;
  agentType: AgentType;
  qualityScore: number;         // Based on outcome metrics
  createdAt: Date;
  accessCount: number;
}
```

**Privacy Controls**:
- PII scrubbing before storage
- User opt-out for memory inclusion
- Retention limits (e.g., 90 days)
- No code/proprietary content in memory

### 4. Meta-Evaluation by Philosopher Agent

**What it does**: Periodically analyze accumulated logs to suggest improvements.

**Schedule**: Weekly automated review

**Philosopher Analyzes**:
- Rejection patterns: "What types of requests fail most often?"
- Agent weaknesses: "Which agent has lowest acceptance rate?"
- Prompt inefficiencies: "Which prompts are too verbose?"
- Security trends: "Are validation failures increasing?"

**Output**:
```typescript
interface MetaEvaluation {
  period: { start: Date; end: Date };
  insights: string[];
  promptSuggestions: PromptVariant[];
  policyRecommendations: string[];
  riskAreas: string[];
}
```

### 5. Human-in-the-Loop Feedback UI

**What it does**: Let users provide structured feedback beyond accept/reject.

**Feedback Options**:
- Thumbs up/down on response quality
- Tag issues: "too_verbose", "incorrect", "off_topic", "helpful", "creative"
- Free-text comments (optional)
- Star rating (1-5)

**Implementation**:
```typescript
interface HumanFeedback {
  runId: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  comment?: string;             // Sanitized, no PII
  submittedAt: Date;
}
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Agent Invocation                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Structured Logging                          │
│  (runId, metrics, validation, security events, Grok opinion)    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Outcome Tracking                           │
│        (accept/reject/edit signals, human feedback)              │
└─────────────────────────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Memory Store   │  │ Prompt A/B Test │  │ Meta-Evaluation │
│ (high-quality   │  │   Service       │  │  (Philosopher)  │
│  examples)      │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Improved Agent Responses                      │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Outcome Tracking (Week 1-2)
- [ ] Add outcome_status to run logs
- [ ] Track edit distance for modified responses
- [ ] Store run outcomes in persistent storage
- [ ] Create basic acceptance rate dashboard

### Phase 2: Human Feedback Integration (Week 2-3)
- [ ] Add feedback UI components
- [ ] Create feedback API endpoints
- [ ] Link feedback to run records
- [ ] Build feedback analytics view

### Phase 3: Memory Store (Week 3-4)
- [ ] Set up vector storage (e.g., pgvector, Pinecone)
- [ ] Implement task embedding pipeline
- [ ] Add retrieval for similar past tasks
- [ ] Integrate retrieved examples into prompts

### Phase 4: Prompt Optimization (Week 4-6)
- [ ] Create prompt versioning system
- [ ] Implement shadow mode testing
- [ ] Build A/B test infrastructure
- [ ] Add statistical significance checks
- [ ] Create promotion/rollback automation

### Phase 5: Meta-Evaluation (Week 6-8)
- [ ] Schedule weekly Philosopher analysis
- [ ] Generate automated insight reports
- [ ] Route suggestions to prompt optimization
- [ ] Create human review workflow for major changes

## Privacy & Security Considerations

1. **Data Minimization**: Only store what's needed for learning
2. **PII Scrubbing**: Remove personal data before storage
3. **User Consent**: Opt-in for memory inclusion
4. **Retention Limits**: Auto-delete after 90 days
5. **Access Controls**: Learning data separate from user data
6. **Audit Logging**: Track all access to learning data
7. **No Code Storage**: Never store user's proprietary code

## Success Metrics

| Metric | Baseline | Target | Timeframe |
|--------|----------|--------|-----------|
| Acceptance Rate | TBD | +20% | 3 months |
| Avg Edit Distance | TBD | -30% | 3 months |
| Time to Decision | TBD | -25% | 3 months |
| User Satisfaction | TBD | 4.0+ stars | 6 months |

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Outcome Tracking | 2 weeks | High |
| Human Feedback UI | 1 week | High |
| Memory Store | 2 weeks | Medium |
| Prompt Optimization | 3 weeks | Medium |
| Meta-Evaluation | 2 weeks | Low |
| **Total** | **10 weeks** | |

## Recommendation

Start with **Phase 1 (Outcome Tracking)** and **Phase 2 (Human Feedback)** - these provide the foundation for all other learning mechanisms and can show value quickly with acceptance rate improvements.
