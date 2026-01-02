import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type AgentType = "architect" | "mechanic" | "codeNinja" | "philosopher";

export type ConsistencyMode = "none" | "fast" | "robust";

export type ValidationLevel = "low" | "medium" | "high" | "strict";

export const agentInvocations = pgTable("agent_invocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull().$type<AgentType>(),
  prompt: text("prompt").notNull(),
  response: jsonb("response"),
  reasoning: jsonb("reasoning").$type<string[]>(),
  confidence: integer("confidence"),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentInvocationSchema = createInsertSchema(agentInvocations).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentInvocation = z.infer<typeof insertAgentInvocationSchema>;
export type AgentInvocation = typeof agentInvocations.$inferSelect;

export interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  observation?: string;
}

export interface AgentResponse {
  reasoning: ReasoningStep[];
  recommendation: string;
  confidence: number;
  alternatives?: string[];
  warnings?: string[];
  codeOutput?: string;
  validations: {
    passed: string[];
    failed: string[];
  };
  grokSecondOpinion?: GrokSecondOpinion;
}

export interface CLASSicMetrics {
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

export interface AgentConfig {
  consistencyMode: ConsistencyMode;
  validationLevel: ValidationLevel;
  enableSelfCritique: boolean;
  enablePhilosopher: boolean;
  enableGrokSecondOpinion: boolean;
  maxTokens: number;
  temperature: number;
}

export interface GrokSecondOpinion {
  content: string;
  model: string;
  rating?: number;
  agreements: string[];
  improvements: string[];
  risks: string[];
}

export interface ReplitMdConfig {
  agentConfig: Partial<AgentConfig>;
  codeStandards: string[];
  architecturalRules: string[];
  securityConstraints: string[];
  customInstructions: string[];
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  consistencyMode: "fast",
  validationLevel: "medium",
  enableSelfCritique: true,
  enablePhilosopher: false,
  enableGrokSecondOpinion: false,
  maxTokens: 4096,
  temperature: 0.7,
};

export interface AgentPersona {
  id: AgentType;
  name: string;
  tagline: string;
  description: string;
  capabilities: string[];
  icon: string;
  color: string;
}

export const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: "architect",
    name: "The Architect",
    tagline: "Designs robust, scalable system blueprints",
    description: "Creates comprehensive system designs with clear component boundaries, data flow diagrams, and architectural patterns. Evaluates trade-offs and recommends optimal structures.",
    capabilities: [
      "System architecture design",
      "Component decomposition",
      "Pattern recommendations",
      "Scalability analysis"
    ],
    icon: "Grid3X3",
    color: "chart-1"
  },
  {
    id: "mechanic",
    name: "The Mechanic",
    tagline: "Diagnoses and repairs code issues",
    description: "Identifies root causes of bugs, performance bottlenecks, and code quality issues. Provides targeted fixes with minimal side effects.",
    capabilities: [
      "Bug diagnosis",
      "Performance optimization",
      "Code quality fixes",
      "Dependency resolution"
    ],
    icon: "Wrench",
    color: "chart-4"
  },
  {
    id: "codeNinja",
    name: "The Code Ninja",
    tagline: "Executes fast, precise implementations",
    description: "Writes clean, efficient code following best practices. Implements features quickly while maintaining code quality and test coverage.",
    capabilities: [
      "Feature implementation",
      "Code generation",
      "Refactoring",
      "Test writing"
    ],
    icon: "Zap",
    color: "chart-2"
  },
  {
    id: "philosopher",
    name: "The Philosopher",
    tagline: "Evaluates decisions and identifies opportunities",
    description: "Provides meta-analysis of code and architecture decisions. Identifies cognitive biases, adjacent opportunities, and process improvements.",
    capabilities: [
      "Decision analysis",
      "Bias detection",
      "Opportunity mapping",
      "Process evaluation"
    ],
    icon: "Brain",
    color: "chart-3"
  }
];

export const OUTCOME_STATUSES = ["accepted", "rejected", "edited", "ignored"] as const;
export type OutcomeStatus = typeof OUTCOME_STATUSES[number];

export const PROMPT_STATUSES = ["shadow", "ab_test", "promoted", "retired"] as const;
export type PromptStatus = typeof PROMPT_STATUSES[number];

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

export interface PromptMetrics {
  acceptanceRate: number;
  avgEditDistance: number;
  avgLatency: number;
  sampleSize: number;
  pValue?: number;
}

export interface StoredCLASSicMetrics {
  cost: number;
  latency: number;
  accuracy: number;
  security: number;
  stability: number;
}

export const runOutcomes = pgTable("run_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id").notNull().unique(),
  agentType: text("agent_type").notNull().$type<AgentType>(),
  outcomeStatus: text("outcome_status").notNull().$type<OutcomeStatus>(),
  editDistance: integer("edit_distance"),
  timeToDecision: integer("time_to_decision_ms"),
  grokAgreed: boolean("grok_agreed"),
  classicMetrics: jsonb("classic_metrics").$type<StoredCLASSicMetrics>(),
  promptVersion: text("prompt_version"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRunOutcomeSchema = createInsertSchema(runOutcomes).omit({
  id: true,
  createdAt: true,
});
export type InsertRunOutcome = z.infer<typeof insertRunOutcomeSchema>;
export type RunOutcome = typeof runOutcomes.$inferSelect;

export const humanFeedback = pgTable("human_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id").notNull(),
  rating: integer("rating"),
  tags: text("tags").array(),
  comment: text("comment"),
  submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertHumanFeedbackSchema = createInsertSchema(humanFeedback).omit({
  id: true,
  submittedAt: true,
});
export type InsertHumanFeedback = z.infer<typeof insertHumanFeedbackSchema>;
export type HumanFeedback = typeof humanFeedback.$inferSelect;

export const promptVariants = pgTable("prompt_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull().$type<AgentType>(),
  version: integer("version").notNull(),
  promptText: text("prompt_text").notNull(),
  status: text("status").notNull().$type<PromptStatus>(),
  trafficPercent: integer("traffic_percent").default(0),
  metrics: jsonb("metrics").$type<PromptMetrics>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  promotedAt: timestamp("promoted_at"),
  retiredAt: timestamp("retired_at"),
});

export const insertPromptVariantSchema = createInsertSchema(promptVariants).omit({
  id: true,
  createdAt: true,
});
export type InsertPromptVariant = z.infer<typeof insertPromptVariantSchema>;
export type PromptVariant = typeof promptVariants.$inferSelect;

export const memoryEntries = pgTable("memory_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull().$type<AgentType>(),
  taskDescription: text("task_description").notNull(),
  taskEmbedding: real("task_embedding").array(),
  response: text("response").notNull(),
  qualityScore: real("quality_score").notNull(),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({
  id: true,
  createdAt: true,
  accessCount: true,
});
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntries.$inferSelect;

export const EXTERNAL_AGENT_TYPES = [
  "replit_agent",
  "cursor",
  "copilot",
  "claude_code",
  "windsurf",
  "aider",
  "continue",
  "cody",
  "unknown",
] as const;
export type ExternalAgentType = typeof EXTERNAL_AGENT_TYPES[number];

export const FAILURE_CATEGORIES = [
  "security_gap",
  "logic_error",
  "context_blindness",
  "outdated_api",
  "missing_edge_case",
  "poor_readability",
  "broke_existing",
  "hallucinated_code",
] as const;
export type FailureCategory = typeof FAILURE_CATEGORIES[number];

export const FAILURE_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type FailureSeverity = typeof FAILURE_SEVERITIES[number];

export const agentReports = pgTable("agent_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: text("project_id").notNull(),
  externalAgent: text("external_agent").notNull().$type<ExternalAgentType>(),
  sessionId: text("session_id"),
  action: text("action").notNull(),
  codeGenerated: text("code_generated"),
  codeAccepted: boolean("code_accepted"),
  humanCorrection: text("human_correction"),
  errorMessage: text("error_message"),
  failureCategory: text("failure_category").$type<FailureCategory>(),
  failureSeverity: text("failure_severity").$type<FailureSeverity>(),
  filePath: text("file_path"),
  language: text("language"),
  context: jsonb("context"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentReportSchema = createInsertSchema(agentReports).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentReport = z.infer<typeof insertAgentReportSchema>;
export type AgentReport = typeof agentReports.$inferSelect;

export const projectGuidelines = pgTable("project_guidelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: text("project_id").notNull().unique(),
  rulesMarkdown: text("rules_markdown").notNull(),
  ruleCount: integer("rule_count").notNull(),
  confidence: real("confidence").notNull(),
  observationCount: integer("observation_count").notNull(),
  enabledCategories: text("enabled_categories").array(),
  crossProjectLearning: boolean("cross_project_learning").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertProjectGuidelinesSchema = createInsertSchema(projectGuidelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProjectGuidelines = z.infer<typeof insertProjectGuidelinesSchema>;
export type ProjectGuidelines = typeof projectGuidelines.$inferSelect;

export const failurePatterns = pgTable("failure_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: text("project_id"),
  category: text("category").notNull().$type<FailureCategory>(),
  pattern: text("pattern").notNull(),
  occurrences: integer("occurrences").notNull().default(1),
  exampleCodes: text("example_codes").array(),
  exampleCorrections: text("example_corrections").array(),
  suggestedRule: text("suggested_rule"),
  confidence: real("confidence"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFailurePatternSchema = createInsertSchema(failurePatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFailurePattern = z.infer<typeof insertFailurePatternSchema>;
export type FailurePattern = typeof failurePatterns.$inferSelect;

export interface MonitorAnalytics {
  totalReports: number;
  failuresByCategory: Record<FailureCategory, number>;
  failuresByAgent: Record<ExternalAgentType, number>;
  failuresBySeverity: Record<FailureSeverity, number>;
  topPatterns: Array<{ pattern: string; occurrences: number; category: FailureCategory }>;
  recentTrend: Array<{ date: string; count: number }>;
}
