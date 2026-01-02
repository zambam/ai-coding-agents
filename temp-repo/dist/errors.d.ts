export declare enum AgentErrorCode {
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
    INVALID_CONFIG = "E205"
}
export interface ErrorContext {
    runId: string;
    agentType?: string;
    action?: string;
    promptHash?: string;
    metadata?: Record<string, unknown>;
}
export declare class AgentError extends Error {
    readonly code: AgentErrorCode;
    readonly context: ErrorContext;
    readonly timestamp: string;
    readonly recoverable: boolean;
    constructor(code: AgentErrorCode, message: string, context?: Partial<ErrorContext>, recoverable?: boolean);
    toJSON(): {
        name: string;
        code: AgentErrorCode;
        message: string;
        context: ErrorContext;
        timestamp: string;
        recoverable: boolean;
    };
}
export declare class ValidationError extends AgentError {
    readonly validationFailures: string[];
    constructor(failures: string[], context?: Partial<ErrorContext>);
}
export declare class SecurityError extends AgentError {
    readonly securityType: "prompt_injection" | "unsafe_code" | "pii_leak";
    constructor(securityType: "prompt_injection" | "unsafe_code" | "pii_leak", message: string, context?: Partial<ErrorContext>);
}
export declare class ConnectionError extends AgentError {
    readonly service: "openai" | "grok";
    readonly statusCode?: number;
    constructor(service: "openai" | "grok", message: string, statusCode?: number, context?: Partial<ErrorContext>);
}
export declare class RateLimitError extends AgentError {
    readonly retryAfterMs?: number;
    constructor(retryAfterMs?: number, context?: Partial<ErrorContext>);
}
export declare function createRunId(): string;
export declare function hashPrompt(prompt: string): string;
//# sourceMappingURL=errors.d.ts.map