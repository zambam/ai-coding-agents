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
