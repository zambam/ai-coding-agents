// Main exports for @ai-coding-agents package

// Orchestrator and Agents
export { 
  Orchestrator,
  Architect, 
  Mechanic, 
  CodeNinja, 
  Philosopher,
  BaseAgent,
} from "./agents/index.js";

// Core utilities
export { PromptEngine } from "./agents/prompt-engine.js";
export { Evaluator } from "./agents/evaluator.js";
export { ReplitMdParser } from "./agents/replit-md-parser.js";
export { getGrokSecondOpinion, setGrokClient } from "./agents/grok-client.js";

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
} from "./logger.js";
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
} from "./errors.js";

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
} from "./validation.js";

// Configuration constants
export { 
  DEFAULT_AGENT_CONFIG, 
  STRICT_AGENT_CONFIG,
  AGENT_PERSONAS,
} from "./constants.js";

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
} from "./types.js";

export { 
  OUTCOME_STATUSES, 
  PROMPT_STATUSES, 
  FEEDBACK_TAGS,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_DIAGNOSTICS_OPTIONS,
} from "./types.js";

export type { GrokResponse } from "./agents/grok-client.js";

// QA Scanner
export { 
  FakeDataScanner, 
  createScanner,
  type ScannerOptions,
  type ScanIssue,
  type ScanResult,
} from "./scanner.js";

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
} from "./client-sdk.js";

// Express Router and Drizzle Schema are available as separate subpath imports:
// import { createAgentRouter } from 'ai-coding-agents/express';
// import { agentReportsTable } from 'ai-coding-agents/drizzle';
// These are not re-exported here to avoid requiring express/drizzle-orm at import time.

// Project Initialization
export {
  initProject,
  generateStorageScaffold,
  type InitOptions,
  type InitResult,
} from "./init.js";
