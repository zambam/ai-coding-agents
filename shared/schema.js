import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
});
export const agentInvocations = pgTable("agent_invocations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    agentType: text("agent_type").notNull().$type(),
    prompt: text("prompt").notNull(),
    response: jsonb("response"),
    reasoning: jsonb("reasoning").$type(),
    confidence: integer("confidence"),
    metrics: jsonb("metrics"),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertAgentInvocationSchema = createInsertSchema(agentInvocations).omit({
    id: true,
    createdAt: true,
});
export const DEFAULT_AGENT_CONFIG = {
    consistencyMode: "fast",
    validationLevel: "medium",
    enableSelfCritique: true,
    enablePhilosopher: false,
    enableGrokSecondOpinion: false,
    maxTokens: 4096,
    temperature: 0.7,
};
export const AGENT_PERSONAS = [
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
export const OUTCOME_STATUSES = ["accepted", "rejected", "edited", "ignored"];
export const PROMPT_STATUSES = ["shadow", "ab_test", "promoted", "retired"];
export const FEEDBACK_TAGS = [
    "too_verbose",
    "too_brief",
    "incorrect",
    "off_topic",
    "helpful",
    "creative",
    "slow",
    "confusing",
];
export const runOutcomes = pgTable("run_outcomes", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    runId: text("run_id").notNull().unique(),
    agentType: text("agent_type").notNull().$type(),
    outcomeStatus: text("outcome_status").notNull().$type(),
    editDistance: integer("edit_distance"),
    timeToDecision: integer("time_to_decision_ms"),
    grokAgreed: boolean("grok_agreed"),
    classicMetrics: jsonb("classic_metrics").$type(),
    promptVersion: text("prompt_version"),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertRunOutcomeSchema = createInsertSchema(runOutcomes).omit({
    id: true,
    createdAt: true,
});
export const humanFeedback = pgTable("human_feedback", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    runId: text("run_id").notNull(),
    rating: integer("rating"),
    tags: text("tags").array(),
    comment: text("comment"),
    submittedAt: timestamp("submitted_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertHumanFeedbackSchema = createInsertSchema(humanFeedback).omit({
    id: true,
    submittedAt: true,
});
export const promptVariants = pgTable("prompt_variants", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    agentType: text("agent_type").notNull().$type(),
    version: integer("version").notNull(),
    promptText: text("prompt_text").notNull(),
    status: text("status").notNull().$type(),
    trafficPercent: integer("traffic_percent").default(0),
    metrics: jsonb("metrics").$type(),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
    promotedAt: timestamp("promoted_at"),
    retiredAt: timestamp("retired_at"),
});
export const insertPromptVariantSchema = createInsertSchema(promptVariants).omit({
    id: true,
    createdAt: true,
});
export const memoryEntries = pgTable("memory_entries", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    agentType: text("agent_type").notNull().$type(),
    taskDescription: text("task_description").notNull(),
    taskEmbedding: real("task_embedding").array(),
    response: text("response").notNull(),
    qualityScore: real("quality_score").notNull(),
    accessCount: integer("access_count").default(0),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
});
export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({
    id: true,
    createdAt: true,
    accessCount: true,
});
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
];
export const FAILURE_CATEGORIES = [
    "security_gap",
    "logic_error",
    "context_blindness",
    "outdated_api",
    "missing_edge_case",
    "poor_readability",
    "broke_existing",
    "hallucinated_code",
];
export const FAILURE_SEVERITIES = ["low", "medium", "high", "critical"];
export const agentReports = pgTable("agent_reports", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    projectId: text("project_id").notNull(),
    externalAgent: text("external_agent").notNull().$type(),
    sessionId: text("session_id"),
    action: text("action").notNull(),
    codeGenerated: text("code_generated"),
    codeAccepted: boolean("code_accepted"),
    humanCorrection: text("human_correction"),
    errorMessage: text("error_message"),
    failureCategory: text("failure_category").$type(),
    failureSeverity: text("failure_severity").$type(),
    filePath: text("file_path"),
    language: text("language"),
    context: jsonb("context"),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertAgentReportSchema = createInsertSchema(agentReports).omit({
    id: true,
    createdAt: true,
});
export const projectGuidelines = pgTable("project_guidelines", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    projectId: text("project_id").notNull().unique(),
    rulesMarkdown: text("rules_markdown").notNull(),
    ruleCount: integer("rule_count").notNull(),
    confidence: real("confidence").notNull(),
    observationCount: integer("observation_count").notNull(),
    enabledCategories: text("enabled_categories").array(),
    crossProjectLearning: boolean("cross_project_learning").default(false),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertProjectGuidelinesSchema = createInsertSchema(projectGuidelines).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const failurePatterns = pgTable("failure_patterns", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    projectId: text("project_id"),
    category: text("category").notNull().$type(),
    pattern: text("pattern").notNull(),
    occurrences: integer("occurrences").notNull().default(1),
    exampleCodes: text("example_codes").array(),
    exampleCorrections: text("example_corrections").array(),
    suggestedRule: text("suggested_rule"),
    confidence: real("confidence"),
    isGlobal: boolean("is_global").default(false),
    createdAt: timestamp("created_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql `CURRENT_TIMESTAMP`).notNull(),
});
export const insertFailurePatternSchema = createInsertSchema(failurePatterns).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
//# sourceMappingURL=schema.js.map