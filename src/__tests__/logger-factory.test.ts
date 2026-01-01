import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAgentLogger, createLogger, getLoggerConfig } from "../logger";
import type { LogLevel } from "../logger";

describe("Logger Factory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createLogger", () => {
    it("creates a logger with default config", () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
    });

    it("creates a logger with custom level", () => {
      const logs: string[] = [];
      const mockStream = {
        write: (chunk: string) => logs.push(chunk),
      };

      const logger = createLogger({ level: "debug", stream: mockStream });
      logger.debug("Debug message");

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("Debug message");
    });

    it("respects log level filtering", () => {
      const logs: string[] = [];
      const mockStream = {
        write: (chunk: string) => logs.push(chunk),
      };

      const logger = createLogger({ level: "warn", stream: mockStream });
      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warning");

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("Warning");
    });
  });

  describe("createAgentLogger", () => {
    it("creates a logger identical to createLogger", () => {
      const logger = createAgentLogger();
      expect(logger).toBeDefined();
      expect(logger.startRun).toBeDefined();
      expect(logger.endRun).toBeDefined();
    });

    it("supports run ID tracking", () => {
      const logs: string[] = [];
      const mockStream = {
        write: (chunk: string) => logs.push(chunk),
      };

      const logger = createAgentLogger({ level: "info", stream: mockStream });
      const runId = logger.startRun("architect");

      expect(runId).toBeDefined();
      expect(logs.some((l) => l.includes(runId))).toBe(true);
    });

    it("logs with agent context", () => {
      const logs: string[] = [];
      const mockStream = {
        write: (chunk: string) => logs.push(chunk),
      };

      const logger = createAgentLogger({ level: "info", stream: mockStream });
      logger.startRun("mechanic");
      logger.info("Test message");

      expect(logs.some((l) => l.includes("Test message"))).toBe(true);
    });
  });

  describe("Environment Variable Resolution", () => {
    it("respects AI_AGENTS_LOG_LEVEL", () => {
      process.env.AI_AGENTS_LOG_LEVEL = "debug";
      
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };
      
      const logger = createLogger({ stream: mockStream });
      logger.debug("Debug message");

      expect(logs.some((l) => l.includes("Debug message"))).toBe(true);
    });

    it("respects AI_AGENTS_DEBUG=true", () => {
      process.env.AI_AGENTS_DEBUG = "true";
      
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };
      
      const logger = createLogger({ stream: mockStream });
      const config = logger.getConfig();

      expect(config.level).toBe("trace");
    });

    it("respects AI_AGENTS_REDACT=false", () => {
      process.env.AI_AGENTS_REDACT = "false";
      
      const logger = createLogger();
      const config = logger.getConfig();

      expect(config.redactPrompts).toBe(false);
    });

    it("explicit config overrides env vars", () => {
      process.env.AI_AGENTS_LOG_LEVEL = "debug";
      
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };
      
      const logger = createLogger({ level: "error", stream: mockStream });
      logger.debug("Debug");
      logger.error("Error");

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("Error");
    });
  });

  describe("Log Destinations", () => {
    it("supports custom write stream", () => {
      const logs: string[] = [];
      const customStream = {
        write: (chunk: string) => logs.push(chunk),
      };

      const logger = createLogger({ level: "info", stream: customStream });
      logger.info("Test message");

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("Test message");
    });

    it("logs structured JSON by default", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.info("Structured log");

      const parsed = JSON.parse(logs[0]);
      expect(parsed.msg).toBe("Structured log");
      expect(parsed.level).toBeDefined();
      expect(parsed.time).toBeDefined();
    });

    it("includes service name in logs", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.info("Test");

      const parsed = JSON.parse(logs[0]);
      expect(parsed.service).toBe("ai-coding-agents");
    });
  });

  describe("getLoggerConfig", () => {
    it("returns current logger configuration", () => {
      const config = getLoggerConfig();

      expect(config.level).toBeDefined();
      expect(config.destination).toBeDefined();
      expect(config.redactPrompts).toBeDefined();
      expect(config.redactPatterns).toBeDefined();
    });

    it("returns a copy of config (not reference)", () => {
      const config1 = getLoggerConfig();
      const config2 = getLoggerConfig();

      config1.level = "fatal" as LogLevel;
      expect(config2.level).not.toBe("fatal");
    });
  });

  describe("Logging Methods", () => {
    it("supports all log levels", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ level: "trace", stream: mockStream });
      
      logger.trace("Trace");
      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");
      logger.fatal("Fatal");

      expect(logs.length).toBe(6);
    });

    it("logs with metadata", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.info("With metadata", { key: "value" });

      const parsed = JSON.parse(logs[0]);
      expect(parsed.key).toBe("value");
    });

    it("logs validation results", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.logValidationResult(["check1", "check2"], ["check3"], true);

      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.validations).toEqual({ passed: 2, failed: 1 });
    });

    it("logs security events", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.logSecurityEvent("prompt_injection", true, "Blocked injection attempt");

      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.eventType).toBe("prompt_injection");
      expect(parsed.blocked).toBe(true);
    });

    it("logs agent invocation with outcome", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      logger.logAgentInvocation("architect", "analyze", "success");

      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.outcome).toBe("success");
    });
  });

  describe("Child Loggers", () => {
    it("creates child logger with additional context", () => {
      const logs: string[] = [];
      const mockStream = { write: (chunk: string) => logs.push(chunk) };

      const logger = createLogger({ 
        level: "info", 
        stream: mockStream,
        prettyPrint: false,
      });
      const child = logger.child({ component: "orchestrator" });
      child.info("Child log");

      const parsed = JSON.parse(logs[0]);
      expect(parsed.component).toBe("orchestrator");
    });
  });
});
