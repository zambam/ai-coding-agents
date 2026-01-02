import { v4 as uuidv4 } from "uuid";
export var AgentErrorCode;
(function (AgentErrorCode) {
    AgentErrorCode["OPENAI_CONNECTION_FAILED"] = "E001";
    AgentErrorCode["GROK_CONNECTION_FAILED"] = "E002";
    AgentErrorCode["TIMEOUT_EXCEEDED"] = "E003";
    AgentErrorCode["RATE_LIMIT_EXCEEDED"] = "E004";
    AgentErrorCode["API_KEY_INVALID"] = "E005";
    AgentErrorCode["PROMPT_INJECTION_DETECTED"] = "E101";
    AgentErrorCode["RESPONSE_VALIDATION_FAILED"] = "E102";
    AgentErrorCode["CONSISTENCY_THRESHOLD_NOT_MET"] = "E103";
    AgentErrorCode["FAKE_DATA_DETECTED"] = "E104";
    AgentErrorCode["PII_DETECTED"] = "E105";
    AgentErrorCode["JSON_PARSE_FAILED"] = "E201";
    AgentErrorCode["COT_REASONING_INCOMPLETE"] = "E202";
    AgentErrorCode["SELF_CRITIQUE_LOOP_EXCEEDED"] = "E203";
    AgentErrorCode["AGENT_NOT_FOUND"] = "E204";
    AgentErrorCode["INVALID_CONFIG"] = "E205";
})(AgentErrorCode || (AgentErrorCode = {}));
export class AgentError extends Error {
    constructor(code, message, context = {}, recoverable = false) {
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
    constructor(failures, context = {}) {
        super(AgentErrorCode.RESPONSE_VALIDATION_FAILED, `Validation failed: ${failures.join(", ")}`, context, false);
        this.name = "ValidationError";
        this.validationFailures = failures;
    }
}
export class SecurityError extends AgentError {
    constructor(securityType, message, context = {}) {
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
    constructor(service, message, statusCode, context = {}) {
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
    constructor(retryAfterMs, context = {}) {
        super(AgentErrorCode.RATE_LIMIT_EXCEEDED, `Rate limit exceeded${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ""}`, context, true);
        this.name = "RateLimitError";
        this.retryAfterMs = retryAfterMs;
    }
}
export function createRunId() {
    return uuidv4();
}
export function hashPrompt(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
        const char = prompt.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
//# sourceMappingURL=errors.js.map