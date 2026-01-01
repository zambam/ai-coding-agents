import { describe, it, expect, beforeEach } from "vitest";
import pino from "pino";
import { createLogger } from "../logger";
import type { CLASSicMetrics } from "../types";

interface CapturedLog {
  level: number;
  levelLabel: string;
  msg: string;
  runId?: string;
  agentType?: string;
  action?: string;
  outcome?: string;
  eventType?: string;
  blocked?: boolean;
  details?: string;
  validations?: { passed: number; failed: number };
  failedChecks?: string[];
  enforced?: boolean;
  metrics?: Record<string, unknown>;
  errorName?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

class TestableLogger {
  public logs: CapturedLog[] = [];
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    const stream = {
      write: (chunk: string) => {
        try {
          const parsed = JSON.parse(chunk);
          const levelLabel = pino.levels.labels[parsed.level] || "unknown";
          this.logs.push({ ...parsed, levelLabel });
        } catch {
          // Ignore non-JSON
        }
      },
    };

    this.logger = createLogger({ level: "trace", stream, prettyPrint: false });
  }

  get instance() {
    return this.logger;
  }

  clear(): void {
    this.logs = [];
  }

  getByMessageContaining(substring: string): CapturedLog[] {
    return this.logs.filter(l => l.msg?.includes(substring));
  }

  getByLevel(level: string): CapturedLog[] {
    return this.logs.filter(l => l.levelLabel === level);
  }

  getAll(): CapturedLog[] {
    return this.logs;
  }
}

describe("Logger Payload Verification (Real createLogger)", () => {
  let testable: TestableLogger;

  beforeEach(() => {
    testable = new TestableLogger();
  });

  describe("Run ID Propagation in Log Payloads", () => {
    it("should include runId in start run log entry", () => {
      const runId = testable.instance.startRun("architect");
      
      const startLogs = testable.getByMessageContaining("Run started");
      expect(startLogs.length).toBe(1);
      expect(startLogs[0].runId).toBe(runId);
      expect(startLogs[0].agentType).toBe("architect");
    });

    it("should include same runId in end run log entry", () => {
      const runId = testable.instance.startRun("mechanic");
      testable.instance.endRun("success");
      
      const endLogs = testable.getByMessageContaining("Run completed");
      expect(endLogs.length).toBe(1);
      expect(endLogs[0].runId).toBe(runId);
      expect(endLogs[0].outcome).toBe("success");
    });

    it("should include runId in info logs", () => {
      const runId = testable.instance.startRun("codeNinja");
      
      testable.instance.info("Test message", { data: "value" });
      
      const allLogs = testable.getByMessageContaining("Test message");
      expect(allLogs.length).toBe(1);
      expect(allLogs[0].runId).toBe(runId);
    });

    it("should use provided context runId over current runId", () => {
      testable.instance.startRun("architect");
      const customRunId = "custom-run-id-12345";
      
      testable.instance.info("Custom context", {}, { runId: customRunId });
      
      const customLogs = testable.getByMessageContaining("Custom context");
      expect(customLogs[0].runId).toBe(customRunId);
    });
  });

  describe("Outcome Metadata Recording", () => {
    it("should record success outcome with metrics", () => {
      const runId = testable.instance.startRun("architect");
      
      const metrics: Partial<CLASSicMetrics> = {
        latency: { totalMs: 1500, perStepMs: [500, 500, 500] },
        cost: { tokens: 200, inputTokens: 100, outputTokens: 100, estimatedCost: 0.02 },
      };
      
      testable.instance.endRun("success", metrics);
      
      const endLogs = testable.getByMessageContaining("Run completed");
      expect(endLogs[0].outcome).toBe("success");
      expect(endLogs[0].metrics).toBeDefined();
      expect(endLogs[0].runId).toBe(runId);
    });

    it("should record failure outcome", () => {
      testable.instance.startRun("mechanic");
      testable.instance.endRun("failure");
      
      const endLogs = testable.getByMessageContaining("Run completed");
      expect(endLogs[0].outcome).toBe("failure");
    });

    it("should record partial outcome", () => {
      testable.instance.startRun("philosopher");
      testable.instance.endRun("partial");
      
      const endLogs = testable.getByMessageContaining("Run completed");
      expect(endLogs[0].outcome).toBe("partial");
    });
  });

  describe("Security Event Metadata", () => {
    it("should log prompt injection event with proper metadata when blocked", () => {
      const runId = testable.instance.startRun("architect");
      testable.instance.logSecurityEvent("prompt_injection", true, "Detected injection pattern");
      
      const securityLogs = testable.getByMessageContaining("Security event: prompt_injection");
      expect(securityLogs.length).toBeGreaterThanOrEqual(1);
      const log = securityLogs[0];
      expect(log.eventType).toBe("prompt_injection");
      expect(log.blocked).toBe(true);
      expect(log.details).toBe("Detected injection pattern");
      expect(log.runId).toBe(runId);
    });

    it("should log unsafe code event with proper metadata", () => {
      const runId = testable.instance.startRun("codeNinja");
      testable.instance.logSecurityEvent("unsafe_code", true, "eval() detected");
      
      const securityLogs = testable.getByMessageContaining("Security event: unsafe_code");
      expect(securityLogs.length).toBeGreaterThanOrEqual(1);
      const log = securityLogs[0];
      expect(log.eventType).toBe("unsafe_code");
      expect(log.blocked).toBe(true);
      expect(log.runId).toBe(runId);
    });

    it("should log PII detection event when blocked", () => {
      const runId = testable.instance.startRun("mechanic");
      testable.instance.logSecurityEvent("pii_detected", true, "Email address found");
      
      const securityLogs = testable.getByMessageContaining("Security event: pii_detected");
      expect(securityLogs.length).toBeGreaterThanOrEqual(1);
      const log = securityLogs[0];
      expect(log.eventType).toBe("pii_detected");
      expect(log.blocked).toBe(true);
      expect(log.runId).toBe(runId);
    });
  });

  describe("Validation Result Metadata", () => {
    it("should log validation success with counts", () => {
      const runId = testable.instance.startRun("philosopher");
      testable.instance.logValidationResult(["check1", "check2", "check3"], [], true);
      
      const validationLogs = testable.getByMessageContaining("Validation passed");
      expect(validationLogs.length).toBe(1);
      expect(validationLogs[0].validations).toEqual({ passed: 3, failed: 0 });
      expect(validationLogs[0].runId).toBe(runId);
    });

    it("should log validation warning when not enforced", () => {
      const runId = testable.instance.startRun("mechanic");
      testable.instance.logValidationResult([], ["warning1", "warning2"], false);
      
      const validationLogs = testable.getByMessageContaining("Validation warning");
      expect(validationLogs.length).toBe(1);
      expect(validationLogs[0].validations).toEqual({ passed: 0, failed: 2 });
      expect(validationLogs[0].enforced).toBe(false);
      expect(validationLogs[0].runId).toBe(runId);
    });

    it("should log validation blocked when enforced with failures including runId", () => {
      const runId = testable.instance.startRun("architect");
      testable.instance.logValidationResult(["check1"], ["error1", "error2"], true);
      
      const validationLogs = testable.getByMessageContaining("Validation blocked");
      expect(validationLogs.length).toBe(1);
      expect(validationLogs[0].runId).toBe(runId);
      expect(validationLogs[0].validations).toEqual({ passed: 1, failed: 2 });
      expect(validationLogs[0].failedChecks).toEqual(["error1", "error2"]);
      expect(validationLogs[0].enforced).toBe(true);
    });
  });

  describe("Agent Invocation Telemetry", () => {
    it("should log agent invocation with proper format", () => {
      const runId = testable.instance.startRun("architect");
      
      const metrics: CLASSicMetrics = {
        cost: { tokens: 150, inputTokens: 75, outputTokens: 75, estimatedCost: 0.015 },
        latency: { totalMs: 2000, perStepMs: [600, 700, 700] },
        accuracy: { taskSuccessRate: 0.92, validationsPassed: 8, validationsFailed: 1 },
        security: { promptInjectionBlocked: true, safeCodeGenerated: true },
        stability: { consistencyScore: 0.88, hallucinationDetected: false, pathsEvaluated: 3 },
      };
      
      testable.instance.logAgentInvocation("architect", "invoke", "success", metrics);
      
      const invocationLogs = testable.getByMessageContaining("Agent architect invoke");
      expect(invocationLogs.length).toBe(1);
      expect(invocationLogs[0].agentType).toBe("architect");
      expect(invocationLogs[0].action).toBe("invoke");
      expect(invocationLogs[0].outcome).toBe("success");
      expect(invocationLogs[0].runId).toBe(runId);
      expect(invocationLogs[0].metrics).toBeDefined();
    });

    it("should log agent invocation failure", () => {
      const runId = testable.instance.startRun("mechanic");
      testable.instance.logAgentInvocation("mechanic", "invoke", "failure");
      
      const invocationLogs = testable.getByMessageContaining("Agent mechanic invoke");
      expect(invocationLogs.length).toBe(1);
      expect(invocationLogs[0].outcome).toBe("failure");
      expect(invocationLogs[0].runId).toBe(runId);
    });
  });

  describe("Error Logging with Context", () => {
    it("should include runId and error details in error logs", () => {
      const runId = testable.instance.startRun("codeNinja");
      const testError = new Error("Test error");
      
      testable.instance.error("Operation failed", testError, { runId });
      
      const errorLogs = testable.getByMessageContaining("Operation failed");
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].runId).toBe(runId);
      expect(errorLogs[0].errorName).toBe("Error");
      expect(errorLogs[0].errorMessage).toBe("Test error");
    });

    it("should include agentType in error context when provided", () => {
      const runId = testable.instance.startRun("philosopher");
      
      testable.instance.error("Agent error", new Error("fail"), { runId, agentType: "philosopher" });
      
      const errorLogs = testable.getByMessageContaining("Agent error");
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].agentType).toBe("philosopher");
    });
  });

  describe("Child Logger Inheritance", () => {
    it("should inherit runId in child logger logs", () => {
      const runId = testable.instance.startRun("architect");
      const child = testable.instance.child({ component: "evaluator" });
      
      child.info("Child log message", { data: "test" });
      
      const childLogs = testable.getByMessageContaining("Child log message");
      expect(childLogs.length).toBe(1);
      expect(childLogs[0].runId).toBe(runId);
      expect(childLogs[0].component).toBe("evaluator");
    });
  });
});
