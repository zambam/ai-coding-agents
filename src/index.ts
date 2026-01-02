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

// Logging and debugging
export { 
  logger, 
  createLogger, 
  createAgentLogger, 
  getLoggerConfig,
  resolveEnvConfig,
  type LogContext, 
  type LogEntry,
  type LoggerConfig as PinoLoggerConfig,
} from "./logger";
export { 
  AgentError,
  ValidationError,
  SecurityError,
  ConnectionError,
  RateLimitError,
  AgentErrorCode,
  createRunId,
  hashPrompt,
  type ErrorContext,
} from "./errors";

// Validation and enforcement
export {
  validateResponse,
  enforceValidation,
  checkFakeData,
  checkPII,
  checkSecurity,
  enforceClassicThresholds,
  type EnforcementConfig,
  type CLASSicThresholds,
  type FakeDataCheckResult,
  type SecurityCheckResult,
} from "./validation";

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
  OutcomeStatus,
  PromptStatus,
  FeedbackTag,
  PromptMetrics,
  StoredCLASSicMetrics,
  RunOutcome,
  InsertRunOutcome,
  HumanFeedback,
  InsertHumanFeedback,
  PromptVariant,
  InsertPromptVariant,
  MemoryEntry,
  InsertMemoryEntry,
  LogLevel,
  LogDestination,
  LoggerConfig,
  SecurityEvent,
  RunDiagnostics,
  ExportedRunBundle,
  DiagnosticsOptions,
} from "./types";

export { 
  OUTCOME_STATUSES, 
  PROMPT_STATUSES, 
  FEEDBACK_TAGS,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_DIAGNOSTICS_OPTIONS,
} from "./types";

export type { GrokResponse } from "./agents/grok-client";

// QA Scanner
export { 
  FakeDataScanner, 
  createScanner,
  type ScannerOptions,
  type ScanIssue,
  type ScanResult,
} from "./scanner";

// Client SDK for ML reporting
export {
  AgentMonitorClient,
  createMonitorClient,
  loadConfig,
  createAutoClient,
  type ExternalAgentType,
  type ClientConfig,
  type ReportEvent,
  type ReportResult,
  type Guidelines,
  type AnalyticsResult,
} from "./client-sdk";
