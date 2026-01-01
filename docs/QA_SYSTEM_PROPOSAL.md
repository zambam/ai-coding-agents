# The Four Horsemen: Self-Review QA System Proposal

## Executive Summary

This proposal establishes a mandatory QA and documentation system where The Four Horsemen agents review their own codebase, identify issues, and implement fixes with full traceability. The system ensures rigor, fact-based analysis, and prevents the issues identified in the recent audit.

---

## Part 1: Root Cause Analysis of Recent Issues

### Issues Identified by Architect Review

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Cosmetic rebrand only | Schema types (`AgentType`) not updated end-to-end | API consumers can't use new horsemen names |
| Grok integration incomplete | `fullSystemPrompt` not passed to Grok | Second opinions lack project context |
| Runtime UI errors | Icon imports changed without auditing all usages | Navbar crashes on mount |
| Duplicate configs | `DEFAULT_AGENT_CONFIG` duplicated in orchestrator/routes | Missing fields cause TypeScript errors |

### Why These Issues Occurred

1. **No pre-commit validation** - Changes made without running type checks
2. **No integration tests** - UI components not tested after refactoring
3. **No documentation of dependencies** - No record of what files depend on what
4. **Manual coordination** - No automated pipeline to validate changes

---

## Part 2: Proposed QA & Documentation Guidelines

### 2.1 Mandatory Pre-Change Checklist

Before ANY code change, the developer/agent must:

```markdown
## Pre-Change Checklist
- [ ] Run `npm run typecheck` to verify no TypeScript errors
- [ ] Identify all files that import/depend on changed modules
- [ ] Document the change intent in the commit message
- [ ] If changing types: grep for all usages across codebase
- [ ] If changing imports: verify all icon/component references
```

### 2.2 Post-Change Validation Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Conquest  │───▶│     War     │───▶│   Famine    │───▶│    Death    │
│  (Design)   │    │  (Debug)    │    │ (Implement) │    │  (Validate) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Blueprint         Issue List         Code Fix          Final Audit
   + Impact          + Root Cause       + Tests           + Sign-off
```

### 2.3 Documentation Requirements

Every significant change must include:

1. **Change Intent** - What problem does this solve?
2. **Files Modified** - Complete list with rationale
3. **Dependencies Checked** - Proof that downstream effects were considered
4. **Test Evidence** - Screenshots, logs, or test results
5. **Rollback Plan** - How to undo if issues arise

---

## Part 3: Four Horsemen Self-Review Protocol

### Step 1: Conquest Reviews Architecture

**Command**: 
```bash
POST /api/agents/invoke
{
  "agentType": "architect",
  "prompt": "Review the current architecture of The Four Horsemen system. Identify: 1) All type definitions and their consumers, 2) All shared constants and where they're duplicated, 3) Import dependency graph for critical modules. Output a structured audit report.",
  "config": { "validationLevel": "strict", "enableGrokSecondOpinion": true }
}
```

**Output**: Architecture audit with dependency map

### Step 2: War Diagnoses Issues

**Command**:
```bash
POST /api/agents/invoke
{
  "agentType": "mechanic",
  "prompt": "Given the architecture audit, diagnose: 1) All TypeScript errors (run npm run typecheck), 2) All runtime errors from browser console logs, 3) All schema inconsistencies between shared/schema.ts and consumers. Provide root cause analysis for each.",
  "config": { "validationLevel": "strict", "enableGrokSecondOpinion": true }
}
```

**Output**: Issue inventory with root causes

### Step 3: Famine Implements Fixes

**Command**:
```bash
POST /api/agents/invoke
{
  "agentType": "codeNinja",
  "prompt": "Implement fixes for all diagnosed issues. Requirements: 1) Use single source of truth for all configs, 2) Ensure all icon imports are consistent, 3) Add type guards where needed, 4) No code duplication. Output complete file diffs.",
  "config": { "validationLevel": "strict", "enableSelfCritique": true }
}
```

**Output**: Implementation with complete diffs

### Step 4: Death Validates Everything

**Command**:
```bash
POST /api/agents/invoke
{
  "agentType": "philosopher",
  "prompt": "Final validation: 1) Verify all TypeScript compiles without errors, 2) Verify UI loads without console errors, 3) Verify API endpoints return correct responses, 4) Verify Grok integration receives full context. Sign off or reject with specific failures.",
  "config": { "validationLevel": "strict", "enableGrokSecondOpinion": true }
}
```

**Output**: Sign-off report or rejection with specifics

---

## Part 4: Immediate Action Plan

### Phase 1: Fix Critical Blockers (Immediate)

| Task | Owner | Validation |
|------|-------|------------|
| Add `enableGrokSecondOpinion` to all config locations | Famine | `npm run typecheck` passes |
| Audit all lucide-react imports for consistency | War | No "undefined" errors in console |
| Pass `fullSystemPrompt` to Grok client | Famine | Grok responses include project context |
| Remove duplicate `DEFAULT_CONFIG` definitions | Famine | Single source of truth verified |

### Phase 2: Add QA Infrastructure (This Week)

| Task | Owner | Validation |
|------|-------|------------|
| Add `npm run typecheck` script | Famine | Script runs without errors |
| Add pre-commit hook for type checking | Famine | Commits blocked if types fail |
| Create dependency map documentation | Conquest | All module relationships documented |
| Add integration test for UI mount | War | Test catches missing imports |

### Phase 3: Establish Ongoing QA (Next Sprint)

| Task | Owner | Validation |
|------|-------|------------|
| Implement automated Four Horsemen review pipeline | Conquest | Pipeline runs on every PR |
| Add CLASSic metrics dashboard | Famine | Real-time quality visibility |
| Create runbook for common issues | Death | Team can self-serve fixes |

---

## Part 5: Success Criteria

The QA system is successful when:

1. **Zero TypeScript errors** - `npm run typecheck` passes on every commit
2. **Zero runtime errors** - Browser console clean on all pages
3. **Single source of truth** - No duplicate constants or configs
4. **Full context in Grok** - Second opinions reference project specifics
5. **Documented changes** - Every PR has impact analysis
6. **Automated validation** - Four Horsemen pipeline runs on changes

---

## Part 6: Commands to Run Self-Review

### Quick Health Check
```bash
# TypeScript validation
npm run typecheck

# Check for duplicate configs
grep -r "DEFAULT.*CONFIG" server/ shared/

# Verify icon imports
grep -r "from \"lucide-react\"" client/src/
```

### Full Four Horsemen Review
```bash
# Run the complete pipeline
curl -X POST http://localhost:5000/api/agents/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Perform a complete self-audit of The Four Horsemen codebase. Identify all issues, propose fixes, and validate the system is production-ready.",
    "config": {
      "validationLevel": "strict",
      "enablePhilosopher": true,
      "enableGrokSecondOpinion": true
    }
  }'
```

---

## Approval Required

Please review this proposal and confirm:

1. **Approve Phase 1** - Proceed with immediate critical fixes
2. **Approve Phase 2** - Add QA infrastructure 
3. **Approve Phase 3** - Establish ongoing QA processes

Once approved, I will implement the fixes systematically with full documentation at each step.
