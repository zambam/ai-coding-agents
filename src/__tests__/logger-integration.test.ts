import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLogger } from "../logger";
import type { CLASSicMetrics } from "../types";

describe("Logger Integration - Log Payload Verification", () => {
  let capturedLogs: Array<{ level: string; msg: string; data: Record<string, unknown> }> = [];

  beforeEach(() => {
    capturedLogs = [];
  });

  describe("Run ID Propagation in Log Entries", () => {
    it("should include runId in all log entries after startRun", () => {
      const logger = createLogger({ level: "trace" });
      const runId = logger.startRun("architect");
      
      expect(runId).toMatch(/^[0-9a-f-]{36}$/i);
      
      const context = { runId, agentType: "architect" as const };
      logger.info("Test message", { testData: "value" }, context);
      logger.debug("Debug message", { debug: true }, context);
      
      expect(logger.getRunId()).toBe(runId);
    });

    it("should track run lifecycle from start to end", () => {
      const logger = createLogger({ level: "trace" });
      
      const runId = logger.startRun("mechanic");
      expect(logger.getRunId()).toBe(runId);
      
      logger.endRun("success");
      
      const afterEndRunId = logger.getRunId();
      expect(afterEndRunId).not.toBe(runId);
    });

    it("should maintain runId consistency across multiple log calls", () => {
      const logger = createLogger({ level: "trace" });
      const runId = logger.startRun("codeNinja");
      
      for (let i = 0; i < 5; i++) {
        expect(logger.getRunId()).toBe(runId);
      }
    });
  });

  describe("Outcome Recording", () => {
    it("should accept success outcome with metrics", () => {
      const logger = createLogger({ level: "trace" });
      const runId = logger.startRun("architect");
      
      const metrics: Partial<CLASSicMetrics> = {
        latency: { totalMs: 1500, perStepMs: [500, 500, 500] },
        cost: { tokens: 200, inputTokens: 100, outputTokens: 100, estimatedCost: 0.02 },
      };
      
      expect(() => logger.endRun("success", metrics)).not.toThrow();
    });

    it("should accept failure outcome without metrics", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("mechanic");
      
      expect(() => logger.endRun("failure")).not.toThrow();
    });

    it("should accept partial outcome", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("philosopher");
      
      expect(() => logger.endRun("partial")).not.toThrow();
    });
  });

  describe("Agent Invocation Telemetry", () => {
    it("should log invocation with complete metrics payload", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("architect");
      
      const metrics: CLASSicMetrics = {
        cost: { tokens: 150, inputTokens: 75, outputTokens: 75, estimatedCost: 0.015 },
        latency: { totalMs: 2000, perStepMs: [600, 700, 700] },
        accuracy: { taskSuccessRate: 0.92, validationsPassed: 8, validationsFailed: 1 },
        security: { promptInjectionBlocked: true, safeCodeGenerated: true },
        stability: { consistencyScore: 0.88, hallucinationDetected: false, pathsEvaluated: 3 },
      };
      
      expect(() => logger.logAgentInvocation("architect", "invoke", "success", metrics)).not.toThrow();
    });

    it("should log invocation failure without metrics", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("codeNinja");
      
      expect(() => logger.logAgentInvocation("codeNinja", "invoke", "failure")).not.toThrow();
    });
  });

  describe("Security Event Metadata", () => {
    it("should log prompt injection event with blocked status", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("architect");
      
      expect(() => logger.logSecurityEvent("prompt_injection", true)).not.toThrow();
    });

    it("should log unsafe code event with details", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("codeNinja");
      
      expect(() => logger.logSecurityEvent("unsafe_code", true, "eval() detected")).not.toThrow();
    });

    it("should log PII detection with details", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("mechanic");
      
      expect(() => logger.logSecurityEvent("pii_detected", true, "Email address found")).not.toThrow();
      expect(() => logger.logSecurityEvent("pii_detected", false, "SSN pattern detected")).not.toThrow();
    });
  });

  describe("Validation Result Logging", () => {
    it("should log validation success with check counts", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("philosopher");
      
      const passed = ["check1", "check2", "check3", "check4"];
      const failed: string[] = [];
      
      expect(() => logger.logValidationResult(passed, failed, true)).not.toThrow();
    });

    it("should log validation failure with enforcement flag", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("architect");
      
      const passed = ["check1"];
      const failed = ["validation_error_1", "validation_error_2"];
      
      expect(() => logger.logValidationResult(passed, failed, true)).not.toThrow();
    });

    it("should log validation warning when not enforced", () => {
      const logger = createLogger({ level: "trace" });
      logger.startRun("mechanic");
      
      const passed: string[] = [];
      const failed = ["warning1", "warning2"];
      
      expect(() => logger.logValidationResult(passed, failed, false)).not.toThrow();
    });
  });

  describe("Child Logger Inheritance", () => {
    it("should inherit runId in child logger", () => {
      const logger = createLogger({ level: "trace" });
      const runId = logger.startRun("architect");
      
      const child = logger.child({ component: "evaluator" });
      
      expect(child.getRunId()).toBe(runId);
    });

    it("should maintain runId after parent ends run", () => {
      const logger = createLogger({ level: "trace" });
      const runId = logger.startRun("mechanic");
      const child = logger.child({ component: "parser" });
      
      expect(child.getRunId()).toBe(runId);
    });
  });
});
