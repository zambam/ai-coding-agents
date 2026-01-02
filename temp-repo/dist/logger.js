import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
const DEFAULT_CONFIG = {
    level: "info",
    prettyPrint: process.env.NODE_ENV !== "production",
    destination: "stdout",
    redactPrompts: true,
    redactPatterns: [/api_key/i, /password/i, /secret/i, /token/i, /authorization/i],
};
function resolveEnvConfig() {
    const config = {};
    const level = process.env.AI_AGENTS_LOG_LEVEL?.toLowerCase();
    if (level && ["trace", "debug", "info", "warn", "error", "fatal"].includes(level)) {
        config.level = level;
    }
    if (process.env.AI_AGENTS_DEBUG === "true") {
        config.level = "trace";
    }
    const dest = process.env.AI_AGENTS_LOG_DEST?.toLowerCase();
    if (dest && ["stdout", "file", "http"].includes(dest)) {
        config.destination = dest;
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
    }
    else if (process.env.AI_AGENTS_PRETTY === "false") {
        config.prettyPrint = false;
    }
    if (process.env.AI_AGENTS_REDACT === "false") {
        config.redactPrompts = false;
    }
    return config;
}
function createDestinationStream(config) {
    if (config.stream) {
        return config.stream;
    }
    if (config.destination === "file" && config.filePath) {
        return fs.createWriteStream(config.filePath, { flags: "a" });
    }
    if (config.destination === "http" && config.httpEndpoint) {
        const endpoint = config.httpEndpoint;
        return {
            write(chunk) {
                try {
                    fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: chunk,
                    }).catch(() => { });
                }
                catch { }
            },
        };
    }
    return undefined;
}
class Logger {
    constructor(config = {}) {
        this.currentRunId = null;
        const envConfig = resolveEnvConfig();
        this.config = { ...DEFAULT_CONFIG, ...envConfig, ...config };
        const stream = createDestinationStream(this.config);
        if (stream) {
            this.pino = pino({
                level: this.config.level,
                base: { service: "ai-coding-agents" },
                timestamp: pino.stdTimeFunctions.isoTime,
            }, stream);
        }
        else {
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
    getConfig() {
        return { ...this.config, redactPatterns: [...this.config.redactPatterns] };
    }
    startRun(agentType) {
        this.currentRunId = uuidv4();
        this.info("Run started", { agentType }, { runId: this.currentRunId });
        return this.currentRunId;
    }
    endRun(outcome, metrics) {
        if (this.currentRunId) {
            this.info("Run completed", { outcome, metrics }, { runId: this.currentRunId });
            this.currentRunId = null;
        }
    }
    getRunId() {
        return this.currentRunId || uuidv4();
    }
    buildEntry(level, message, data = {}, context = {}) {
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
    trace(message, data, context) {
        const entry = this.buildEntry("trace", message, data, context);
        this.pino.trace(entry, message);
    }
    debug(message, data, context) {
        const entry = this.buildEntry("debug", message, data, context);
        this.pino.debug(entry, message);
    }
    info(message, data, context) {
        const entry = this.buildEntry("info", message, data, context);
        this.pino.info(entry, message);
    }
    warn(message, data, context) {
        const entry = this.buildEntry("warn", message, data, context);
        this.pino.warn(entry, message);
    }
    error(message, error, context) {
        const errorData = error instanceof Error
            ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
            : { error };
        const entry = this.buildEntry("error", message, errorData, context);
        this.pino.error(entry, message);
    }
    fatal(message, error, context) {
        const errorData = error instanceof Error
            ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
            : { error };
        const entry = this.buildEntry("fatal", message, errorData, context);
        this.pino.fatal(entry, message);
    }
    logAgentInvocation(agentType, action, outcome, metrics, promptHash) {
        const data = {
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
    logValidationResult(passed, failed, enforced) {
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
        }
        else if (level === "warn") {
            this.warn(message, data);
        }
        else {
            this.info(message, data);
        }
    }
    logSecurityEvent(eventType, blocked, details) {
        const message = `Security event: ${eventType}${blocked ? " (blocked)" : ""}`;
        const data = { eventType, blocked, details };
        if (blocked) {
            this.warn(message, data);
        }
        else {
            this.error(message, data);
        }
    }
    child(bindings) {
        const childLogger = new Logger(this.config);
        childLogger.pino = this.pino.child(bindings);
        childLogger.currentRunId = this.currentRunId;
        return childLogger;
    }
}
export const logger = new Logger();
export function createLogger(config) {
    return new Logger(config);
}
export function createAgentLogger(config) {
    return new Logger(config);
}
export function getLoggerConfig() {
    return logger.getConfig();
}
export { resolveEnvConfig, DEFAULT_CONFIG as DEFAULT_LOGGER_CONFIG };
//# sourceMappingURL=logger.js.map