// Main exports for @ai-coding-agents package

// Orchestrator and Agents
export { 
  Orchestrator,
  Architect, 
  Mechanic, 
  CodeNinja, 
  Philosopher,
  BaseAgent,
} from "./agents";

// Core utilities
export { PromptEngine } from "./agents/prompt-engine";
export { Evaluator } from "./agents/evaluator";
export { ReplitMdParser } from "./agents/replit-md-parser";
export { getGrokSecondOpinion, setGrokClient } from "./agents/grok-client";

// Configuration constants
export { 
  DEFAULT_AGENT_CONFIG, 
  STRICT_AGENT_CONFIG,
  AGENT_PERSONAS,
} from "./constants";

// Types
export type {
  AgentType,
  AgentConfig,
  AgentResponse,
  AgentInvocationResult,
  AgentInvocationRequest,
  CLASSicMetrics,
  GrokSecondOpinion,
  ReasoningStep,
  ReasoningPath,
  ConsistencyResult,
  SelfCritiqueResult,
  ValidationResult,
  ValidationLevel,
  ConsistencyMode,
  ReplitMdConfig,
  AgentPersona,
} from "./types";

export type { GrokResponse } from "./agents/grok-client";
