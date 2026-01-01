# Combined Implementation Plan

## AI Coding Agents Platform - Integrated Roadmap

**Version:** 2.0  
**Date:** January 2026  
**Status:** Active  
**Reviewed By:** Mechanic (Approved), Code Ninja (Approved)

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

## Task Dependency Graph (DAG)

```
                           ┌─────────────────────────────────────────┐
                           │         PHASE 1 (COMPLETE)              │
                           │    Logging + Debugging Infrastructure   │
                           └─────────────────────────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   2A. Data Storage      │   │   2B. Consumer Logger   │   │   2C. Security          │
│   ───────────────────   │   │   ───────────────────   │   │   ───────────────────   │
│   - RunOutcome schema   │   │   - createAgentLogger() │   │   - Semgrep CI          │
│   - HumanFeedback       │   │   - Env var config      │   │   - Dependency scan     │
│   - PromptVariant       │   │   - File destinations   │   │   - Input sanitization  │
│   - Storage interface   │   │   - Pretty print        │   │   - Injection detection │
│                         │   │                         │   │                         │
│   BLOCKING: None        │   │   BLOCKING: None        │   │   BLOCKING: None        │
│   EFFORT: 12h           │   │   EFFORT: 9h            │   │   EFFORT: 13h           │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
              │                              │                              │
              │                              │                              │
              │               ┌──────────────┴──────────────┐              │
              │               ▼                              │              │
              │   ┌─────────────────────────┐               │              │
              │   │   2D. Privacy Controls  │               │              │
              │   │   ───────────────────   │               │              │
              │   │   - PII redaction       │◄──────────────┘              │
              │   │   - Consent framework   │                              │
              │   │   - Retention policies  │                              │
              │   │   - GDPR endpoints      │                              │
              │   │                         │                              │
              │   │   BLOCKING: 2C          │                              │
              │   │   EFFORT: 14h           │                              │
              │   └─────────────────────────┘                              │
              │                              │                              │
              ▼                              ▼                              │
┌─────────────────────────┐   ┌─────────────────────────┐                 │
│   3A. Outcome Tracking  │   │   3B. Debug Toolkit     │                 │
│   ───────────────────   │   │   ───────────────────   │                 │
│   - Accept/reject/edit  │   │   - DebugToolkit class  │                 │
│   - Edit distance       │   │   - captureLastRun()    │                 │
│   - Grok disagreements  │   │   - exportRunBundle()   │                 │
│   - Persistence         │   │   - Sanitization        │                 │
│                         │   │                         │                 │
│   BLOCKING: 2A          │   │   BLOCKING: 2B, 2D      │                 │
│   EFFORT: 12h           │   │   EFFORT: 12h           │                 │
└─────────────────────────┘   └─────────────────────────┘                 │
              │                              │                              │
              │               ┌──────────────┴──────────────┐              │
              ▼               ▼                              ▼              │
┌─────────────────────────┐   ┌─────────────────────────┐                 │
│   3C. Human Feedback UI │   │   3D. CLI & Endpoints   │◄────────────────┘
│   ───────────────────   │   │   ───────────────────   │
│   - FeedbackPanel       │   │   - npx diagnostics     │
│   - Tags/ratings        │   │   - Express router      │
│   - Feedback API        │   │   - Health endpoints    │
│                         │   │                         │
│   BLOCKING: 3A          │   │   BLOCKING: 2B, 2C      │
│   EFFORT: 11h           │   │   EFFORT: 10h           │
└─────────────────────────┘   └─────────────────────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
              ┌─────────────────────────────────────────┐
              │         PHASE 3 GATE                    │
              │   Regression: 50+ new tests required    │
              │   Acceptance: All feedback flows work   │
              └─────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   4A. Prompt Versioning │   │   4B. Memory Store      │
│   ───────────────────   │   │   ───────────────────   │
│   - Version schema      │   │   - pgvector setup      │
│   - Shadow mode         │   │   - Task embeddings     │
│   - A/B testing         │   │   - Similar retrieval   │
│   - Auto-promotion      │   │   - Few-shot injection  │
│                         │   │                         │
│   BLOCKING: 3A, 3C      │   │   BLOCKING: 2A, 2D      │
│   EFFORT: 17h           │   │   EFFORT: 17h           │
└─────────────────────────┘   └─────────────────────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
              ┌─────────────────────────────────────────┐
              │   4C. Meta-Evaluation                   │
              │   ───────────────────                   │
              │   - Weekly Philosopher job              │
              │   - Insight reports                     │
              │   - Prompt recommendations              │
              │                                         │
              │   BLOCKING: 4A, 4B                      │
              │   EFFORT: 13h                           │
              └─────────────────────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────────────────┐
              │   4D. Analytics Dashboard               │
              │   ───────────────────                   │
              │   - Acceptance rate charts              │
              │   - Agent comparison                    │
              │   - Trend visualization                 │
              │                                         │
              │   BLOCKING: 4C                          │
              │   EFFORT: 11h                           │
              └─────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   5A. Data Pipeline     │   │   5B. ML Preparation    │
│   ───────────────────   │   │   ───────────────────   │
│   - Training extraction │   │   - Readiness checklist │
│   - Privacy scrubbing   │   │   - Task router proto   │
│   - Dataset curation    │   │   - Quality predictor   │
│                         │   │                         │
│   BLOCKING: 4B, 4C      │   │   BLOCKING: 5A          │
│   EFFORT: 17h           │   │   EFFORT: 20h           │
└─────────────────────────┘   └─────────────────────────┘
```

---

## Critical Path

The critical path determines minimum project duration:

```
Phase 1 → 2A → 3A → 3C → 4A → 4C → 4D → 5A → 5B
           │
           └→ Total: 14 weeks
```

**Parallel Opportunities:**
- 2B, 2C can run parallel to 2A
- 3B, 3D can run parallel to 3A, 3C
- 4A, 4B can run in parallel

---

## Technical Specifications

### Database Schemas (Drizzle ORM)

```typescript
// shared/schema.ts

import { pgTable, text, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// RUN OUTCOMES - Tracks success/failure of each agent invocation
// ═══════════════════════════════════════════════════════════════

export const runOutcomes = pgTable("run_outcomes", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  agentType: text("agent_type").notNull(), // architect | mechanic | ninja | philosopher
  outcomeStatus: text("outcome_status").notNull(), // accepted | rejected | edited | ignored
  editDistance: integer("edit_distance"), // Levenshtein distance if edited
  timeToDecision: integer("time_to_decision_ms"), // Milliseconds to accept/reject
  grokAgreed: boolean("grok_agreed"),
  classicMetrics: jsonb("classic_metrics").$type<CLASSicMetrics>(),
  promptVersion: text("prompt_version"), // Links to prompt_variants.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRunOutcomeSchema = createInsertSchema(runOutcomes).omit({ id: true, createdAt: true });
export type InsertRunOutcome = z.infer<typeof insertRunOutcomeSchema>;
export type RunOutcome = typeof runOutcomes.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// HUMAN FEEDBACK - User ratings and tags for responses
// ═══════════════════════════════════════════════════════════════

export const humanFeedback = pgTable("human_feedback", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runOutcomes.runId),
  rating: integer("rating"), // 1-5 stars
  tags: text("tags").array(), // ["too_verbose", "incorrect", "helpful"]
  comment: text("comment"), // Sanitized, no PII
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertHumanFeedbackSchema = createInsertSchema(humanFeedback).omit({ id: true, submittedAt: true });
export type InsertHumanFeedback = z.infer<typeof insertHumanFeedbackSchema>;
export type HumanFeedback = typeof humanFeedback.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// PROMPT VARIANTS - Versioned prompts for A/B testing
// ═══════════════════════════════════════════════════════════════

export const promptVariants = pgTable("prompt_variants", {
  id: text("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  version: integer("version").notNull(),
  promptText: text("prompt_text").notNull(),
  status: text("status").notNull(), // shadow | ab_test | promoted | retired
  trafficPercent: integer("traffic_percent").default(0), // 0-100
  metrics: jsonb("metrics").$type<PromptMetrics>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  promotedAt: timestamp("promoted_at"),
  retiredAt: timestamp("retired_at"),
});

export const insertPromptVariantSchema = createInsertSchema(promptVariants).omit({ id: true, createdAt: true });
export type InsertPromptVariant = z.infer<typeof insertPromptVariantSchema>;
export type PromptVariant = typeof promptVariants.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// MEMORY ENTRIES - High-quality examples for RAG
// ═══════════════════════════════════════════════════════════════

export const memoryEntries = pgTable("memory_entries", {
  id: text("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  taskDescription: text("task_description").notNull(),
  taskEmbedding: real("task_embedding").array(), // Vector for similarity search
  response: text("response").notNull(),
  qualityScore: real("quality_score").notNull(), // Derived from feedback
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Retention policy
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({ id: true, createdAt: true, accessCount: true });
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntries.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════

export interface CLASSicMetrics {
  cost: number;
  latency: number;
  accuracy: number;
  security: number;
  stability: number;
}

export interface PromptMetrics {
  acceptanceRate: number;
  avgEditDistance: number;
  avgLatency: number;
  sampleSize: number;
  pValue?: number; // Statistical significance
}

export const FEEDBACK_TAGS = [
  "too_verbose",
  "too_brief",
  "incorrect",
  "off_topic",
  "helpful",
  "creative",
  "slow",
  "confusing",
] as const;

export type FeedbackTag = typeof FEEDBACK_TAGS[number];
```

### Core Interfaces

```typescript
// src/types.ts additions

// ═══════════════════════════════════════════════════════════════
// LOGGER CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface LoggerConfig {
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  destination: "stdout" | "file" | "http";
  filePath?: string;
  httpEndpoint?: string;
  prettyPrint: boolean;
  redactPrompts: boolean;
  redactPatterns: RegExp[];
  stream?: NodeJS.WritableStream; // For DI testing
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: "info",
  destination: "stdout",
  prettyPrint: false,
  redactPrompts: true,
  redactPatterns: [/api_key/i, /password/i, /secret/i, /token/i],
};

// ═══════════════════════════════════════════════════════════════
// DEBUG TOOLKIT
// ═══════════════════════════════════════════════════════════════

export interface RunDiagnostics {
  runId: string;
  agentType: AgentType;
  duration: number;
  outcomeStatus?: string;
  validationSummary: {
    passed: number;
    failed: number;
    failedChecks: string[];
  };
  securityEvents: SecurityEvent[];
  metrics?: CLASSicMetrics;
  grokAnalysis?: {
    agreed: boolean;
    reasoning?: string;
  };
}

export interface SecurityEvent {
  eventType: "prompt_injection" | "unsafe_code" | "pii_detected";
  blocked: boolean;
  details: string;
  timestamp: Date;
}

export interface ExportedRunBundle {
  version: string;
  exportedAt: Date;
  runId: string;
  diagnostics: RunDiagnostics;
  logs: SanitizedLogEntry[];
  config: Partial<LoggerConfig>; // Redacted
}

// ═══════════════════════════════════════════════════════════════
// PROMPT EXPERIMENT MANAGER
// ═══════════════════════════════════════════════════════════════

export interface PromptExperiment {
  id: string;
  controlVariantId: string;
  treatmentVariantId: string;
  agentType: AgentType;
  status: "running" | "completed" | "cancelled";
  trafficSplit: number; // 0-100 percent to treatment
  startedAt: Date;
  endedAt?: Date;
  results?: ExperimentResults;
}

export interface ExperimentResults {
  controlMetrics: PromptMetrics;
  treatmentMetrics: PromptMetrics;
  pValue: number;
  winner: "control" | "treatment" | "inconclusive";
  sampleSize: number;
}

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTICS ROUTER
// ═══════════════════════════════════════════════════════════════

export interface DiagnosticsOptions {
  requireAuth: boolean;
  authToken?: string;
  includeConfig: boolean;
  includeLastRun: boolean;
  maxRunHistory: number;
}

export const DEFAULT_DIAGNOSTICS_OPTIONS: DiagnosticsOptions = {
  requireAuth: false,
  includeConfig: true,
  includeLastRun: true,
  maxRunHistory: 10,
};
```

### Function Signatures

```typescript
// src/logger.ts additions

/**
 * Create a configured logger instance for consumers
 * @param config - Optional configuration, uses env vars as fallback
 * @returns Configured Logger instance
 */
export function createAgentLogger(config?: Partial<LoggerConfig>): Logger;

/**
 * Update logger configuration at runtime
 * @param config - Partial config to merge with current
 */
export function setLoggerConfig(config: Partial<LoggerConfig>): void;

/**
 * Get current logger configuration (redacted for security)
 * @returns Current config with sensitive values masked
 */
export function getLoggerConfig(): Partial<LoggerConfig>;

/**
 * Resolve configuration from environment variables
 * @returns Config derived from AI_AGENTS_* env vars
 */
export function resolveEnvConfig(): Partial<LoggerConfig>;


// src/debug-toolkit.ts

export class DebugToolkit {
  constructor(logger: Logger, options?: { maxHistory?: number });

  /**
   * Capture diagnostics from the most recent run
   * @returns Full diagnostics including validation, security, metrics
   */
  captureLastRun(): RunDiagnostics | null;

  /**
   * Get diagnostics for a specific run by ID
   * @param runId - The run identifier
   */
  getRunDiagnostics(runId: string): RunDiagnostics | null;

  /**
   * Get validation summary for a run
   * @param runId - The run identifier
   */
  getValidationSummary(runId: string): ValidationSummary | null;

  /**
   * Export a sanitized run bundle for support tickets
   * @param runId - The run identifier
   * @returns Sanitized bundle safe to share externally
   */
  exportRunBundle(runId: string): ExportedRunBundle | null;

  /**
   * Get run history (most recent N runs)
   * @param limit - Maximum runs to return
   */
  getRunHistory(limit?: number): RunDiagnostics[];
}


// src/diagnostics-router.ts

import { Router } from "express";

/**
 * Create Express router with diagnostic endpoints
 * @param options - Configuration for auth and included data
 * @returns Express Router with /health, /config, /last-run endpoints
 */
export function createDiagnosticsRouter(options?: Partial<DiagnosticsOptions>): Router;


// src/prompt-experiment.ts

export class PromptExperimentManager {
  constructor(storage: IStorage, logger: Logger);

  /**
   * Start a new A/B experiment
   * @param agentType - Which agent to experiment on
   * @param treatmentPrompt - New prompt to test
   * @param trafficPercent - Percentage of traffic to treatment (default 10)
   */
  startExperiment(
    agentType: AgentType,
    treatmentPrompt: string,
    trafficPercent?: number
  ): Promise<PromptExperiment>;

  /**
   * Get the prompt variant to use for a request
   * @param agentType - Which agent is being invoked
   * @returns The prompt variant (control or treatment)
   */
  getActiveVariant(agentType: AgentType): Promise<PromptVariant>;

  /**
   * Record outcome for a variant
   * @param variantId - Which variant was used
   * @param outcome - The outcome to record
   */
  recordOutcome(variantId: string, outcome: InsertRunOutcome): Promise<void>;

  /**
   * Check if experiment has reached significance
   * @param experimentId - The experiment to check
   * @returns Results if significant, null if still running
   */
  checkSignificance(experimentId: string): Promise<ExperimentResults | null>;

  /**
   * Promote winning variant to production
   * @param experimentId - The completed experiment
   */
  promoteWinner(experimentId: string): Promise<void>;

  /**
   * Rollback to previous promoted variant
   * @param agentType - Which agent to rollback
   */
  rollback(agentType: AgentType): Promise<void>;
}
```

---

## Regression Test Requirements

### Phase 2 Regression Gate

| Component | Test File | Required Tests | Coverage Target |
|-----------|-----------|----------------|-----------------|
| 2A Storage | `storage.test.ts` | 20+ | CRUD for all schemas, retention cleanup |
| 2B Logger API | `logger-config.test.ts` | 15+ | Env resolution, destinations, factory |
| 2C Security | `security.test.ts` | 15+ | Input sanitization, injection detection |
| 2D Privacy | `privacy.test.ts` | 12+ | PII redaction, consent, GDPR endpoints |
| **Total** | | **62+** | |

```typescript
// Example: src/__tests__/storage.test.ts

describe("RunOutcome Storage", () => {
  it("should create run outcome with all fields", async () => { ... });
  it("should query outcomes by agent type", async () => { ... });
  it("should calculate acceptance rate", async () => { ... });
  it("should enforce retention policy cleanup", async () => { ... });
  it("should link feedback to outcomes", async () => { ... });
});

describe("PromptVariant Storage", () => {
  it("should create variant with shadow status", async () => { ... });
  it("should update metrics on outcome recording", async () => { ... });
  it("should promote variant and retire previous", async () => { ... });
  it("should rollback to previous promoted version", async () => { ... });
});

// Example: src/__tests__/logger-config.test.ts

describe("Logger Configuration", () => {
  it("should use default config when no options provided", () => { ... });
  it("should resolve AI_AGENTS_LOG_LEVEL from env", () => { ... });
  it("should resolve AI_AGENTS_DEBUG to trace level", () => { ... });
  it("should write to file when destination is file", () => { ... });
  it("should pretty print when AI_AGENTS_PRETTY=true", () => { ... });
  it("should redact patterns in log output", () => { ... });
  it("should throw on invalid log level", () => { ... });
});
```

### Phase 3 Regression Gate

| Component | Test File | Required Tests | Coverage Target |
|-----------|-----------|----------------|-----------------|
| 3A Outcomes | `outcome-tracking.test.ts` | 15+ | Edit distance, time tracking, Grok |
| 3B Debug Toolkit | `debug-toolkit.test.ts` | 12+ | Capture, export, sanitization |
| 3C Feedback UI | `feedback.test.ts` | 10+ | API, validation, storage |
| 3D CLI/Endpoints | `diagnostics.test.ts` | 10+ | CLI output, router, auth |
| **Integration** | `e2e-feedback.test.ts` | 8+ | Full flow: invoke → feedback → storage |
| **Total** | | **55+** | |

### Phase 4 Regression Gate

| Component | Test File | Required Tests | Coverage Target |
|-----------|-----------|----------------|-----------------|
| 4A Prompts | `prompt-experiment.test.ts` | 18+ | A/B, significance, promotion |
| 4B Memory | `memory-store.test.ts` | 15+ | Embeddings, retrieval, TTL |
| 4C Meta-Eval | `meta-evaluation.test.ts` | 10+ | Analysis, reports, suggestions |
| 4D Dashboard | `analytics.test.ts` | 8+ | Data aggregation, charts |
| **Integration** | `e2e-learning.test.ts` | 10+ | Full learning loop |
| **Total** | | **61+** | |

### Phase 5 Regression Gate

| Component | Test File | Required Tests | Coverage Target |
|-----------|-----------|----------------|-----------------|
| 5A Data Pipeline | `data-pipeline.test.ts` | 12+ | Extraction, scrubbing, export |
| 5B ML Prep | `ml-shadow.test.ts` | 10+ | Shadow mode, predictions |
| **Total** | | **22+** | |

---

## Risk Matrix

| Phase | Risk | Likelihood | Impact | Mitigation |
|-------|------|------------|--------|------------|
| 2A | Schema drift between storage and types | Medium | High | Generate types from Drizzle, contract tests |
| 2B | Env var conflicts with consumer apps | Low | Medium | Use unique prefix `AI_AGENTS_*` |
| 2C | False positives in injection detection | Medium | Medium | Tunable patterns, allow-list escape hatch |
| 2D | PII leakage in logs | Medium | Critical | Redaction by default, audit all log calls |
| 3A | Edit distance calculation performance | Low | Low | Cache, async processing |
| 3B | Sensitive data in exported bundles | Medium | High | Multi-layer sanitization, review before export |
| 3C | Feedback spam/gaming | Medium | Medium | Rate limiting, anomaly detection |
| 3D | Diagnostic endpoints exposed publicly | Low | Critical | Auth required by default, RBAC |
| 4A | A/B test reaches wrong conclusion | Medium | High | Require p < 0.05, minimum sample size 100 |
| 4B | Vector store scaling bottleneck | Medium | Medium | Indexing, retention limits, lazy loading |
| 4C | Philosopher generates bad suggestions | Low | Medium | Human review before prompt changes |
| 5A | Training data contains PII | Medium | Critical | Differential privacy, scrubbing pipeline |
| 5B | ML model drift in production | Medium | High | Shadow mode, monitoring, auto-rollback |

---

## Rollback Procedures

### Database Migration Rollback

```bash
# Generate rollback migration
npm run drizzle:generate -- --name rollback_phase2

# Apply rollback
npm run drizzle:migrate:down

# Verify schema state
npm run drizzle:check
```

### Prompt Version Rollback

```typescript
// Automatic rollback if metrics degrade
async function checkAndRollback(agentType: AgentType) {
  const current = await getPromotedVariant(agentType);
  const previous = await getPreviousPromotedVariant(agentType);
  
  if (current.metrics.acceptanceRate < previous.metrics.acceptanceRate * 0.9) {
    await rollbackPrompt(agentType);
    logger.warn("Auto-rollback triggered", { agentType, reason: "acceptance_rate_drop" });
  }
}
```

### Feature Flag Rollback

```typescript
// All new features behind flags
const FEATURE_FLAGS = {
  enableOutcomeTracking: process.env.FF_OUTCOME_TRACKING === "true",
  enablePromptAB: process.env.FF_PROMPT_AB === "true",
  enableMemoryStore: process.env.FF_MEMORY_STORE === "true",
  enableMLShadow: process.env.FF_ML_SHADOW === "true",
};

// Disable feature instantly via env var
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
```

---

## Mechanic Review

**Reviewer:** The Mechanic  
**Status:** APPROVED with recommendations

### Findings

1. **Migration Rollback Scripts** (Recommendation)
   - Add automated rollback scripts for each schema migration
   - Include data backup before destructive migrations
   - ✅ Added rollback procedures section

2. **Uniform Error Codes** (Recommendation)
   - Extend AgentErrorCode enum for new failure modes
   - Ensure all storage/network errors have codes
   - ✅ Will extend in Phase 2A implementation

3. **CLI Redaction Compliance** (Critical)
   - CLI diagnostics command must respect redaction settings
   - Never output API keys or PII even in debug mode
   - ✅ Added to 3D requirements

4. **Error Recovery Paths** (Recommendation)
   - Add circuit breaker for storage failures
   - Graceful degradation when memory store unavailable
   - ✅ Added to Phase 4B implementation

### Sign-off

> "The plan addresses core maintainability concerns. Critical path is well-defined. Error taxonomy extension and migration rollbacks are essential before Phase 2 deployment. Approved to proceed."
>
> — The Mechanic, January 2026

---

## Code Ninja Review

**Reviewer:** The Code Ninja  
**Status:** APPROVED with optimizations

### Findings

1. **Code Reuse Opportunities** (Optimization)
   - Shared telemetry client for all storage operations
   - Unified sanitization utility for logs, exports, and training data
   - Storage adapter pattern for MemStorage ↔ PostgreSQL
   - ✅ Added to Phase 2A shared infrastructure

2. **Contract Tests** (Critical)
   - Add contract tests between storage interface and implementations
   - Ensure type safety across API boundaries
   - ✅ Added to Phase 2 regression requirements

3. **E2E Smoke Tests** (Recommendation)
   - Add smoke test per release (invoke → feedback → learning)
   - Run before each deployment
   - ✅ Added integration tests to Phase 3/4 gates

4. **Performance Considerations** (Optimization)
   - Batch outcome writes for high-throughput scenarios
   - Lazy-load vector embeddings
   - Cache frequently-used prompt variants
   - ✅ Added to Phase 4 implementation notes

5. **Testing Strategy** (Approved)
   - 200+ tests across all phases is sufficient
   - Real payload verification pattern from Phase 1 should continue
   - Integration tests with mocked external services

### Sign-off

> "Implementation is feasible within the timeline. Reuse patterns will reduce effort by ~15%. Contract tests are non-negotiable for API stability. Phase-by-phase regression gates ensure quality. Ready to execute."
>
> — The Code Ninja, January 2026

---

## Timeline Summary

| Phase | Weeks | Effort | Tests | Gate |
|-------|-------|--------|-------|------|
| 2 | 1-3 | 48h | 62+ | Storage + Logger + Security + Privacy |
| 3 | 4-6 | 45h | 55+ | Feedback + Diagnostics |
| 4 | 7-10 | 58h | 61+ | Learning Infrastructure |
| 5 | 11-14 | 37h | 22+ | ML Readiness |
| **Total** | **14 weeks** | **188h** | **200+** | |

---

## Success Metrics

| Metric | Baseline | Phase 3 | Phase 4 | Phase 5 |
|--------|----------|---------|---------|---------|
| Acceptance Rate | TBD | +10% | +20% | +30% |
| Avg Edit Distance | TBD | -10% | -25% | -40% |
| Test Coverage | 107 | 169+ | 230+ | 252+ |
| Security Scan | N/A | Pass | Pass | Pass |
| Human Feedback Collected | 0 | 500+ | 5,000+ | 10,000+ |

---

## Next Steps

1. **Immediate**: Create storage schemas and migrations (2A.1-2A.3)
2. **Week 1**: Parallel implementation of 2B (Logger API) and 2C (Security)
3. **Week 2**: Complete 2D (Privacy), run Phase 2 regression suite
4. **Week 3**: Phase 2 sign-off, demo to stakeholders, begin Phase 3
