import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import type { AgentType, CLASSicMetrics } from "./types";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogDestination = "stdout" | "file" | "http";

export interface LogContext {
  runId: string;
  agentType?: AgentType;
  action?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  runId: string;
  agentType?: AgentType;
  action?: string;
  outcome?: "success" | "failure" | "partial";
  metrics?: Partial<CLASSicMetrics>;
  validations?: {
    passed: number;
    failed: number;
  };
  errorCode?: string;
  promptHash?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint: boolean;
  destination: LogDestination;
  filePath?: string;
  httpEndpoint?: string;
  redactPrompts: boolean;
  redactPatterns: RegExp[];
  stream?: NodeJS.WritableStream | { write: (chunk: string) => void };
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: "info",
  prettyPrint: process.env.NODE_ENV !== "production",
  destination: "stdout",
  redactPrompts: true,
  redactPatterns: [/api_key/i, /password/i, /secret/i, /token/i, /authorization/i],
};

function resolveEnvConfig(): Partial<LoggerConfig> {
  const config: Partial<LoggerConfig> = {};

  const level = process.env.AI_AGENTS_LOG_LEVEL?.toLowerCase();
  if (level && ["trace", "debug", "info", "warn", "error", "fatal"].includes(level)) {
    config.level = level as LogLevel;
  }

  if (process.env.AI_AGENTS_DEBUG === "true") {
    config.level = "trace";
  }

  const dest = process.env.AI_AGENTS_LOG_DEST?.toLowerCase();
  if (dest && ["stdout", "file", "http"].includes(dest)) {
    config.destination = dest as LogDestination;
  }

  if (process.env.AI_AGENTS_LOG_FILE) {
    config.filePath = process.env.AI_AGENTS_LOG_FILE;
    config.destination = "file";
  }

  if (process.env.AI_AGENTS_LOG_HTTP) {
    config.httpEndpoint = process.env.AI_AGENTS_LOG_HTTP;
    config.destination = "http";
  }

  if (process.env.AI_AGENTS_PRETTY === "true") {
    config.prettyPrint = true;
  } else if (process.env.AI_AGENTS_PRETTY === "false") {
    config.prettyPrint = false;
  }

  if (process.env.AI_AGENTS_REDACT === "false") {
    config.redactPrompts = false;
  }

  return config;
}

function createDestinationStream(config: LoggerConfig): NodeJS.WritableStream | undefined {
  if (config.stream) {
    return config.stream as NodeJS.WritableStream;
  }

  if (config.destination === "file" && config.filePath) {
    return fs.createWriteStream(config.filePath, { flags: "a" });
  }

  if (config.destination === "http" && config.httpEndpoint) {
    const endpoint = config.httpEndpoint;
    return {
      write(chunk: string) {
        try {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: chunk,
          }).catch(() => {});
        } catch {}
      },
    } as unknown as NodeJS.WritableStream;
  }

  return undefined;
}

class Logger {
  private pino: pino.Logger;
  private config: LoggerConfig;
  private currentRunId: string | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    const envConfig = resolveEnvConfig();
    this.config = { ...DEFAULT_CONFIG, ...envConfig, ...config };
    
    const stream = createDestinationStream(this.config);
    
    if (stream) {
      this.pino = pino({
        level: this.config.level,
        base: { service: "ai-coding-agents" },
        timestamp: pino.stdTimeFunctions.isoTime,
      }, stream);
    } else {
      const transport = this.config.prettyPrint
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          }
        : undefined;

      this.pino = pino({
        level: this.config.level,
        transport,
        base: { service: "ai-coding-agents" },
        timestamp: pino.stdTimeFunctions.isoTime,
      });
    }
  }

  getConfig(): LoggerConfig {
    return { ...this.config, redactPatterns: [...this.config.redactPatterns] };
  }

  startRun(agentType?: AgentType): string {
    this.currentRunId = uuidv4();
    this.info("Run started", { agentType }, { runId: this.currentRunId });
    return this.currentRunId;
  }

  endRun(outcome: "success" | "failure" | "partial", metrics?: Partial<CLASSicMetrics>): void {
    if (this.currentRunId) {
      this.info("Run completed", { outcome, metrics }, { runId: this.currentRunId });
      this.currentRunId = null;
    }
  }

  getRunId(): string {
    return this.currentRunId || uuidv4();
  }

  private buildEntry(
    level: LogLevel,
    message: string,
    data: Record<string, unknown> = {},
    context: Partial<LogContext> = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      runId: context.runId || this.currentRunId || "no-run",
      agentType: context.agentType,
      action: context.action,
      message,
      ...data,
    };
  }

  trace(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void {
    const entry = this.buildEntry("trace", message, data, context);
    this.pino.trace(entry, message);
  }

  debug(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void {
    const entry = this.buildEntry("debug", message, data, context);
    this.pino.debug(entry, message);
  }

  info(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void {
    const entry = this.buildEntry("info", message, data, context);
    this.pino.info(entry, message);
  }

  warn(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void {
    const entry = this.buildEntry("warn", message, data, context);
    this.pino.warn(entry, message);
  }

  error(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    const errorData = error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error };
    const entry = this.buildEntry("error", message, errorData, context);
    this.pino.error(entry, message);
  }

  fatal(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    const errorData = error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error };
    const entry = this.buildEntry("fatal", message, errorData, context);
    this.pino.fatal(entry, message);
  }

  logAgentInvocation(
    agentType: AgentType,
    action: string,
    outcome: "success" | "failure" | "partial",
    metrics?: CLASSicMetrics,
    promptHash?: string
  ): void {
    const data: Record<string, unknown> = {
      outcome,
    };

    if (metrics) {
      data.metrics = {
        latencyMs: metrics.latency.totalMs,
        tokensUsed: metrics.cost.tokens,
        estimatedCost: metrics.cost.estimatedCost,
      };
      data.validations = {
        passed: metrics.accuracy.validationsPassed,
        failed: metrics.accuracy.validationsFailed,
      };
    }

    if (promptHash && !this.config.redactPrompts) {
      data.promptHash = promptHash;
    }

    this.info(`Agent ${agentType} ${action}`, data, { agentType, action });
  }

  logValidationResult(
    passed: string[],
    failed: string[],
    enforced: boolean
  ): void {
    const level = failed.length > 0 ? (enforced ? "error" : "warn") : "info";
    const message = failed.length > 0
      ? `Validation ${enforced ? "blocked" : "warning"}: ${failed.length} failures`
      : `Validation passed: ${passed.length} checks`;

    const data = {
      validations: { passed: passed.length, failed: failed.length },
      failedChecks: failed,
      enforced,
    };

    if (level === "error") {
      const entry = this.buildEntry("error", message, data, {});
      this.pino.error(entry, message);
    } else if (level === "warn") {
      this.warn(message, data);
    } else {
      this.info(message, data);
    }
  }

  logSecurityEvent(
    eventType: "prompt_injection" | "unsafe_code" | "pii_detected",
    blocked: boolean,
    details?: string
  ): void {
    const message = `Security event: ${eventType}${blocked ? " (blocked)" : ""}`;
    const data = { eventType, blocked, details };

    if (blocked) {
      this.warn(message, data);
    } else {
      this.error(message, data);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.pino = this.pino.child(bindings);
    childLogger.currentRunId = this.currentRunId;
    return childLogger;
  }
}

export const logger = new Logger();

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export function createAgentLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export function getLoggerConfig(): LoggerConfig {
  return logger.getConfig();
}

export { resolveEnvConfig, DEFAULT_CONFIG as DEFAULT_LOGGER_CONFIG };
