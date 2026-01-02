# Agent Behavior Optimization Proposal

**Version:** 2.1  
**Date:** January 2, 2026  
**Status:** APPROVED  
**Method:** 3-Pass Optimized Workflow (8 AI Calls)

---

## Executive Summary

This proposal outlines an optimized 3-pass workflow for agent coordination, reducing complexity while maintaining quality. The goal is to streamline Architect and Mechanic interactions with trigger-based Philosopher involvement and Code Ninja execution.

**Key Targets:**
- Reduce AI calls from 10+ to 8 total
- 50-70% latency improvement via structured passes
- Philosopher trigger-based at 15% change threshold
- Joint validation for efficiency
- Code Ninja executes approved changes before sign-off

---

## Optimized 3-Pass Structure

### Pass 1: Foundation & Initial Findings (3 calls)

| Step | Agent | Role |
|------|-------|------|
| 1 | Philosopher | Sets meta-context, goals, opportunities |
| 2 | Architect | Generates findings/plan (READ → THINK → RESPOND) |
| 3 | Mechanic | Validates + adds own findings |

**Joint Resolution:** Auto-merge simple conflicts; escalate to Philosopher if complex.

### Pass 2: Refinement & Cross-Validation (2 calls)

| Step | Agent | Role |
|------|-------|------|
| 4 | Architect | Updates plan from Mechanic feedback |
| 5 | Mechanic | Validates updates + edge cases |

**Philosopher Trigger:** If changes exceed 15% threshold, Philosopher checks alignment + spots adjacents.

### Pass 3: Final Resolution & Sign-off (3 calls)

| Step | Agent | Role |
|------|-------|------|
| 6 | Architect | Finalizes roadmap |
| 7 | Mechanic + Philosopher | Joint validation (1 combined call) |
| 8 | Code Ninja | Implements approved changes |

**Sign-off:** Workflow confirmation (not an AI call - just status check).

---

## Full Resolution Flow Diagram

```
PASS 1: FOUNDATION (3 calls)
════════════════════════════
┌────────────────────────────────────────────┐
│ [Call 1] PHILOSOPHER: Meta-Goals           │
│ • Project targets and success metrics      │
│ • Initial adjacents (optimization paths)   │
│ • Store adjacents in ML system             │
└─────────────────┬──────────────────────────┘
                  ▼
┌────────────────────────────────────────────┐
│ [Call 2] ARCHITECT: READ → THINK → RESPOND │
│ • Findings (ARCH-001...) & draft plan      │
└─────────────────┬──────────────────────────┘
                  ▼
┌────────────────────────────────────────────┐
│ [Call 3] MECHANIC: Validate + Findings     │
│ • Corrections, MECH-001...                 │
└─────────────────┬──────────────────────────┘
                  ▼
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  JOINT RESOLUTION (No AI call - logic only) 
│ • Same finding, different wording → merge  │
  • Contradictory recommendations → escalate 
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

PASS 2: REFINEMENT (2 calls + optional trigger)
════════════════════════════════════════════════
┌────────────────────────────────────────────┐
│ [Call 4] ARCHITECT: Update Plan            │
│ • Incorporate Mechanic feedback            │
│ • Address edge cases                       │
└─────────────────┬──────────────────────────┘
                  ▼
┌────────────────────────────────────────────┐
│ [Call 5] MECHANIC: Validate Updates        │
│ • Risk analysis                            │
│ • Calculate change percentage              │
└─────────────────┬──────────────────────────┘
                  ▼ (Trigger if changes > 15%)
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  [Optional] PHILOSOPHER: Alignment Check    
│ • Confirm goals still aligned              │
  • Spot new adjacents → store in ML         
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

PASS 3: FINAL (3 calls)
═══════════════════════
┌────────────────────────────────────────────┐
│ [Call 6] ARCHITECT: Final Roadmap          │
│ • All findings addressed                   │
└─────────────────┬──────────────────────────┘
                  ▼
┌────────────────────────────────────────────┐
│ [Call 7] MECHANIC + PHILOSOPHER: Joint     │
│ • Checklist + achievement confirm          │
│ • Final adjacents stored in ML system      │
│ (1 combined call for efficiency)           │
└─────────────────┬──────────────────────────┘
                  ▼
┌────────────────────────────────────────────┐
│ [Call 8] CODE NINJA: Execute Changes       │
│ • Implement from validated roadmap         │
│ • No additional features                   │
└─────────────────┬──────────────────────────┘
                  ▼
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  SIGN-OFF (No AI call - status check only)  
│ • Confirm all steps complete               │
  • Proceed to deployment                    
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Expected Output Document Structure

```markdown
# [Feature/Task] Implementation Plan
**Version:** 1.0
**Date:** [Date]
**Status:** Review Complete

---

## 1. Meta-Goals & Initial Opportunities (PHILOSOPHER - Pass 1)
| Goal | Metric | Target |
|------|--------|--------|
| Code Quality | CLASSic Score | > 0.8 |
| Latency | Response Time | < 5000ms |
| Rework | Revision Rate | < 15% |

**Adjacent Opportunities:** [Optimization paths identified]
**ML Storage:** [adjacents stored for future learning]

---

## 2. Architect Findings & Draft Plan
| ID | Description | Impact | Resolution |
|----|-------------|--------|------------|
| ARCH-001 | ... | High | ... |
| ARCH-002 | ... | Medium | ... |

---

## 3. Mechanic Validation & Findings
| ARCH ID | Status | Correction |
|---------|--------|------------|
| ARCH-001 | Validated | None |
| ARCH-002 | Modified | [Correction] |

| MECH ID | Description | Impact |
|---------|-------------|--------|
| MECH-001 | ... | ... |

---

## 4. Conflict Resolutions
| ID | Conflict | Type | Resolution | Resolved By |
|----|----------|------|------------|-------------|
| C-001 | Same finding, different wording | Simple | Auto-merged | System |
| C-002 | Contradictory recommendations | Complex | [Decision] | Philosopher |

---

## 5. Updated Plan (ARCHITECT - Pass 2)
### Phase 1: [Component]
- Task 1.1
- Task 1.2

### Phase 2: [Component]
- Task 2.1

---

## 6. Final Validation (MECHANIC + PHILOSOPHER - Pass 3)
### Mechanic Checklist
- [ ] All ARCH findings addressed
- [ ] All MECH findings addressed
- [ ] Edge cases covered
- [ ] Risk analysis complete

### Philosopher Confirmation
- [ ] Goals aligned
- [ ] Adjacents documented
- [ ] ML storage updated

---

## 7. Code Ninja Execution (Pass 3)
| Task | Status | Notes |
|------|--------|-------|
| Implement approved changes | Pending | From validated roadmap |
| No additional features | Enforced | Scope constraint |

---

## 8. Achievement & Adjacents (PHILOSOPHER - Pass 3)
| Goal | Status | Notes |
|------|--------|-------|
| Code Quality | ✓ | CLASSic 0.85 |
| Latency | ✓ | 3200ms avg |

**Final Adjacents:** [Future optimization opportunities]
**ML System:** Adjacents stored for continuous learning

---

## 9. Sign-off Summary
| Pass | Architect | Mechanic | Philosopher | Code Ninja |
|------|-----------|----------|-------------|------------|
| 1 | ✓ | ✓ | ✓ | - |
| 2 | ✓ | ✓ | [Triggered/Skipped] | - |
| 3 | ✓ | ✓ | ✓ | ✓ |
```

---

## Philosopher Trigger Conditions

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Plan changes | > 15% | Philosopher alignment check |
| Conflict count | > 2 | Escalate to Philosopher |
| Risk severity | High | Philosopher review |
| Security impact | Any | Philosopher review |

---

## Conflict Resolution Logic

### Simple Conflicts (Auto-Merge)
- Same finding with different wording
- Non-contradictory recommendations
- Stylistic differences

### Complex Conflicts (Escalate to Philosopher)
- Contradictory recommendations
- Mutually exclusive approaches
- Security vs. performance trade-offs
- Scope disagreements

---

## Adjacent Opportunities Storage

Adjacents are stored in both locations:

### 1. ML System (MemoryManager)
```typescript
await memoryManager.store({
  type: 'adjacent_opportunity',
  content: adjacentDescription,
  metadata: {
    source: 'philosopher',
    pass: passNumber,
    task: taskId,
    timestamp: new Date().toISOString()
  }
});
```

### 2. Output Document
Adjacents are documented in:
- Section 1: Initial opportunities (Pass 1)
- Section 8: Final adjacents (Pass 3)

---

## Configuration for 3-Pass Workflow

```yaml
# replit.md configuration
workflow.passes: 3
workflow.maxCalls: 8
philosopher.triggerThreshold: 0.15  # 15% change threshold
philosopher.alwaysOnPass1: true
philosopher.alwaysOnPass3: true
jointValidation.enabled: true
autoMerge.simpleConflicts: true
codeNinja.executeAfterValidation: true
adjacents.storeInML: true
adjacents.documentInOutput: true
```

---

## Agent Prompt Templates

### Philosopher (Pass 1)
```
As Philosopher, establish meta-goals for [task]:
1. Define success metrics (max 5)
2. Identify adjacent opportunities
3. Set quality thresholds

Store adjacents for ML learning. Keep under 300 words.
```

### Architect (Pass 1 & 2)
```
As Architect, outline plan for [task] with:
1. Findings list (ARCH-001, ARCH-002...)
2. Core components (max 3)
3. Data flow (text-based)

Keep under 500 words. No implementation details.
```

### Mechanic (Pass 1, 2 & 3)
```
Validate Architect's findings:

[ARCH findings]

Provide:
1. Validation status per finding
2. Your own findings (MECH-001...)
3. Risk assessment

Flag contradictions for Philosopher escalation.
```

### Code Ninja (Pass 3)
```
Implement approved changes from validated roadmap:

[Final roadmap]

Rules:
1. Follow approved blueprint exactly
2. No additional features
3. No scope expansion

Execute and report completion status.
```

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| AI Calls | 10+ | 8 | Per workflow |
| Latency | 8-12s | 3-5s | CLASSic |
| Rework | 40% | <15% | Revision count |
| Conflicts | Manual | Auto-merge | Resolution log |
| Adjacents captured | 0 | 3+ per task | ML storage |

---

## Implementation Timeline

| Day | Task | Validation |
|-----|------|------------|
| 1 | Implement Pass 1 flow | Philosopher → Architect → Mechanic |
| 1 | Add joint resolution logic | Auto-merge + escalation test |
| 2 | Implement Pass 2 with 15% trigger | Threshold test |
| 2 | Implement Pass 3 joint validation | Combined call test |
| 2 | Add Code Ninja execution step | Post-validation execution |
| 3 | Adjacents ML storage | Memory manager integration |
| 3 | Full workflow test | 8-call verification |
| 3 | Metrics integration | CLASSic logging |

---

## Appendix: Sample Test Tasks

### Full 3-Pass Test
```
Task: "Design and implement a rate limiter for API endpoints"

Expected flow:
Pass 1: Philosopher sets goals → Architect designs → Mechanic validates
Pass 2: Architect refines → Mechanic confirms (< 15% change, skip Philosopher)
Pass 3: Architect finalizes → Joint validation → Code Ninja implements → Sign-off
```

### Philosopher Trigger Test
```
Task: "Refactor authentication to support OAuth2"

Expected flow:
Pass 2: Changes > 15% → Philosopher triggered for alignment check
```

### Conflict Escalation Test
```
Task: "Optimize database queries for performance"

Expected conflict:
ARCH-001: "Add indexes to all foreign keys"
MECH-001: "Remove unused indexes to reduce write overhead"
→ Contradictory → Escalate to Philosopher
```

---

*Document follows 3-Pass Optimized Workflow from @ai-coding-agents/cli v2.1*
