export type AgentType = "architect" | "mechanic" | "codeNinja" | "philosopher";

export type ConsistencyMode = "none" | "fast" | "robust";

export type ValidationLevel = "low" | "medium" | "high" | "strict";

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

export interface AgentInvocationRequest {
  agentType: AgentType;
  prompt: string;
  config?: Partial<AgentConfig>;
  context?: string;
}

export interface AgentInvocationResult {
  response: AgentResponse;
  metrics: CLASSicMetrics;
}

export interface ReasoningPath {
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
}

export interface ConsistencyResult {
  selectedPath: ReasoningPath;
  allPaths: ReasoningPath[];
  consensusScore: number;
  disagreements: string[];
}

export interface SelfCritiqueResult {
  originalResponse: string;
  critique: string;
  improvedResponse: string;
  improvementsMade: string[];
}

export interface ValidationResult {
  passed: string[];
  failed: string[];
  score: number;
}

export interface AgentPersona {
  id: AgentType;
  name: string;
  tagline: string;
  description: string;
  capabilities: string[];
  icon: string;
  color: string;
}

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

export interface RunOutcome {
  id: string;
  runId: string;
  agentType: AgentType;
  outcomeStatus: OutcomeStatus;
  editDistance?: number | null;
  timeToDecision?: number | null;
  grokAgreed?: boolean | null;
  classicMetrics?: StoredCLASSicMetrics | null;
  promptVersion?: string | null;
  createdAt: Date;
}

export interface InsertRunOutcome {
  runId: string;
  agentType: AgentType;
  outcomeStatus: OutcomeStatus;
  editDistance?: number | null;
  timeToDecision?: number | null;
  grokAgreed?: boolean | null;
  classicMetrics?: StoredCLASSicMetrics | null;
  promptVersion?: string | null;
}

export interface HumanFeedback {
  id: string;
  runId: string;
  rating?: number | null;
  tags?: string[] | null;
  comment?: string | null;
  submittedAt: Date;
}

export interface InsertHumanFeedback {
  runId: string;
  rating?: number | null;
  tags?: string[] | null;
  comment?: string | null;
}

export interface PromptVariant {
  id: string;
  agentType: AgentType;
  version: number;
  promptText: string;
  status: PromptStatus;
  trafficPercent?: number | null;
  metrics?: PromptMetrics | null;
  createdAt: Date;
  promotedAt?: Date | null;
  retiredAt?: Date | null;
}

export interface InsertPromptVariant {
  agentType: AgentType;
  version: number;
  promptText: string;
  status: PromptStatus;
  trafficPercent?: number | null;
  metrics?: PromptMetrics | null;
  promotedAt?: Date | null;
  retiredAt?: Date | null;
}

export interface MemoryEntry {
  id: string;
  agentType: AgentType;
  taskDescription: string;
  taskEmbedding?: number[] | null;
  response: string;
  qualityScore: number;
  accessCount?: number | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface InsertMemoryEntry {
  agentType: AgentType;
  taskDescription: string;
  taskEmbedding?: number[] | null;
  response: string;
  qualityScore: number;
  expiresAt: Date;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogDestination = "stdout" | "file" | "http";

export interface LoggerConfig {
  level: LogLevel;
  destination: LogDestination;
  filePath?: string;
  httpEndpoint?: string;
  prettyPrint: boolean;
  redactPrompts: boolean;
  redactPatterns: RegExp[];
  stream?: NodeJS.WritableStream;
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: "info",
  destination: "stdout",
  prettyPrint: false,
  redactPrompts: true,
  redactPatterns: [/api_key/i, /password/i, /secret/i, /token/i],
};

export interface SecurityEvent {
  eventType: "prompt_injection" | "unsafe_code" | "pii_detected";
  blocked: boolean;
  details: string;
  timestamp: Date;
}

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
  metrics?: StoredCLASSicMetrics;
  grokAnalysis?: {
    agreed: boolean;
    reasoning?: string;
  };
}

export interface ExportedRunBundle {
  version: string;
  exportedAt: Date;
  runId: string;
  diagnostics: RunDiagnostics;
  logs: unknown[];
  config: Partial<LoggerConfig>;
}

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
