import { describe, it, expect } from "vitest";
import { createLogger } from "../logger";
describe("Logger", () => {
    describe("Run ID Propagation", () => {
        it("should return a valid UUID run ID from startRun", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("architect");
            expect(runId).toBeDefined();
            expect(typeof runId).toBe("string");
            expect(runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
        it("should use the same run ID throughout a run via getRunId", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("mechanic");
            const retrievedRunId = logger.getRunId();
            expect(retrievedRunId).toBe(runId);
        });
        it("should generate unique run IDs for each startRun call", () => {
            const logger = createLogger({ level: "trace" });
            const runId1 = logger.startRun("codeNinja");
            logger.endRun("success");
            const runId2 = logger.startRun("philosopher");
            expect(runId1).not.toBe(runId2);
            expect(runId1).toMatch(/^[0-9a-f-]{36}$/i);
            expect(runId2).toMatch(/^[0-9a-f-]{36}$/i);
        });
        it("should clear run ID after endRun and generate new one on getRunId", () => {
            const logger = createLogger({ level: "trace" });
            const originalRunId = logger.startRun("architect");
            logger.endRun("success");
            const newRunId = logger.getRunId();
            expect(newRunId).not.toBe(originalRunId);
            expect(newRunId).toMatch(/^[0-9a-f-]{36}$/i);
        });
        it("should propagate runId to child loggers", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("architect");
            const childLogger = logger.child({ component: "test" });
            expect(childLogger.getRunId()).toBe(runId);
        });
    });
    describe("Failure Logging", () => {
        it("should accept failure outcome in endRun without throwing", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("mechanic");
            expect(() => logger.endRun("failure")).not.toThrow();
        });
        it("should accept undefined metrics in endRun for early failures", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("codeNinja");
            expect(() => logger.endRun("failure", undefined)).not.toThrow();
        });
        it("should accept partial outcomes", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("philosopher");
            expect(() => logger.endRun("partial")).not.toThrow();
        });
        it("should accept metrics with failure outcome", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("architect");
            const metrics = {
                cost: { tokens: 100, inputTokens: 50, outputTokens: 50, estimatedCost: 0.01 },
                latency: { totalMs: 1000, perStepMs: [500, 500] },
                accuracy: { taskSuccessRate: 0.5, validationsPassed: 2, validationsFailed: 3 },
                security: { promptInjectionBlocked: true, safeCodeGenerated: true },
                stability: { consistencyScore: 0.3, hallucinationDetected: true, pathsEvaluated: 3 },
            };
            expect(() => logger.endRun("failure", metrics)).not.toThrow();
        });
    });
    describe("Log Levels", () => {
        it("should support all log levels without throwing", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("architect");
            const context = { runId, agentType: "architect" };
            expect(() => logger.trace("test trace", {}, context)).not.toThrow();
            expect(() => logger.debug("test debug", {}, context)).not.toThrow();
            expect(() => logger.info("test info", {}, context)).not.toThrow();
            expect(() => logger.warn("test warn", {}, context)).not.toThrow();
            expect(() => logger.error("test error", new Error("test"), context)).not.toThrow();
            expect(() => logger.fatal("test fatal", new Error("fatal"), context)).not.toThrow();
        });
        it("should handle error objects correctly", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("mechanic");
            const testError = new Error("Test error message");
            testError.name = "TestError";
            expect(() => logger.error("Error occurred", testError, { runId })).not.toThrow();
        });
        it("should handle non-Error objects in error logging", () => {
            const logger = createLogger({ level: "trace" });
            const runId = logger.startRun("codeNinja");
            expect(() => logger.error("Error occurred", { custom: "error" }, { runId })).not.toThrow();
            expect(() => logger.error("Error occurred", "string error", { runId })).not.toThrow();
            expect(() => logger.error("Error occurred", null, { runId })).not.toThrow();
        });
    });
    describe("Agent Invocation Logging", () => {
        it("should log agent invocation with full metrics", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("architect");
            const metrics = {
                cost: { tokens: 100, inputTokens: 50, outputTokens: 50, estimatedCost: 0.01 },
                latency: { totalMs: 1000, perStepMs: [500, 500] },
                accuracy: { taskSuccessRate: 0.9, validationsPassed: 5, validationsFailed: 0 },
                security: { promptInjectionBlocked: true, safeCodeGenerated: true },
                stability: { consistencyScore: 0.85, hallucinationDetected: false, pathsEvaluated: 3 },
            };
            expect(() => logger.logAgentInvocation("architect", "invoke", "success", metrics)).not.toThrow();
        });
        it("should log agent invocation without metrics for failures", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("mechanic");
            expect(() => logger.logAgentInvocation("mechanic", "invoke", "failure")).not.toThrow();
        });
        it("should log agent invocation with partial outcome", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("codeNinja");
            expect(() => logger.logAgentInvocation("codeNinja", "invoke", "partial")).not.toThrow();
        });
        it("should log agent invocation with promptHash when redaction disabled", () => {
            const logger = createLogger({ level: "trace", redactPrompts: false });
            logger.startRun("philosopher");
            const metrics = {
                cost: { tokens: 50, inputTokens: 25, outputTokens: 25, estimatedCost: 0.005 },
                latency: { totalMs: 500, perStepMs: [500] },
                accuracy: { taskSuccessRate: 0.95, validationsPassed: 3, validationsFailed: 0 },
                security: { promptInjectionBlocked: true, safeCodeGenerated: true },
                stability: { consistencyScore: 0.9, hallucinationDetected: false, pathsEvaluated: 1 },
            };
            expect(() => logger.logAgentInvocation("philosopher", "invoke", "success", metrics, "abc123hash")).not.toThrow();
        });
    });
    describe("Security Event Logging", () => {
        it("should log blocked security events", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("codeNinja");
            expect(() => logger.logSecurityEvent("prompt_injection", true)).not.toThrow();
            expect(() => logger.logSecurityEvent("unsafe_code", true)).not.toThrow();
            expect(() => logger.logSecurityEvent("pii_detected", true, "SSN detected")).not.toThrow();
        });
        it("should log unblocked security events (warnings)", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("architect");
            expect(() => logger.logSecurityEvent("pii_detected", false, "Email address found")).not.toThrow();
        });
    });
    describe("Validation Result Logging", () => {
        it("should log successful validation results", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("philosopher");
            expect(() => logger.logValidationResult(["check1", "check2", "check3"], [], true)).not.toThrow();
        });
        it("should log validation failures with enforcement", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("mechanic");
            expect(() => logger.logValidationResult(["check1"], ["failed1", "failed2"], true)).not.toThrow();
        });
        it("should log validation failures without enforcement (warnings)", () => {
            const logger = createLogger({ level: "trace" });
            logger.startRun("codeNinja");
            expect(() => logger.logValidationResult([], ["failed1", "failed2"], false)).not.toThrow();
        });
    });
    describe("Configuration", () => {
        it("should respect log level configuration", () => {
            const logger = createLogger({ level: "error" });
            const runId = logger.startRun("architect");
            expect(() => logger.trace("should not output", {}, { runId })).not.toThrow();
            expect(() => logger.error("should output", undefined, { runId })).not.toThrow();
        });
        it("should create child logger with bindings", () => {
            const logger = createLogger({ level: "info" });
            logger.startRun("architect");
            const child = logger.child({ component: "test-component", version: "1.0.0" });
            expect(child).toBeDefined();
            expect(() => child.info("child log")).not.toThrow();
        });
    });
});
//# sourceMappingURL=logger.test.js.map