# AI Agents QA System: Implementation Plan

**Status:** PENDING USER APPROVAL  
**Date:** January 1, 2026  
**Review:** All Four Agents

---

## Executive Summary

This document presents a comprehensive plan to address the root causes of recent implementation failures and establish a robust QA system. The plan was developed through analysis by all four agents and requires user approval before any code changes.

---

## Part 1: Root Cause Analysis

### What Went Wrong

| Issue | Symptom | Root Cause | Process Failure |
|-------|---------|------------|-----------------|
| **Cosmetic Rebrand** | Schema types still use old names | No dependency impact analysis | Changes made without tracing all consumers |
| **Grok Context Missing** | Second opinions lack project context | `fullSystemPrompt` not passed to Grok | No contract tests for LLM integrations |
| **Runtime UI Crash** | "Zap is not defined" error | Icon import changed without auditing usages | No UI smoke tests |
| **Duplicate Configs** | TypeScript errors on missing fields | `DEFAULT_AGENT_CONFIG` copied instead of imported | No single source of truth enforcement |
| **Rushed Implementation** | Multiple blocking defects | No QA pipeline before commit | Agents worked independently without review |

### Why These Issues Occurred (Process Failures)

1. **No Pre-Commit Validation**
   - TypeScript check not enforced
   - No automated dependency analysis
   - Manual verification easily skipped

2. **No Integration Testing**
   - UI components not tested after refactoring
   - LLM contract expectations not validated
   - No smoke tests for critical paths

3. **No Single Source of Truth**
   - Constants duplicated across files
   - Schema changes not propagated
   - Documentation drifts from code

4. **No Orchestrated Review**
   - Agents operate independently
   - No mandatory peer review step
   - No sign-off before completion

5. **No Fake Data Detection**
   - Placeholder content can slip through
   - No scanning for mock patterns
   - Test data not isolated

---

## Part 2: Agent Reviews

### The Architect's Assessment

**Architecture Gaps Identified:**
- Missing shared-config module for constants
- No dependency graph documentation
- Orchestrator lacks QA workflow methods
- No contract interfaces for LLM clients

**Proposed Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                      Orchestrator                           │
├─────────────────────────────────────────────────────────────┤
│  runPipeline()      - Existing implementation pipeline      │
│  runQAReview()      - NEW: QA self-review pipeline         │
│  runPreCommitCheck() - NEW: Automated validation           │
│  runFakeDataScan()  - NEW: Placeholder detection           │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ Architect│       │ Mechanic │       │Code Ninja│
    │  (Plan)  │       │ (Debug)  │       │(Implement│
    └──────────┘       └──────────┘       └──────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                       ┌──────────┐
                       │Philosopher│
                       │(Validate)│
                       └──────────┘
```

### The Mechanic's Diagnosis

**Technical Debt Identified:**
1. `server/agents/orchestrator.ts` - Missing QA methods
2. `server/agents/grok-client.ts` - No validation of input context
3. No `scripts/` directory for automation tools
4. No pre-commit hooks configured
5. No CI/CD pipeline definition

**Risks if Not Addressed:**
- Continued rushed implementations
- Fake data shipping to production
- Breaking changes not caught early
- LLM responses missing critical context

### The Code Ninja's Implementation Approach

**Files to Create:**
```
scripts/
├── scan-placeholders.ts    # Fake data detection
├── check-dependencies.ts   # Import/export analysis
└── pre-commit.ts           # Pre-commit validation runner
```

**Files to Modify:**
```
server/agents/orchestrator.ts   # Add QA workflow methods
server/agents/grok-client.ts    # Add context validation
server/routes.ts                # Add /api/agents/qa endpoint
package.json                    # Add QA scripts
```

**Estimated Effort:**
- QA workflow in Orchestrator: 2-3 hours
- Placeholder scanner: 1 hour
- Pre-commit hooks: 1 hour
- API endpoint: 30 minutes
- Documentation: 1 hour

### The Philosopher's Validation

**Critical Questions Answered:**

1. **Is this plan complete?**
   - Yes, addresses all identified root causes
   - Includes both technical and process fixes

2. **Are there hidden assumptions?**
   - Assumes team will follow pre-commit discipline
   - Assumes CI will be configured (out of scope for now)

3. **What could still go wrong?**
   - Developers bypassing hooks with `--no-verify`
   - New patterns not covered by placeholder scanner
   - LLM hallucinations in self-review

4. **Recommendation:**
   - APPROVED with caveat: Add logging/audit trail for QA runs

---

## Part 3: Detailed Implementation Plan

### Phase 1: QA Workflow in Orchestrator

**New Method: `runQAReview()`**

```typescript
interface QAReviewResult {
  architectAudit: {
    dependencyMap: Record<string, string[]>;
    duplicateConfigs: string[];
    schemaConsistency: boolean;
  };
  mechanicDiagnosis: {
    typeErrors: string[];
    runtimeErrors: string[];
    fakeDataFound: string[];
  };
  codeNinjaRemediation: {
    fixes: Array<{ file: string; description: string; priority: "high" | "medium" | "low" }>;
    estimatedEffort: string;
  };
  philosopherValidation: {
    approved: boolean;
    concerns: string[];
    recommendations: string[];
  };
}

async runQAReview(scope: "full" | "staged"): Promise<QAReviewResult>
```

**Flow:**
1. **Architect** audits dependencies and schema
2. **Mechanic** runs diagnostics (typecheck, scan, logs)
3. **Code Ninja** proposes fixes with priorities
4. **Philosopher** validates and signs off

### Phase 2: Fake Data Scanner

**Script: `scripts/scan-placeholders.ts`**

```typescript
const PATTERNS = [
  /lorem\s+ipsum/i,
  /example\.com/,
  /test@/,
  /TODO:/,
  /FIXME:/,
  /placeholder/i,
  /\bMOCK\b/,
  /\bFAKE\b/,
  /sample\s+(data|user|email)/i,
  /john\s*(doe)?/i,
  /jane\s*(doe)?/i,
  /123-?456-?7890/,  // Fake phone
  /12345/,           // Fake zip
];

const ALLOWED_PATHS = [
  /\/mocks\//,
  /\/fixtures\//,
  /\/tests?\//,
  /\.test\./,
  /\.spec\./,
];
```

**Output:**
```
=== Fake/Placeholder Data Scan ===
VIOLATION: client/src/pages/home.tsx:42 - "sample user"
VIOLATION: server/routes.ts:78 - "example.com"
ALLOWED:   tests/fixtures/users.ts:5 - "john doe" (in fixtures)

Result: 2 violations, 1 allowed
```

### Phase 3: Pre-Commit Validation

**Script: `scripts/pre-commit.ts`**

```typescript
async function runPreCommit() {
  const results = {
    typecheck: await runCommand("npm run check"),
    placeholderScan: await runCommand("npm run qa:scan"),
    lspErrors: await checkLSPDiagnostics(),
  };
  
  if (results.typecheck.failed || results.placeholderScan.violations > 0) {
    console.error("Pre-commit checks failed. Fix issues before committing.");
    process.exit(1);
  }
}
```

**Package.json additions:**
```json
{
  "scripts": {
    "qa:scan": "tsx scripts/scan-placeholders.ts",
    "qa:deps": "tsx scripts/check-dependencies.ts",
    "qa:review": "tsx scripts/run-qa-review.ts",
    "precommit": "tsx scripts/pre-commit.ts"
  }
}
```

### Phase 4: API Endpoint

**Route: `POST /api/agents/qa`**

```typescript
app.post("/api/agents/qa", async (req, res) => {
  const { scope = "full" } = req.body;
  const orchestrator = new Orchestrator(req.body.config);
  const result = await orchestrator.runQAReview(scope);
  res.json(result);
});
```

### Phase 5: Grok Context Fix

**Update `grok-client.ts`:**

```typescript
export async function getGrokSecondOpinion(
  fullSystemPrompt: string,  // Now receives full context
  userPrompt: string,
  originalResponse: string,
  reasoningSteps?: ReasoningStep[]  // NEW: Include reasoning
): Promise<GrokResponse> {
  // Validate inputs
  if (!fullSystemPrompt.includes("Project Context")) {
    console.warn("Grok called without project context");
  }
  
  const enhancedPrompt = `
SYSTEM CONTEXT:
${fullSystemPrompt}

REASONING STEPS TAKEN:
${JSON.stringify(reasoningSteps, null, 2)}

ORIGINAL RESPONSE TO REVIEW:
${originalResponse}
...
  `;
}
```

---

## Part 4: Rollout Plan

### Step 1: Create Scripts Directory
- Create `scripts/scan-placeholders.ts`
- Create `scripts/check-dependencies.ts`
- Add npm scripts to package.json

### Step 2: Extend Orchestrator
- Add `runQAReview()` method
- Add `runPreCommitCheck()` method
- Export `QAReviewResult` interface

### Step 3: Add API Endpoint
- Add `/api/agents/qa` route
- Wire to Orchestrator.runQAReview()

### Step 4: Fix Grok Integration
- Update `getGrokSecondOpinion` signature
- Pass `fullSystemPrompt` from base-agent
- Include reasoning steps in Grok prompt

### Step 5: Documentation
- Update replit.md with QA commands
- Update QA_SYSTEM_PROPOSAL.md with implementation details
- Add README section on QA workflow

---

## Part 5: Validation Criteria

Before marking implementation complete:

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript compiles | `npm run check` | No errors |
| No fake data in prod | `npm run qa:scan` | 0 violations |
| QA endpoint works | `curl /api/agents/qa` | 200 OK |
| Grok receives context | Check Grok prompt | Includes "Project Context" |
| All agents callable | Test each agent type | All return valid responses |

---

## Approval Request

**Please confirm to proceed with implementation:**

1. [ ] Approve Phase 1: QA Workflow in Orchestrator
2. [ ] Approve Phase 2: Fake Data Scanner
3. [ ] Approve Phase 3: Pre-Commit Validation
4. [ ] Approve Phase 4: API Endpoint
5. [ ] Approve Phase 5: Grok Context Fix

**Estimated Total Effort:** 6-8 hours

**Risk Level:** Low (additive changes, no breaking modifications)

---

*This plan was reviewed by all four agents: The Architect (design), The Mechanic (diagnosis), The Code Ninja (implementation), and The Philosopher (validation).*
