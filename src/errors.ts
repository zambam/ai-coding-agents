import { v4 as uuidv4 } from "uuid";

export enum AgentErrorCode {
  OPENAI_CONNECTION_FAILED = "E001",
  GROK_CONNECTION_FAILED = "E002",
  TIMEOUT_EXCEEDED = "E003",
  RATE_LIMIT_EXCEEDED = "E004",
  API_KEY_INVALID = "E005",

  PROMPT_INJECTION_DETECTED = "E101",
  RESPONSE_VALIDATION_FAILED = "E102",
  CONSISTENCY_THRESHOLD_NOT_MET = "E103",
  FAKE_DATA_DETECTED = "E104",
  PII_DETECTED = "E105",

  JSON_PARSE_FAILED = "E201",
  COT_REASONING_INCOMPLETE = "E202",
  SELF_CRITIQUE_LOOP_EXCEEDED = "E203",
  AGENT_NOT_FOUND = "E204",
  INVALID_CONFIG = "E205",
}

export interface ErrorContext {
  runId: string;
  agentType?: string;
  action?: string;
  promptHash?: string;
  metadata?: Record<string, unknown>;
}

export class AgentError extends Error {
  public readonly code: AgentErrorCode;
  public readonly context: ErrorContext;
  public readonly timestamp: string;
  public readonly recoverable: boolean;

  constructor(
    code: AgentErrorCode,
    message: string,
    context: Partial<ErrorContext> = {},
    recoverable = false
  ) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.context = {
      runId: context.runId || uuidv4(),
      ...context,
    };
    this.timestamp = new Date().toISOString();
    this.recoverable = recoverable;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
    };
  }
}

export class ValidationError extends AgentError {
  public readonly validationFailures: string[];

  constructor(
    failures: string[],
    context: Partial<ErrorContext> = {}
  ) {
    super(
      AgentErrorCode.RESPONSE_VALIDATION_FAILED,
      `Validation failed: ${failures.join(", ")}`,
      context,
      false
    );
    this.name = "ValidationError";
    this.validationFailures = failures;
  }
}

export class SecurityError extends AgentError {
  public readonly securityType: "prompt_injection" | "unsafe_code" | "pii_leak";

  constructor(
    securityType: "prompt_injection" | "unsafe_code" | "pii_leak",
    message: string,
    context: Partial<ErrorContext> = {}
  ) {
    const codeMap = {
      prompt_injection: AgentErrorCode.PROMPT_INJECTION_DETECTED,
      unsafe_code: AgentErrorCode.RESPONSE_VALIDATION_FAILED,
      pii_leak: AgentErrorCode.PII_DETECTED,
    };
    super(codeMap[securityType], message, context, false);
    this.name = "SecurityError";
    this.securityType = securityType;
  }
}

export class ConnectionError extends AgentError {
  public readonly service: "openai" | "grok";
  public readonly statusCode?: number;

  constructor(
    service: "openai" | "grok",
    message: string,
    statusCode?: number,
    context: Partial<ErrorContext> = {}
  ) {
    const code = service === "openai" 
      ? AgentErrorCode.OPENAI_CONNECTION_FAILED 
      : AgentErrorCode.GROK_CONNECTION_FAILED;
    super(code, message, context, true);
    this.name = "ConnectionError";
    this.service = service;
    this.statusCode = statusCode;
  }
}

export class RateLimitError extends AgentError {
  public readonly retryAfterMs?: number;

  constructor(
    retryAfterMs?: number,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      AgentErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ""}`,
      context,
      true
    );
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function createRunId(): string {
  return uuidv4();
}

export function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
