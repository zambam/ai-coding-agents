import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
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
