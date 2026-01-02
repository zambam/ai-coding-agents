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
    stream?: NodeJS.WritableStream | {
        write: (chunk: string) => void;
    };
}
declare const DEFAULT_CONFIG: LoggerConfig;
declare function resolveEnvConfig(): Partial<LoggerConfig>;
declare class Logger {
    private pino;
    private config;
    private currentRunId;
    constructor(config?: Partial<LoggerConfig>);
    getConfig(): LoggerConfig;
    startRun(agentType?: AgentType): string;
    endRun(outcome: "success" | "failure" | "partial", metrics?: Partial<CLASSicMetrics>): void;
    getRunId(): string;
    private buildEntry;
    trace(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void;
    debug(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void;
    info(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void;
    warn(message: string, data?: Record<string, unknown>, context?: Partial<LogContext>): void;
    error(message: string, error?: Error | unknown, context?: Partial<LogContext>): void;
    fatal(message: string, error?: Error | unknown, context?: Partial<LogContext>): void;
    logAgentInvocation(agentType: AgentType, action: string, outcome: "success" | "failure" | "partial", metrics?: CLASSicMetrics, promptHash?: string): void;
    logValidationResult(passed: string[], failed: string[], enforced: boolean): void;
    logSecurityEvent(eventType: "prompt_injection" | "unsafe_code" | "pii_detected", blocked: boolean, details?: string): void;
    child(bindings: Record<string, unknown>): Logger;
}
export declare const logger: Logger;
export declare function createLogger(config?: Partial<LoggerConfig>): Logger;
export declare function createAgentLogger(config?: Partial<LoggerConfig>): Logger;
export declare function getLoggerConfig(): LoggerConfig;
export { resolveEnvConfig, DEFAULT_CONFIG as DEFAULT_LOGGER_CONFIG };
//# sourceMappingURL=logger.d.ts.map