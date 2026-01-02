# AI Agent Monitor Implementation Plan

**Version:** 1.0  
**Date:** January 2, 2026  
**Status:** PROPOSED - Pending Review  
**Method:** 3-Pass Optimized Workflow (8 AI Calls)  
**Reference:** docs/AI_AGENT_MONITOR_PROPOSAL.md

---

## Executive Summary

This implementation plan details the technical specifications for building the AI Agent Monitor & Guidelines System. Following the approved 3-Pass Optimized Workflow structure with Code Ninja execution in Pass 3 after validation.

**Implementation Targets:**
- 8 AI calls per workflow (matching approved spec)
- 15% Philosopher trigger threshold
- Code Ninja executes after joint validation in Pass 3
- Integrates with existing ML infrastructure (OutcomeLearner, MemoryManager, PromptOptimizer)
- Full QA and documentation standards

---

## Part 1: Meta-Goals & Opportunities (PHILOSOPHER - Pass 1)

| Goal | Metric | Target |
|------|--------|--------|
| Cross-Agent Monitoring | Report processing rate | >100 reports/min |
| Failure Pattern Detection | Detection accuracy | >90% |
| Guidelines Generation | Time to generate | <30 sec |
| ML Integration | Test coverage | >80% |
| API Security | Auth success rate | 100% |

**Adjacent Opportunities (stored in ML):**
- ADJ-001: Webhook-based real-time reporting for CI/CD integration
- ADJ-002: Browser extension for Cursor/Copilot monitoring
- ADJ-003: Automated PR labeling based on agent type detection

---

## Part 2: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT MONITOR SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                         API LAYER (server/routes.ts)                       │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │  POST /api/agents/external/report   - Receive external agent reports      │ │
│  │  GET  /api/agents/guidelines/:id    - Get project guidelines             │ │
│  │  POST /api/agents/guidelines/gen    - Force regenerate guidelines        │ │
│  │  GET  /api/agents/analytics         - Get failure analytics              │ │
│  │  GET  /api/agents/analytics/export  - Export CSV/JSON                    │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                      CORE MODULES (src/monitor/)                          │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                           │ │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │ │
│  │  │ report-         │   │ failure-        │   │ guidelines-     │        │ │
│  │  │ processor.ts    │──▶│ detector.ts     │──▶│ generator.ts    │        │ │
│  │  │                 │   │                 │   │                 │        │ │
│  │  │ • Validate      │   │ • Pattern match │   │ • Template      │        │ │
│  │  │ • Normalize     │   │ • Categorize    │   │ • AGENT_RULES   │        │ │
│  │  │ • Queue         │   │ • Severity      │   │ • Confidence    │        │ │
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘        │ │
│  │           │                     │                     │                  │ │
│  │           └─────────────────────┼─────────────────────┘                  │ │
│  │                                 ▼                                        │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐  │ │
│  │  │                      analytics.ts                                  │  │ │
│  │  │  • Aggregate metrics    • Trend analysis    • Export formats     │  │ │
│  │  └───────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                    STORAGE LAYER (shared/schema.ts + storage.ts)          │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │  agentReports table    │  projectGuidelines table  │  failurePatterns    │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │               EXISTING ML INFRASTRUCTURE (server/agents/learning/)        │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │  OutcomeLearner.ts  │  MemoryManager.ts  │  PromptOptimizer.ts           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Technical Specifications

### 3.1 Database Schema Extensions (shared/schema.ts)

```typescript
// ============================================
// AGENT REPORTS TABLE
// ============================================

export const agentReports = pgTable("agent_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification
  projectId: text("project_id").notNull(),
  agentType: text("agent_type").notNull().$type<ExternalAgentType>(),
  agentVersion: text("agent_version"),
  sessionId: text("session_id"),
  
  // Outcome
  outcome: text("outcome").notNull().$type<AgentOutcome>(),
  
  // Failure Details
  failureCategory: text("failure_category").$type<FailureCategory>(),
  failureSeverity: text("failure_severity").$type<FailureSeverity>(),
  
  // Task Context
  taskCategory: text("task_category").notNull().$type<TaskCategory>(),
  taskComplexity: text("task_complexity").$type<TaskComplexity>(),
  
  // Modification Tracking
  modificationPercent: integer("modification_percent"),
  linesChanged: integer("lines_changed"),
  filesAffected: integer("files_affected"),
  
  // Error Details
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  
  // Human Feedback
  humanNotes: text("human_notes"),
  correctApproach: text("correct_approach"),
  
  // Code Context (JSON blob)
  codeContext: jsonb("code_context").$type<CodeContext | null>(),
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: timestamp("processed_at"),
});

export type ExternalAgentType = "replit" | "cursor" | "copilot" | "claude" | "custom";
export type AgentOutcome = "accepted" | "rejected" | "modified" | "error";
export type FailureCategory = 
  | "logic_error"
  | "context_blindness"
  | "security_gap"
  | "outdated_api"
  | "missing_edge_case"
  | "poor_readability"
  | "broke_existing"
  | "hallucinated_code";
export type FailureSeverity = "critical" | "high" | "medium" | "low";
export type TaskCategory = "feature" | "bugfix" | "refactor" | "security" | "docs" | "test";
export type TaskComplexity = "simple" | "moderate" | "complex";

export interface CodeContext {
  language: string;
  framework?: string;
  originalCode?: string;
  correctedCode?: string;
  diff?: string;
}

export const insertAgentReportSchema = createInsertSchema(agentReports).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export type InsertAgentReport = z.infer<typeof insertAgentReportSchema>;
export type AgentReport = typeof agentReports.$inferSelect;

// ============================================
// PROJECT GUIDELINES TABLE
// ============================================

export const projectGuidelines = pgTable("project_guidelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Project Identification
  projectId: text("project_id").notNull().unique(),
  
  // Generated Content
  markdown: text("markdown").notNull(),
  
  // Metadata
  observationCount: integer("observation_count").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),
  
  // Rule Counts
  criticalRuleCount: integer("critical_rule_count").default(0),
  highRuleCount: integer("high_rule_count").default(0),
  mediumRuleCount: integer("medium_rule_count").default(0),
  
  // Agent Performance Scores
  agentScores: jsonb("agent_scores").$type<Record<ExternalAgentType, number>>(),
  
  // Timestamps
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastUpdatedAt: timestamp("last_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertProjectGuidelinesSchema = createInsertSchema(projectGuidelines).omit({
  id: true,
  generatedAt: true,
  lastUpdatedAt: true,
});

export type InsertProjectGuidelines = z.infer<typeof insertProjectGuidelinesSchema>;
export type ProjectGuidelines = typeof projectGuidelines.$inferSelect;

// ============================================
// FAILURE PATTERNS TABLE (for ML learning)
// ============================================

export const failurePatterns = pgTable("failure_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pattern Details
  category: text("category").notNull().$type<FailureCategory>(),
  context: text("context").notNull(),
  failedApproach: text("failed_approach").notNull(),
  correctApproach: text("correct_approach").notNull(),
  
  // ML Data
  embedding: real("embedding").array(),
  
  // Frequency Tracking
  frequency: integer("frequency").notNull().default(1),
  lastSeen: timestamp("last_seen").default(sql`CURRENT_TIMESTAMP`).notNull(),
  
  // Source Tracking
  sourceProjects: text("source_projects").array(),
  sourceAgents: text("source_agents").array().$type<ExternalAgentType[]>(),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFailurePatternSchema = createInsertSchema(failurePatterns).omit({
  id: true,
  createdAt: true,
});

export type InsertFailurePattern = z.infer<typeof insertFailurePatternSchema>;
export type FailurePattern = typeof failurePatterns.$inferSelect;
```

### 3.2 Storage Interface Extensions (server/storage.ts)

```typescript
// Add to IDataTelemetry interface:

export interface IAgentMonitor {
  // Agent Reports
  createAgentReport(report: InsertAgentReport): Promise<AgentReport>;
  getAgentReport(id: string): Promise<AgentReport | undefined>;
  getReportsByProject(projectId: string, limit?: number): Promise<AgentReport[]>;
  getReportsByAgent(agentType: ExternalAgentType, limit?: number): Promise<AgentReport[]>;
  getReportsByCategory(category: FailureCategory, limit?: number): Promise<AgentReport[]>;
  getReportsInTimeRange(start: Date, end: Date): Promise<AgentReport[]>;
  markReportProcessed(id: string): Promise<void>;
  
  // Project Guidelines
  createGuidelines(guidelines: InsertProjectGuidelines): Promise<ProjectGuidelines>;
  getGuidelines(projectId: string): Promise<ProjectGuidelines | undefined>;
  updateGuidelines(projectId: string, updates: Partial<InsertProjectGuidelines>): Promise<ProjectGuidelines | undefined>;
  listAllGuidelines(): Promise<ProjectGuidelines[]>;
  
  // Failure Patterns
  createFailurePattern(pattern: InsertFailurePattern): Promise<FailurePattern>;
  findSimilarPatterns(embedding: number[], limit?: number): Promise<FailurePattern[]>;
  incrementPatternFrequency(id: string): Promise<void>;
  getTopPatterns(category: FailureCategory, limit?: number): Promise<FailurePattern[]>;
  
  // Analytics
  getFailureStats(agentType?: ExternalAgentType): Promise<FailureStats>;
  getAgentPerformance(agentType: ExternalAgentType): Promise<AgentPerformance>;
  getTrends(days: number): Promise<TrendData[]>;
}

export interface FailureStats {
  totalReports: number;
  successRate: number;
  failuresByCategory: Record<FailureCategory, number>;
  failuresBySeverity: Record<FailureSeverity, number>;
}

export interface AgentPerformance {
  agentType: ExternalAgentType;
  totalReports: number;
  successRate: number;
  avgModificationPercent: number;
  topFailures: FailureCategory[];
  trend: "improving" | "stable" | "degrading";
}

export interface TrendData {
  date: string;
  totalReports: number;
  successRate: number;
  failuresByCategory: Record<FailureCategory, number>;
}
```

### 3.3 Core Modules

#### 3.3.1 Report Processor (src/monitor/report-processor.ts)

```typescript
import { z } from "zod";
import type { InsertAgentReport, AgentReport, FailureCategory, FailureSeverity } from "@shared/schema";
import type { IAgentMonitor } from "../storage";
import { FailureDetector } from "./failure-detector";
import { GuidelinesGenerator } from "./guidelines-generator";

// Validation schema for incoming reports
export const externalReportSchema = z.object({
  projectId: z.string().min(1).max(256),
  agentType: z.enum(["replit", "cursor", "copilot", "claude", "custom"]),
  agentVersion: z.string().optional(),
  sessionId: z.string().optional(),
  outcome: z.enum(["accepted", "rejected", "modified", "error"]),
  failureCategory: z.enum([
    "logic_error",
    "context_blindness",
    "security_gap",
    "outdated_api",
    "missing_edge_case",
    "poor_readability",
    "broke_existing",
    "hallucinated_code",
  ]).optional(),
  failureSeverity: z.enum(["critical", "high", "medium", "low"]).optional(),
  taskCategory: z.enum(["feature", "bugfix", "refactor", "security", "docs", "test"]),
  taskComplexity: z.enum(["simple", "moderate", "complex"]).optional(),
  modificationPercent: z.number().min(0).max(100).optional(),
  linesChanged: z.number().min(0).optional(),
  filesAffected: z.number().min(0).optional(),
  errorMessage: z.string().max(10000).optional(),
  humanNotes: z.string().max(10000).optional(),
  correctApproach: z.string().max(10000).optional(),
  codeContext: z.object({
    language: z.string(),
    framework: z.string().optional(),
    originalCode: z.string().max(50000).optional(),
    correctedCode: z.string().max(50000).optional(),
    diff: z.string().max(100000).optional(),
  }).optional(),
});

export type ExternalReport = z.infer<typeof externalReportSchema>;

export interface ProcessorConfig {
  autoDetectFailures: boolean;
  autoUpdateGuidelines: boolean;
  criticalAlertThreshold: number;  // Number of critical failures before alert
  guidelinesUpdateInterval: number; // Seconds between guideline updates
  ruleCreationThreshold: number;    // Failures before rule is created
  retentionDays: number;            // Days to retain reports
  crossProjectLearning: boolean;    // Enable cross-project pattern sharing
}

const DEFAULT_PROCESSOR_CONFIG: ProcessorConfig = {
  autoDetectFailures: true,
  autoUpdateGuidelines: true,
  criticalAlertThreshold: 3,        // Alert after 3 critical failures
  guidelinesUpdateInterval: 300,    // 5 minutes debounce
  ruleCreationThreshold: 3,         // 3+ failures to create rule
  retentionDays: 60,                // 60-day retention
  crossProjectLearning: false,      // Opt-in only
};

export class ReportProcessor {
  private storage: IAgentMonitor;
  private config: ProcessorConfig;
  private failureDetector: FailureDetector;
  private guidelinesGenerator: GuidelinesGenerator;
  private pendingUpdates: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    storage: IAgentMonitor,
    config: Partial<ProcessorConfig> = {}
  ) {
    this.storage = storage;
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config };
    this.failureDetector = new FailureDetector();
    this.guidelinesGenerator = new GuidelinesGenerator(storage);
  }

  async processReport(rawReport: unknown): Promise<{
    success: boolean;
    reportId: string;
    processed: boolean;
    detectedFailure?: FailureCategory;
    recommendations?: string[];
    error?: string;
  }> {
    // 1. Validate incoming report
    const validation = externalReportSchema.safeParse(rawReport);
    if (!validation.success) {
      return {
        success: false,
        reportId: "",
        processed: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const report = validation.data;

    // 2. Auto-detect failure category if not provided
    let failureCategory = report.failureCategory;
    let failureSeverity = report.failureSeverity;

    if (this.config.autoDetectFailures && !failureCategory && report.outcome !== "accepted") {
      const detection = this.failureDetector.detect(report);
      failureCategory = detection.category;
      failureSeverity = failureSeverity || detection.severity;
    }

    // 3. Create report in storage
    const insertData: InsertAgentReport = {
      projectId: report.projectId,
      agentType: report.agentType,
      agentVersion: report.agentVersion,
      sessionId: report.sessionId,
      outcome: report.outcome,
      failureCategory: failureCategory,
      failureSeverity: failureSeverity,
      taskCategory: report.taskCategory,
      taskComplexity: report.taskComplexity,
      modificationPercent: report.modificationPercent,
      linesChanged: report.linesChanged,
      filesAffected: report.filesAffected,
      errorMessage: report.errorMessage,
      humanNotes: report.humanNotes,
      correctApproach: report.correctApproach,
      codeContext: report.codeContext || null,
    };

    const savedReport = await this.storage.createAgentReport(insertData);

    // 4. Extract learnable pattern if failure was corrected
    if (failureCategory && report.correctApproach) {
      await this.extractAndStorePattern(savedReport, report.correctApproach);
    }

    // 5. Schedule guidelines update (debounced)
    if (this.config.autoUpdateGuidelines) {
      this.scheduleGuidelinesUpdate(report.projectId);
    }

    // 6. Mark as processed
    await this.storage.markReportProcessed(savedReport.id);

    // 7. Get recommendations for immediate feedback
    const recommendations = failureCategory
      ? this.failureDetector.getRecommendations(failureCategory)
      : [];

    return {
      success: true,
      reportId: savedReport.id,
      processed: true,
      detectedFailure: failureCategory,
      recommendations,
    };
  }

  private async extractAndStorePattern(
    report: AgentReport,
    correctApproach: string
  ): Promise<void> {
    if (!report.failureCategory) return;

    const context = this.buildPatternContext(report);
    const embedding = this.guidelinesGenerator.generateEmbedding(context);

    // Check for similar existing patterns
    const similar = await this.storage.findSimilarPatterns(embedding, 1);
    
    if (similar.length > 0 && this.calculateSimilarity(embedding, similar[0].embedding || []) > 0.9) {
      // Increment frequency of existing pattern
      await this.storage.incrementPatternFrequency(similar[0].id);
    } else {
      // Create new pattern
      await this.storage.createFailurePattern({
        category: report.failureCategory,
        context,
        failedApproach: report.codeContext?.originalCode || report.errorMessage || "",
        correctApproach,
        embedding,
        frequency: 1,
        lastSeen: new Date(),
        sourceProjects: [report.projectId],
        sourceAgents: [report.agentType as any],
      });
    }
  }

  private buildPatternContext(report: AgentReport): string {
    return [
      `Task: ${report.taskCategory}`,
      `Agent: ${report.agentType}`,
      report.errorMessage ? `Error: ${report.errorMessage}` : "",
      report.humanNotes ? `Notes: ${report.humanNotes}` : "",
    ].filter(Boolean).join(" | ");
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magA && magB ? dotProduct / (magA * magB) : 0;
  }

  private scheduleGuidelinesUpdate(projectId: string): void {
    // Clear any existing pending update for this project
    const existing = this.pendingUpdates.get(projectId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new update with debounce
    const timeout = setTimeout(async () => {
      await this.guidelinesGenerator.regenerate(projectId);
      this.pendingUpdates.delete(projectId);
    }, this.config.guidelinesUpdateInterval * 1000);

    this.pendingUpdates.set(projectId, timeout);
  }
}
```

#### 3.3.2 Failure Detector (src/monitor/failure-detector.ts)

```typescript
import type { FailureCategory, FailureSeverity, ExternalAgentType } from "@shared/schema";
import type { ExternalReport } from "./report-processor";

export interface DetectionResult {
  category: FailureCategory;
  severity: FailureSeverity;
  confidence: number;
  matchedRules: string[];
}

export interface DetectionRule {
  id: string;
  category: FailureCategory;
  patterns: RegExp[];
  keywords: string[];
  severity: FailureSeverity;
  recommendation: string;
}

// Built-in detection rules based on 2025 research
const DETECTION_RULES: DetectionRule[] = [
  // Security gaps (2.74x higher in AI code)
  {
    id: "SEC-001",
    category: "security_gap",
    patterns: [
      /password\s*[=:]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/gi,
      /secret\s*[=:]\s*['"][^'"]+['"]/gi,
      /bearer\s+[a-zA-Z0-9_-]+/gi,
    ],
    keywords: ["hardcoded", "exposed", "leaked", "credential", "token"],
    severity: "critical",
    recommendation: "Use environment variables or secrets manager. Never hardcode credentials.",
  },
  {
    id: "SEC-002",
    category: "security_gap",
    patterns: [
      /eval\s*\(/gi,
      /innerHTML\s*=/gi,
      /dangerouslySetInnerHTML/gi,
    ],
    keywords: ["xss", "injection", "unsafe", "unsanitized"],
    severity: "critical",
    recommendation: "Sanitize all user input. Use safe DOM manipulation methods.",
  },
  
  // Logic errors (1.75x higher in AI code)
  {
    id: "LOG-001",
    category: "logic_error",
    patterns: [
      /===?\s*(null|undefined)\s*\|\|/gi,
      /\w+\s*==\s*\w+/g,  // Using == instead of ===
    ],
    keywords: ["undefined", "NaN", "infinite", "wrong", "incorrect"],
    severity: "high",
    recommendation: "Use strict equality (===) and proper null checks.",
  },
  {
    id: "LOG-002",
    category: "logic_error",
    patterns: [
      /while\s*\(true\)/gi,
      /for\s*\(\s*;\s*;\s*\)/gi,
    ],
    keywords: ["infinite loop", "hang", "freeze", "timeout"],
    severity: "high",
    recommendation: "Ensure all loops have proper termination conditions.",
  },
  
  // Context blindness (most common in Replit agents)
  {
    id: "CTX-001",
    category: "context_blindness",
    patterns: [
      /import\s+React\s+from\s+['"]react['"]/gi,  // Unnecessary in modern setups
    ],
    keywords: ["convention", "style", "pattern", "standard", "existing"],
    severity: "medium",
    recommendation: "Review project conventions in replit.md or AGENT_RULES.md before coding.",
  },
  {
    id: "CTX-002",
    category: "context_blindness",
    patterns: [
      /console\.log\s*\(/gi,  // Left in production code
    ],
    keywords: ["debug", "forgot", "remove", "cleanup"],
    severity: "low",
    recommendation: "Remove debug statements before committing.",
  },
  
  // Broke existing functionality (regression)
  {
    id: "REG-001",
    category: "broke_existing",
    patterns: [],
    keywords: ["broke", "regression", "no longer works", "stopped working", "broke existing"],
    severity: "high",
    recommendation: "Always run existing tests before committing changes.",
  },
  
  // Hallucinated code
  {
    id: "HAL-001",
    category: "hallucinated_code",
    patterns: [],
    keywords: ["doesn't exist", "made up", "hallucinate", "fake api", "nonexistent", "fabricated"],
    severity: "high",
    recommendation: "Verify all APIs and libraries exist before using them.",
  },
  
  // Poor readability (3x worse in AI code)
  {
    id: "READ-001",
    category: "poor_readability",
    patterns: [
      /function\s+\w{1,2}\s*\(/gi,  // Single/double letter function names
      /const\s+\w{1,2}\s*=/gi,       // Single/double letter variable names
    ],
    keywords: ["unreadable", "unclear", "confusing", "no comments", "documentation"],
    severity: "medium",
    recommendation: "Use descriptive names and add documentation for complex logic.",
  },
  
  // Outdated API
  {
    id: "API-001",
    category: "outdated_api",
    patterns: [
      /componentWillMount/gi,
      /componentWillReceiveProps/gi,
      /\$.ajax/gi,
    ],
    keywords: ["deprecated", "outdated", "old version", "legacy"],
    severity: "medium",
    recommendation: "Check documentation for current API versions and methods.",
  },
  
  // Missing edge cases
  {
    id: "EDGE-001",
    category: "missing_edge_case",
    patterns: [],
    keywords: ["edge case", "null", "empty", "undefined", "boundary", "overflow", "zero"],
    severity: "medium",
    recommendation: "Always handle null, empty, and boundary conditions.",
  },
];

const RECOMMENDATIONS_BY_CATEGORY: Record<FailureCategory, string[]> = {
  security_gap: [
    "Use environment variables for all secrets",
    "Implement input validation and sanitization",
    "Follow OWASP security guidelines",
    "Run security scans before merging",
  ],
  logic_error: [
    "Use TypeScript strict mode",
    "Add unit tests for critical logic",
    "Review control flow carefully",
    "Use assertions for invariants",
  ],
  context_blindness: [
    "Read project README and conventions first",
    "Check existing code patterns before adding new code",
    "Review AGENT_RULES.md if present",
    "Follow established naming conventions",
  ],
  broke_existing: [
    "Run full test suite before committing",
    "Use feature flags for risky changes",
    "Review git diff before pushing",
    "Add regression tests for fixes",
  ],
  hallucinated_code: [
    "Verify all imports exist in package.json",
    "Check API documentation before using",
    "Test code in isolation first",
    "Don't trust AI suggestions blindly",
  ],
  poor_readability: [
    "Use descriptive variable and function names",
    "Add JSDoc comments for public APIs",
    "Follow project style guide",
    "Keep functions small and focused",
  ],
  outdated_api: [
    "Check library changelogs regularly",
    "Use TypeScript to catch deprecated APIs",
    "Review migration guides when upgrading",
    "Set up dependency update alerts",
  ],
  missing_edge_case: [
    "Consider null/undefined for all inputs",
    "Test with empty arrays and objects",
    "Handle network failures gracefully",
    "Add boundary condition tests",
  ],
};

export class FailureDetector {
  private rules: DetectionRule[];

  constructor(customRules: DetectionRule[] = []) {
    this.rules = [...DETECTION_RULES, ...customRules];
  }

  detect(report: ExternalReport): DetectionResult {
    const searchText = this.buildSearchText(report);
    const matches: Array<{ rule: DetectionRule; score: number }> = [];

    for (const rule of this.rules) {
      let score = 0;
      const matchedPatterns: string[] = [];

      // Check regex patterns
      for (const pattern of rule.patterns) {
        pattern.lastIndex = 0;  // Reset regex state
        if (pattern.test(searchText)) {
          score += 2;
          matchedPatterns.push(pattern.source);
        }
      }

      // Check keywords
      for (const keyword of rule.keywords) {
        if (searchText.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        matches.push({ rule, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      const best = matches[0];
      return {
        category: best.rule.category,
        severity: best.rule.severity,
        confidence: Math.min(best.score / 5, 1),  // Normalize to 0-1
        matchedRules: matches.slice(0, 3).map(m => m.rule.id),
      };
    }

    // Default to context_blindness for undetected failures
    return {
      category: "context_blindness",
      severity: "medium",
      confidence: 0.3,
      matchedRules: [],
    };
  }

  getRecommendations(category: FailureCategory): string[] {
    return RECOMMENDATIONS_BY_CATEGORY[category] || [];
  }

  private buildSearchText(report: ExternalReport): string {
    const parts = [
      report.errorMessage || "",
      report.humanNotes || "",
      report.correctApproach || "",
      report.codeContext?.originalCode || "",
      report.codeContext?.diff || "",
    ];
    return parts.join(" ");
  }
}
```

#### 3.3.3 Guidelines Generator (src/monitor/guidelines-generator.ts)

```typescript
import type {
  IAgentMonitor,
  FailureStats,
  AgentPerformance,
} from "../storage";
import type {
  FailureCategory,
  FailureSeverity,
  ExternalAgentType,
  ProjectGuidelines,
  InsertProjectGuidelines,
  AgentReport,
} from "@shared/schema";

export interface GeneratorConfig {
  minObservations: number;
  confidenceThreshold: number;
  maxRulesPerCategory: number;
  includeExamples: boolean;
  includeMetrics: boolean;
  ruleCreationThreshold: number;  // Min failures before rule is created
}

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  minObservations: 10,
  confidenceThreshold: 0.5,
  maxRulesPerCategory: 5,
  includeExamples: true,
  includeMetrics: true,
  ruleCreationThreshold: 3,       // 3+ failures to create rule
};

export interface GeneratedRule {
  id: string;
  rule: string;
  severity: FailureSeverity;
  failureRate: number;
  lastViolation: string;
  example?: string;
  correctApproach?: string;
  confidence: number;
}

export interface Pitfall {
  area: string;
  rate: number;
  issue: string;
  prevention: string;
}

export interface AgentNote {
  agent: ExternalAgentType;
  successRate: number;
  commonFailures: string;
  recommendation: string;
}

export class GuidelinesGenerator {
  private storage: IAgentMonitor;
  private config: GeneratorConfig;

  constructor(
    storage: IAgentMonitor,
    config: Partial<GeneratorConfig> = {}
  ) {
    this.storage = storage;
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  }

  async regenerate(projectId: string): Promise<ProjectGuidelines> {
    const reports = await this.storage.getReportsByProject(projectId, 1000);
    
    if (reports.length < this.config.minObservations) {
      // Not enough data yet, return minimal guidelines
      return this.createMinimalGuidelines(projectId, reports.length);
    }

    const stats = await this.storage.getFailureStats();
    const agentPerformances = await this.getAgentPerformances(reports);
    
    const rules = this.generateRules(reports, stats);
    const pitfalls = this.generatePitfalls(reports);
    const agentNotes = this.generateAgentNotes(agentPerformances);
    
    const markdown = this.renderMarkdown(projectId, {
      observationCount: reports.length,
      confidenceScore: this.calculateConfidence(reports),
      rules,
      pitfalls,
      agentNotes,
      agentPerformances,
    });

    const existing = await this.storage.getGuidelines(projectId);
    
    const guidelinesData: InsertProjectGuidelines = {
      projectId,
      markdown,
      observationCount: reports.length,
      confidenceScore: this.calculateConfidence(reports),
      criticalRuleCount: rules.filter(r => r.severity === "critical").length,
      highRuleCount: rules.filter(r => r.severity === "high").length,
      mediumRuleCount: rules.filter(r => r.severity === "medium").length,
      agentScores: Object.fromEntries(
        agentPerformances.map(p => [p.agentType, p.successRate])
      ) as Record<ExternalAgentType, number>,
    };

    if (existing) {
      return await this.storage.updateGuidelines(projectId, guidelinesData) || existing;
    } else {
      return await this.storage.createGuidelines(guidelinesData);
    }
  }

  generateEmbedding(text: string): number[] {
    // Simple bag-of-words embedding (matches MemoryManager approach)
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const wordSet = new Set(words);
    const vector: number[] = new Array(100).fill(0);
    
    for (const word of wordSet) {
      const hash = this.hashString(word);
      const index = Math.abs(hash) % 100;
      vector[index] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }
    
    return vector;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  private async createMinimalGuidelines(
    projectId: string,
    observationCount: number
  ): Promise<ProjectGuidelines> {
    const markdown = `# AGENT_RULES.md

## Project: ${projectId}
## Status: Insufficient Data

This project has ${observationCount} observations.
Guidelines will be generated after ${this.config.minObservations} observations.

## General Best Practices

1. Always verify AI-generated code before accepting
2. Check for security vulnerabilities (hardcoded secrets, XSS)
3. Run existing tests before committing
4. Review project conventions first

---
*Auto-generated by @ai-coding-agents/cli Agent Monitor*
`;

    const existing = await this.storage.getGuidelines(projectId);
    const data: InsertProjectGuidelines = {
      projectId,
      markdown,
      observationCount,
      confidenceScore: 0,
      criticalRuleCount: 0,
      highRuleCount: 0,
      mediumRuleCount: 0,
      agentScores: null,
    };

    if (existing) {
      return await this.storage.updateGuidelines(projectId, data) || existing;
    }
    return await this.storage.createGuidelines(data);
  }

  private async getAgentPerformances(reports: AgentReport[]): Promise<AgentPerformance[]> {
    const byAgent = new Map<ExternalAgentType, AgentReport[]>();
    
    for (const report of reports) {
      const agent = report.agentType as ExternalAgentType;
      if (!byAgent.has(agent)) {
        byAgent.set(agent, []);
      }
      byAgent.get(agent)!.push(report);
    }

    const performances: AgentPerformance[] = [];
    
    for (const [agentType, agentReports] of byAgent) {
      const successCount = agentReports.filter(r => r.outcome === "accepted").length;
      const successRate = agentReports.length > 0 ? successCount / agentReports.length : 0;
      
      const modifications = agentReports
        .filter(r => r.modificationPercent != null)
        .map(r => r.modificationPercent!);
      const avgMod = modifications.length > 0
        ? modifications.reduce((a, b) => a + b, 0) / modifications.length
        : 0;

      const failureCounts = new Map<FailureCategory, number>();
      for (const report of agentReports) {
        if (report.failureCategory) {
          failureCounts.set(
            report.failureCategory as FailureCategory,
            (failureCounts.get(report.failureCategory as FailureCategory) || 0) + 1
          );
        }
      }

      const sortedFailures = Array.from(failureCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      performances.push({
        agentType,
        totalReports: agentReports.length,
        successRate,
        avgModificationPercent: avgMod,
        topFailures: sortedFailures,
        trend: "stable", // Would need historical data for real trend
      });
    }

    return performances;
  }

  private generateRules(reports: AgentReport[], stats: FailureStats): GeneratedRule[] {
    const rules: GeneratedRule[] = [];
    const categoryExamples = new Map<FailureCategory, AgentReport>();

    // Collect examples for each category
    for (const report of reports) {
      if (report.failureCategory && !categoryExamples.has(report.failureCategory as FailureCategory)) {
        categoryExamples.set(report.failureCategory as FailureCategory, report);
      }
    }

    // Generate rules for each failure category
    const totalFailures = Object.values(stats.failuresByCategory).reduce((a, b) => a + b, 0);
    
    for (const [category, count] of Object.entries(stats.failuresByCategory)) {
      if (count === 0) continue;
      
      const failureRate = totalFailures > 0 ? (count / totalFailures) * 100 : 0;
      const example = categoryExamples.get(category as FailureCategory);
      const severity = this.getSeverityForCategory(category as FailureCategory, failureRate);

      rules.push({
        id: `RULE-${category.toUpperCase().slice(0, 4)}-001`,
        rule: this.getRuleText(category as FailureCategory),
        severity,
        failureRate,
        lastViolation: example?.createdAt?.toISOString() || "Unknown",
        example: example?.errorMessage?.slice(0, 100),
        correctApproach: example?.correctApproach?.slice(0, 200),
        confidence: Math.min(count / 10, 1),
      });
    }

    return rules
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, this.config.maxRulesPerCategory * 8);
  }

  private getSeverityForCategory(category: FailureCategory, failureRate: number): FailureSeverity {
    const baseSeverity: Record<FailureCategory, FailureSeverity> = {
      security_gap: "critical",
      broke_existing: "high",
      hallucinated_code: "high",
      logic_error: "high",
      context_blindness: "medium",
      missing_edge_case: "medium",
      outdated_api: "medium",
      poor_readability: "low",
    };
    
    // Upgrade severity if failure rate is very high
    if (failureRate > 30) {
      const upgrades: Record<FailureSeverity, FailureSeverity> = {
        low: "medium",
        medium: "high",
        high: "critical",
        critical: "critical",
      };
      return upgrades[baseSeverity[category]];
    }
    
    return baseSeverity[category];
  }

  private getRuleText(category: FailureCategory): string {
    const ruleTexts: Record<FailureCategory, string> = {
      security_gap: "NEVER hardcode credentials or API keys. Use environment variables.",
      logic_error: "ALWAYS verify control flow and use strict equality (===).",
      context_blindness: "ALWAYS read project conventions before making changes.",
      outdated_api: "CHECK library documentation for current API methods.",
      missing_edge_case: "ALWAYS handle null, empty, and boundary conditions.",
      poor_readability: "USE descriptive names and add documentation.",
      broke_existing: "RUN full test suite before committing changes.",
      hallucinated_code: "VERIFY all APIs and libraries exist before using.",
    };
    return ruleTexts[category];
  }

  private generatePitfalls(reports: AgentReport[]): Pitfall[] {
    const pitfalls: Pitfall[] = [];
    const taskFailures = new Map<string, { total: number; failed: number; issues: string[] }>();

    for (const report of reports) {
      const task = report.taskCategory;
      if (!taskFailures.has(task)) {
        taskFailures.set(task, { total: 0, failed: 0, issues: [] });
      }
      
      const data = taskFailures.get(task)!;
      data.total++;
      
      if (report.outcome !== "accepted") {
        data.failed++;
        if (report.failureCategory) {
          data.issues.push(report.failureCategory);
        }
      }
    }

    for (const [area, data] of taskFailures) {
      if (data.failed === 0) continue;
      
      const rate = (data.failed / data.total) * 100;
      const mostCommonIssue = this.mostCommon(data.issues) || "various";

      pitfalls.push({
        area: area.charAt(0).toUpperCase() + area.slice(1),
        rate: Math.round(rate),
        issue: mostCommonIssue.replace(/_/g, " "),
        prevention: this.getRuleText(mostCommonIssue as FailureCategory || "context_blindness"),
      });
    }

    return pitfalls.sort((a, b) => b.rate - a.rate).slice(0, 5);
  }

  private generateAgentNotes(performances: AgentPerformance[]): AgentNote[] {
    return performances.map(p => ({
      agent: p.agentType,
      successRate: Math.round(p.successRate * 100),
      commonFailures: p.topFailures.map(f => f.replace(/_/g, " ")).join(", ") || "none detected",
      recommendation: this.getAgentRecommendation(p),
    }));
  }

  private getAgentRecommendation(performance: AgentPerformance): string {
    if (performance.successRate > 0.8) {
      return "Performing well. Continue current practices.";
    } else if (performance.successRate > 0.6) {
      return `Focus on reducing ${performance.topFailures[0]?.replace(/_/g, " ") || "failures"}.`;
    } else {
      return "Requires significant oversight. Review all changes carefully.";
    }
  }

  private mostCommon(arr: string[]): string | undefined {
    if (arr.length === 0) return undefined;
    const counts = new Map<string, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let maxItem: string | undefined;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxItem = item;
      }
    }
    return maxItem;
  }

  private calculateConfidence(reports: AgentReport[]): number {
    const count = reports.length;
    // Confidence increases with observations, maxes out around 100
    return Math.min(count / 100, 1);
  }

  private renderMarkdown(
    projectId: string,
    data: {
      observationCount: number;
      confidenceScore: number;
      rules: GeneratedRule[];
      pitfalls: Pitfall[];
      agentNotes: AgentNote[];
      agentPerformances: AgentPerformance[];
    }
  ): string {
    const overallScore = Math.round(
      (data.agentPerformances.reduce((sum, p) => sum + p.successRate, 0) /
        Math.max(data.agentPerformances.length, 1)) * 100
    );

    const criticalRules = data.rules.filter(r => r.severity === "critical");
    const highRules = data.rules.filter(r => r.severity === "high");
    const otherRules = data.rules.filter(r => r.severity !== "critical" && r.severity !== "high");

    return `# AGENT_RULES.md (Auto-generated)

## Project: ${projectId}
## Generated: ${new Date().toISOString()} based on ${data.observationCount} observations
## Agent Performance Score: ${overallScore}/100

---

## Critical Rules (MUST Follow)

${criticalRules.map((r, i) => `### ${i + 1}. ${r.rule}
- **Severity:** CRITICAL
- **Failure Rate:** ${r.failureRate.toFixed(1)}%
- **Confidence:** ${(r.confidence * 100).toFixed(0)}%
${r.example ? `- **Example:** \`${r.example}\`` : ""}
${r.correctApproach ? `- **Correct Approach:** ${r.correctApproach}` : ""}
`).join("\n") || "No critical rules yet."}

---

## High Priority Rules

${highRules.map((r, i) => `${i + 1}. **${r.rule}** (${r.failureRate.toFixed(1)}% failure rate)`).join("\n") || "No high priority rules yet."}

---

## Additional Guidelines

${otherRules.map((r, i) => `${i + 1}. ${r.rule}`).join("\n") || "No additional guidelines yet."}

---

## Known Pitfalls (from failure data)

| Area | Failure Rate | Common Issue | Prevention |
|------|-------------|--------------|------------|
${data.pitfalls.map(p => `| ${p.area} | ${p.rate}% | ${p.issue} | ${p.prevention} |`).join("\n") || "| - | - | No data yet | - |"}

---

## Agent-Specific Notes

${data.agentNotes.map(n => `### ${n.agent}
- **Success Rate:** ${n.successRate}%
- **Common Failures:** ${n.commonFailures}
- **Recommendation:** ${n.recommendation}
`).join("\n") || "No agent-specific data yet."}

---

## Metrics

- **Total Observations:** ${data.observationCount}
- **Last Updated:** ${new Date().toISOString()}
- **Confidence Score:** ${(data.confidenceScore * 100).toFixed(0)}%

---

*This file is auto-generated by @ai-coding-agents/cli Agent Monitor.*
*Do not edit manually - changes will be overwritten.*
`;
  }
}
```

---

## Part 4: API Routes

### 4.1 Route Definitions (server/routes.ts additions)

```typescript
// Add to server/routes.ts

// ============================================
// AGENT MONITOR ROUTES
// ============================================

app.post("/api/agents/external/report", async (req: Request, res: Response) => {
  try {
    const { ReportProcessor } = await import("./monitor/report-processor");
    const processor = new ReportProcessor(storage);
    
    const result = await processor.processReport(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: "Report validation failed",
        details: result.error,
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error processing agent report:", error);
    res.status(500).json({
      error: "Failed to process report",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/agents/guidelines/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const format = (req.query.format as string) || "json";
    
    const guidelines = await storage.getGuidelines(projectId);
    
    if (!guidelines) {
      return res.status(404).json({
        error: "Guidelines not found",
        message: `No guidelines exist for project: ${projectId}`,
      });
    }
    
    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown");
      res.send(guidelines.markdown);
    } else {
      res.json({
        success: true,
        guidelines,
      });
    }
  } catch (error) {
    console.error("Error fetching guidelines:", error);
    res.status(500).json({
      error: "Failed to fetch guidelines",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/agents/guidelines/generate", async (req: Request, res: Response) => {
  try {
    const { GuidelinesGenerator } = await import("./monitor/guidelines-generator");
    const { projectId, forceRegenerate } = req.body as {
      projectId: string;
      forceRegenerate?: boolean;
    };
    
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    
    const generator = new GuidelinesGenerator(storage);
    const guidelines = await generator.regenerate(projectId);
    
    res.json({
      success: true,
      guidelines,
    });
  } catch (error) {
    console.error("Error generating guidelines:", error);
    res.status(500).json({
      error: "Failed to generate guidelines",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/agents/analytics", async (req: Request, res: Response) => {
  try {
    const { Analytics } = await import("./monitor/analytics");
    const analytics = new Analytics(storage);
    
    const agentType = req.query.agent as ExternalAgentType | undefined;
    const timeRange = (req.query.range as string) || "week";
    
    const summary = await analytics.getSummary(agentType, timeRange);
    
    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/agents/analytics/export", async (req: Request, res: Response) => {
  try {
    const { Analytics } = await import("./monitor/analytics");
    const analytics = new Analytics(storage);
    
    const format = (req.query.format as string) || "json";
    const data = await analytics.export(format);
    
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=agent-analytics.csv");
    }
    
    res.send(data);
  } catch (error) {
    console.error("Error exporting analytics:", error);
    res.status(500).json({
      error: "Failed to export analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
```

---

## Part 5: CLI Commands

### 5.1 CLI Entry Point (src/cli.ts additions)

```typescript
// Add to existing CLI

case "report":
  await handleReport(args.slice(1));
  break;

case "generate-rules":
  await handleGenerateRules(args.slice(1));
  break;

case "analytics":
  await handleAnalytics(args.slice(1));
  break;

// ============================================
// HANDLER IMPLEMENTATIONS
// ============================================

async function handleReport(args: string[]): Promise<void> {
  const options = parseReportArgs(args);
  
  if (!options.project || !options.agent || !options.outcome) {
    console.log("Usage: ai-agents report --project <id> --agent <type> --outcome <result>");
    console.log("\nRequired:");
    console.log("  --project <id>      Project identifier");
    console.log("  --agent <type>      Agent type (replit, cursor, copilot, claude, custom)");
    console.log("  --outcome <result>  Outcome (accepted, rejected, modified, error)");
    console.log("\nOptional:");
    console.log("  --failure <cat>     Failure category");
    console.log("  --severity <level>  Severity (critical, high, medium, low)");
    console.log("  --task <type>       Task type (feature, bugfix, refactor, security, docs, test)");
    console.log("  --modification <n>  Modification percentage (0-100)");
    console.log("  --error <msg>       Error message");
    console.log("  --notes <text>      Human notes");
    process.exit(1);
  }

  const report = {
    projectId: options.project,
    agentType: options.agent,
    outcome: options.outcome,
    failureCategory: options.failure,
    failureSeverity: options.severity,
    taskCategory: options.task || "feature",
    modificationPercent: options.modification,
    errorMessage: options.error,
    humanNotes: options.notes,
  };

  console.log("Submitting report...");
  
  const response = await fetch("http://localhost:5000/api/agents/external/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log(`Report submitted: ${result.reportId}`);
    if (result.detectedFailure) {
      console.log(`Detected failure: ${result.detectedFailure}`);
    }
    if (result.recommendations?.length) {
      console.log("\nRecommendations:");
      result.recommendations.forEach((r: string) => console.log(`  - ${r}`));
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function handleGenerateRules(args: string[]): Promise<void> {
  const projectId = args.find(a => !a.startsWith("--")) || args[args.indexOf("--project") + 1];
  const outputFile = args[args.indexOf("--output") + 1];
  
  if (!projectId) {
    console.log("Usage: ai-agents generate-rules <project-id> [--output <file>]");
    process.exit(1);
  }

  console.log(`Generating rules for project: ${projectId}...`);

  const response = await fetch("http://localhost:5000/api/agents/guidelines/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, forceRegenerate: true }),
  });

  const result = await response.json();

  if (result.success) {
    const markdown = result.guidelines.markdown;
    
    if (outputFile) {
      const fs = await import("fs");
      fs.writeFileSync(outputFile, markdown);
      console.log(`Guidelines written to: ${outputFile}`);
    } else {
      console.log(markdown);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function handleAnalytics(args: string[]): Promise<void> {
  const agent = args[args.indexOf("--agent") + 1];
  const range = args[args.indexOf("--range") + 1] || "week";
  const exportFormat = args[args.indexOf("--export") + 1];
  const outputFile = args[args.indexOf("--output") + 1];

  if (exportFormat) {
    const response = await fetch(
      `http://localhost:5000/api/agents/analytics/export?format=${exportFormat}`
    );
    const data = await response.text();
    
    if (outputFile) {
      const fs = await import("fs");
      fs.writeFileSync(outputFile, data);
      console.log(`Analytics exported to: ${outputFile}`);
    } else {
      console.log(data);
    }
    return;
  }

  const params = new URLSearchParams();
  if (agent) params.set("agent", agent);
  params.set("range", range);

  const response = await fetch(
    `http://localhost:5000/api/agents/analytics?${params}`
  );
  const result = await response.json();

  if (result.success) {
    console.log("\n=== Agent Monitor Analytics ===\n");
    console.log(`Total Reports: ${result.summary.totalReports}`);
    console.log(`Success Rate: ${(result.summary.successRate * 100).toFixed(1)}%`);
    console.log(`Trend: ${result.summary.trendDirection}`);
    
    console.log("\nTop Failures:");
    result.summary.topFailures.forEach((f: any) => {
      console.log(`  ${f.category}: ${f.count} (${f.percentage.toFixed(1)}%)`);
    });
    
    console.log("\nAgent Performance:");
    for (const [agent, perf] of Object.entries(result.summary.agentPerformance)) {
      const p = perf as any;
      console.log(`  ${agent}: ${(p.successRate * 100).toFixed(1)}% success (${p.totalReports} reports)`);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}
```

---

## Part 6: Integration with Existing ML Infrastructure

### 6.1 OutcomeLearner Extension

```typescript
// server/agents/learning/outcome-learner.ts additions

export interface ExternalReportData {
  reportId: string;
  projectId: string;
  agentType: ExternalAgentType;
  outcome: AgentOutcome;
  failureCategory?: FailureCategory;
  taskCategory: TaskCategory;
  modificationPercent?: number;
}

export class ExtendedOutcomeLearner extends OutcomeLearner {
  async recordExternalReport(data: ExternalReportData): Promise<void> {
    // Convert external report to internal format
    const runOutcome: InsertRunOutcome = {
      runId: data.reportId,
      agentType: data.agentType as any,  // Map external to internal type
      status: data.outcome === "accepted" ? "completed" : "rejected",
      prompt: `[External] ${data.taskCategory}`,
      response: JSON.stringify({ outcome: data.outcome }),
      humanApproved: data.outcome === "accepted",
      modificationPercent: data.modificationPercent,
      tags: [data.projectId, data.agentType, data.taskCategory].filter(Boolean),
    };

    await this.recordOutcome(runOutcome);
  }

  async analyzeByAgent(agentType: ExternalAgentType): Promise<{
    successRate: number;
    topFailures: FailureCategory[];
    trend: "improving" | "stable" | "degrading";
  }> {
    const outcomes = await this.storage.getRunOutcomesByAgent(agentType as any, 100);
    
    const accepted = outcomes.filter(o => o.humanApproved).length;
    const successRate = outcomes.length > 0 ? accepted / outcomes.length : 0;
    
    // Would need more sophisticated analysis for real trend detection
    return {
      successRate,
      topFailures: ["context_blindness", "logic_error"],  // Placeholder
      trend: "stable",
    };
  }
}
```

### 6.2 MemoryManager Extension

```typescript
// server/agents/learning/memory-manager.ts additions

export interface FailureMemory {
  category: FailureCategory;
  context: string;
  failedApproach: string;
  correctApproach: string;
}

export class ExtendedMemoryManager extends MemoryManager {
  async storeFailurePattern(pattern: FailureMemory): Promise<void> {
    const embedding = this.generateEmbedding(pattern.context);
    
    await this.store({
      agentType: "philosopher" as AgentType,  // Use philosopher for meta-learning
      context: `FAILURE:${pattern.category}|${pattern.context}`,
      embedding,
      metadata: {
        type: "failure_pattern",
        category: pattern.category,
        failedApproach: pattern.failedApproach,
        correctApproach: pattern.correctApproach,
      },
    });
  }

  async findSimilarFailures(context: string, limit = 5): Promise<FailureMemory[]> {
    const embedding = this.generateEmbedding(context);
    const memories = await this.search("philosopher" as AgentType, embedding, limit);
    
    return memories
      .filter(m => m.context.startsWith("FAILURE:"))
      .map(m => ({
        category: m.metadata?.category as FailureCategory,
        context: m.context.replace(/^FAILURE:[^|]+\|/, ""),
        failedApproach: m.metadata?.failedApproach || "",
        correctApproach: m.metadata?.correctApproach || "",
      }));
  }
}
```

---

## Part 7: 3-Pass Workflow Integration

### 7.1 Workflow Alignment

Following the approved 3-Pass structure with Code Ninja in Pass 3:

```
PASS 1: FOUNDATION (3 calls)
════════════════════════════
[Call 1] PHILOSOPHER: Define monitoring goals and metrics
[Call 2] ARCHITECT: Design module structure and interfaces
[Call 3] MECHANIC: Validate design, identify edge cases

PASS 2: REFINEMENT (2 calls + optional trigger)
═══════════════════════════════════════════════
[Call 4] ARCHITECT: Refine based on Mechanic feedback
[Call 5] MECHANIC: Final validation of refined design
[Optional] PHILOSOPHER: If changes > 15%, check alignment

PASS 3: FINAL (3 calls)
═══════════════════════
[Call 6] ARCHITECT: Finalize implementation roadmap
[Call 7] MECHANIC + PHILOSOPHER: Joint validation (1 combined call)
[Call 8] CODE NINJA: Execute implementation

SIGN-OFF: Status verification (no AI call)
```

---

## Part 8: Implementation Sequencing (DAG)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION SEQUENCE DAG                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 1: Schema & Storage (Day 1, 2 hours)                                    │
│  ═══════════════════════════════════════════                                   │
│  ┌──────────────────┐                                                          │
│  │ 1.1 Add schema   │ → agentReports, projectGuidelines, failurePatterns       │
│  │     definitions  │   (shared/schema.ts)                                     │
│  └────────┬─────────┘                                                          │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                          │
│  │ 1.2 Extend       │ → IAgentMonitor interface                                │
│  │     storage.ts   │   (server/storage.ts)                                    │
│  └────────┬─────────┘                                                          │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                          │
│  │ 1.3 Implement    │ → MemStorage implementations                             │
│  │     MemStorage   │                                                          │
│  └────────┬─────────┘                                                          │
│           │                                                                     │
│           │    ┌────────────────────────────────────────────────────────────┐  │
│           │    │ GATE 1: npm run check passes, storage tests pass          │  │
│           │    └────────────────────────────────────────────────────────────┘  │
│           │                                                                     │
│  PHASE 2: Core Modules (Day 1-2, 4 hours)                                      │
│  ═════════════════════════════════════════                                     │
│           ▼                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                                  │
│  │ 2.1 Failure      │    │ 2.2 Guidelines   │  ← Can be parallel               │
│  │     Detector     │    │     Generator    │                                  │
│  └────────┬─────────┘    └────────┬─────────┘                                  │
│           │                       │                                            │
│           └───────────┬───────────┘                                            │
│                       ▼                                                        │
│  ┌──────────────────────────────────┐                                          │
│  │ 2.3 Report Processor             │ ← Depends on 2.1 and 2.2                 │
│  │     (combines detector + gen)    │                                          │
│  └────────────────┬─────────────────┘                                          │
│                   │                                                             │
│                   ▼                                                             │
│  ┌──────────────────────────────────┐                                          │
│  │ 2.4 Analytics Module             │                                          │
│  └────────────────┬─────────────────┘                                          │
│                   │                                                             │
│                   │    ┌────────────────────────────────────────────────────┐  │
│                   │    │ GATE 2: Core module unit tests pass (40+ tests)   │  │
│                   │    └────────────────────────────────────────────────────┘  │
│                   │                                                             │
│  PHASE 3: API & CLI (Day 2, 2 hours)                                           │
│  ═══════════════════════════════════                                           │
│                   ▼                                                             │
│  ┌──────────────────┐    ┌──────────────────┐                                  │
│  │ 3.1 API Routes   │    │ 3.2 CLI Commands │  ← Can be parallel               │
│  │     (routes.ts)  │    │     (cli.ts)     │                                  │
│  └────────┬─────────┘    └────────┬─────────┘                                  │
│           │                       │                                            │
│           │    ┌────────────────────────────────────────────────────────────┐  │
│           │    │ GATE 3: API integration tests pass, CLI manual test       │  │
│           │    └────────────────────────────────────────────────────────────┘  │
│           │                                                                     │
│  PHASE 4: ML Integration (Day 2-3, 3 hours)                                    │
│  ══════════════════════════════════════════                                    │
│           ▼                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │ 4.1 Extend       │    │ 4.2 Extend       │    │ 4.3 Extend       │          │
│  │     Outcome      │    │     Memory       │    │     Prompt       │          │
│  │     Learner      │    │     Manager      │    │     Optimizer    │          │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘          │
│           │                       │                       │                    │
│           └───────────────────────┼───────────────────────┘                    │
│                                   ▼                                            │
│                   ┌────────────────────────────────────────────────────────┐  │
│                   │ GATE 4: ML integration tests pass, learning loop works │  │
│                   └────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  PHASE 5: Testing & Documentation (Day 3, 2 hours)                             │
│  ═════════════════════════════════════════════════                             │
│                   ▼                                                             │
│  ┌──────────────────┐    ┌──────────────────┐                                  │
│  │ 5.1 Full test    │    │ 5.2 Documentation│                                  │
│  │     suite (60+)  │    │     updates      │                                  │
│  └────────┬─────────┘    └────────┬─────────┘                                  │
│           │                       │                                            │
│           └───────────┬───────────┘                                            │
│                       ▼                                                         │
│                   ┌────────────────────────────────────────────────────────┐  │
│                   │ GATE 5: All 340+ tests pass, docs complete             │  │
│                   └────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 9: Authentication & Security

### 9.1 API Key Authentication

```typescript
// middleware/auth.ts

export interface ApiKeyConfig {
  enabled: boolean;
  keyHeader: string;
  validKeys: Set<string>;
}

const DEFAULT_AUTH_CONFIG: ApiKeyConfig = {
  enabled: false,  // Disabled by default for development
  keyHeader: "X-API-Key",
  validKeys: new Set(),
};

export function createApiKeyMiddleware(config: Partial<ApiKeyConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!finalConfig.enabled) {
      return next();
    }

    const apiKey = req.headers[finalConfig.keyHeader.toLowerCase()];
    
    if (!apiKey || !finalConfig.validKeys.has(apiKey as string)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing API key",
      });
    }

    next();
  };
}
```

### 9.2 Rate Limiting

```typescript
// middleware/rate-limit.ts

export interface RateLimitConfig {
  maxReportsPerMinute: number;
  maxReportsPerHour: number;
  maxReportsPerDay: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxReportsPerMinute: 60,
  maxReportsPerHour: 500,
  maxReportsPerDay: 5000,
};

export class RateLimiter {
  private minuteCounts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  check(clientId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - 60000;  // 1 minute window
    
    let timestamps = this.minuteCounts.get(clientId) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= this.config.maxReportsPerMinute) {
      const oldestInWindow = Math.min(...timestamps);
      const retryAfter = Math.ceil((oldestInWindow + 60000 - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    timestamps.push(now);
    this.minuteCounts.set(clientId, timestamps);
    
    return { allowed: true };
  }
}
```

---

## Part 10: Testing Requirements

### 10.1 Test Coverage Requirements

| Module | Required Tests | Coverage Target |
|--------|----------------|-----------------|
| report-processor.ts | 15 | 90% |
| failure-detector.ts | 20 | 95% |
| guidelines-generator.ts | 15 | 85% |
| analytics.ts | 10 | 80% |
| API routes | 10 | 90% |
| CLI commands | 5 | 75% |
| ML integration | 10 | 80% |
| **Total** | **85+** | **85%** |

### 10.2 Test Categories

```typescript
// __tests__/monitor/report-processor.test.ts

describe("ReportProcessor", () => {
  describe("validation", () => {
    it("should reject empty projectId");
    it("should reject invalid agentType");
    it("should reject invalid outcome");
    it("should accept valid report");
    it("should normalize optional fields");
  });

  describe("failure detection", () => {
    it("should auto-detect security_gap from code patterns");
    it("should auto-detect logic_error from keywords");
    it("should preserve manually specified category");
    it("should assign appropriate severity");
  });

  describe("pattern extraction", () => {
    it("should extract pattern when correctApproach provided");
    it("should find similar existing patterns");
    it("should increment frequency for duplicate patterns");
  });

  describe("guidelines update", () => {
    it("should debounce multiple updates for same project");
    it("should regenerate guidelines after processing");
  });
});

// __tests__/monitor/failure-detector.test.ts

describe("FailureDetector", () => {
  describe("pattern matching", () => {
    it("should detect hardcoded passwords");
    it("should detect hardcoded API keys");
    it("should detect eval() usage");
    it("should detect innerHTML assignments");
  });

  describe("keyword matching", () => {
    it("should detect regression from keywords");
    it("should detect hallucination from keywords");
  });

  describe("severity assignment", () => {
    it("should assign critical to security issues");
    it("should upgrade severity for high failure rates");
  });

  describe("recommendations", () => {
    it("should return recommendations for each category");
  });
});
```

---

## Part 11: QA & Documentation Standards

### 11.1 QA Checklist

Before each commit:
- [ ] `npm run check` passes (TypeScript compilation)
- [ ] All new tests pass
- [ ] Existing 284 tests still pass
- [ ] No fake/placeholder data in production paths
- [ ] No hardcoded secrets or credentials
- [ ] JSDoc comments on all public functions
- [ ] Error messages are user-friendly

### 11.2 Documentation Updates Required

| Document | Update Required |
|----------|-----------------|
| replit.md | Add monitor section, new API endpoints, CLI commands |
| docs/API_REFERENCE.md | Document all new endpoints with examples |
| docs/CONSUMER_GUIDE.md | Add monitoring integration section |
| README.md | Add agent monitor usage examples |
| NPM_README.md | Add CLI command documentation |

---

## Part 12: Success Metrics

### 12.1 Implementation Success Criteria

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Test coverage | >85% | Coverage report |
| API response time | <100ms | Load testing |
| Report processing rate | >100/min | Benchmark |
| Guidelines generation | <30 sec | Timing test |
| Memory usage | <100MB | Profile |
| TypeScript strict mode | 0 errors | Compilation |

### 12.2 Operational Success Metrics

| Metric | Baseline | 30-Day Target |
|--------|----------|---------------|
| Reports collected | 0 | 1000+ |
| Projects with guidelines | 0 | 50+ |
| Failure detection accuracy | N/A | >90% |
| User adoption | 0 | 10+ active |

---

## Part 13: Sign-off Summary

| Pass | Architect | Mechanic | Philosopher | Code Ninja |
|------|-----------|----------|-------------|------------|
| 1 | - | - | - | - |
| 2 | - | - | - | - |
| 3 | - | - | - | - |

**Status:** PROPOSED - Awaiting Review

---

## Part 14: Configuration Decisions (RESOLVED)

| Question | Decision | Notes |
|----------|----------|-------|
| API Authentication | **Disabled** | No API key required for `/api/agents/external/report` |
| Data Retention | **60 days** | Reports auto-cleaned after 60 days |
| Cross-Project Learning | **Opt-in** | Projects must explicitly enable cross-project pattern sharing |
| Guidelines Auto-Update | **5-min debounce** | Approved as proposed |
| Rule Creation Threshold | **3+ failures** | Rules created when failure category occurs 3+ times |

### 14.1 Default Configuration Constants

```typescript
// src/monitor/config.ts

export const MONITOR_CONFIG = {
  // API Security
  apiAuthEnabled: false,
  
  // Data Retention
  retentionDays: 60,
  
  // Cross-Project Learning
  crossProjectLearningEnabled: false,  // Opt-in per project
  
  // Guidelines Generation
  guidelinesUpdateDebounceMs: 300000,  // 5 minutes
  minObservationsForGuidelines: 10,
  
  // Rule Creation
  ruleCreationThreshold: 3,  // 3+ failures to create rule
  
  // Rate Limiting
  maxReportsPerMinute: 60,
  maxReportsPerHour: 500,
} as const;

export type MonitorConfig = typeof MONITOR_CONFIG;
```

---

*Document follows 3-Pass Optimized Workflow from @ai-coding-agents/cli v2.1*  
*Implementation Plan generated: January 2, 2026*  
*Configuration finalized: January 2, 2026*
