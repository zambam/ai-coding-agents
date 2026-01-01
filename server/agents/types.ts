import type { AgentType, AgentResponse, CLASSicMetrics, AgentConfig, ReasoningStep } from "@shared/schema";

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

export interface PromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  responseSchema: string;
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
