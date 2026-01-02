/**
 * Drizzle Schema Exports for AI Agent Reporting
 * 
 * Host projects can import these table definitions to add
 * agent reporting tables to their database.
 * 
 * Usage:
 * ```typescript
 * // In your shared/schema.ts
 * import { 
 *   agentReportsTable, 
 *   agentLogsTable,
 *   projectGuidelinesTable,
 *   failurePatternsTable 
 * } from 'ai-coding-agents/drizzle';
 * 
 * // Re-export for your project
 * export { agentReportsTable, agentLogsTable };
 * ```
 */

import { pgTable, serial, varchar, text, boolean, jsonb, timestamp, integer, real } from 'drizzle-orm/pg-core';

/**
 * Agent Reports Table
 * Stores reports from external AI coding agents (Cursor, Copilot, etc.)
 */
export const agentReportsTable = pgTable("agent_reports", {
  id: serial("id").primaryKey(),
  reportId: varchar("report_id", { length: 255 }).notNull().unique(),
  projectId: varchar("project_id", { length: 255 }).notNull(),
  externalAgent: varchar("external_agent", { length: 100 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  codeGenerated: text("code_generated"),
  codeAccepted: boolean("code_accepted"),
  humanCorrection: text("human_correction"),
  detectedFailure: boolean("detected_failure").default(false),
  failureCategory: varchar("failure_category", { length: 100 }),
  failureSeverity: varchar("failure_severity", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Agent Logs Table
 * Stores structured logs from AI agent invocations
 */
export const agentLogsTable = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  level: text("level").notNull(),
  service: text("service").notNull().default("ai-coding-agents"),
  agentType: text("agent_type"),
  action: text("action"),
  outcome: text("outcome"),
  message: text("message").notNull(),
  errorCode: text("error_code"),
  promptHash: text("prompt_hash"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

/**
 * Project Guidelines Table
 * Stores generated AGENT_RULES.md content for each project
 */
export const projectGuidelinesTable = pgTable("project_guidelines", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id", { length: 255 }).notNull().unique(),
  rulesMarkdown: text("rules_markdown").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  failureCount: integer("failure_count").notNull().default(0),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Failure Patterns Table
 * Stores detected patterns from agent failures for ML learning
 */
export const failurePatternsTable = pgTable("failure_patterns", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id", { length: 255 }).notNull(),
  pattern: text("pattern").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  occurrences: integer("occurrences").notNull().default(1),
  exampleCode: text("example_code"),
  suggestedFix: text("suggested_fix"),
  confidence: real("confidence").notNull().default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Type exports for TypeScript
 */
export type AgentReport = typeof agentReportsTable.$inferSelect;
export type InsertAgentReport = typeof agentReportsTable.$inferInsert;

export type AgentLog = typeof agentLogsTable.$inferSelect;
export type InsertAgentLog = typeof agentLogsTable.$inferInsert;

export type ProjectGuideline = typeof projectGuidelinesTable.$inferSelect;
export type InsertProjectGuideline = typeof projectGuidelinesTable.$inferInsert;

export type FailurePattern = typeof failurePatternsTable.$inferSelect;
export type InsertFailurePattern = typeof failurePatternsTable.$inferInsert;

/**
 * Failure categories for classification
 */
export const FAILURE_CATEGORIES = [
  'security_gap',
  'logic_error', 
  'context_blindness',
  'outdated_api',
  'missing_edge_case',
  'poor_readability',
  'broke_existing',
  'hallucinated_code',
  'rejection',
  'major_rewrite',
  'significant_changes',
  'minor_correction'
] as const;

export type FailureCategory = typeof FAILURE_CATEGORIES[number];

/**
 * Supported external agent types
 */
export const EXTERNAL_AGENT_TYPES = [
  'replit_agent',
  'cursor',
  'copilot',
  'claude_code',
  'windsurf',
  'aider',
  'continue',
  'cody',
  'unknown'
] as const;

export type ExternalAgentType = typeof EXTERNAL_AGENT_TYPES[number];

/**
 * Severity levels
 */
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];
