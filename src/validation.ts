import type { AgentResponse, AgentConfig, CLASSicMetrics } from "./types.js";
import { ValidationError, SecurityError, AgentErrorCode, type ErrorContext } from "./errors.js";
import { logger } from "./logger.js";

export interface ValidationResult {
  passed: string[];
  failed: string[];
  score: number;
}

export interface SecurityCheckResult {
  promptInjectionBlocked: boolean;
  safeCodeGenerated: boolean;
  piiDetected: boolean;
}

export interface FakeDataCheckResult {
  hasFakeData: boolean;
  patterns: string[];
}

const FAKE_DATA_PATTERNS = [
  { pattern: /lorem\s+ipsum/i, name: "Lorem ipsum text" },
  { pattern: /example\.com/i, name: "example.com domain" },
  { pattern: /test@|@test\./i, name: "Test email pattern" },
  { pattern: /\bfoo\b|\bbar\b|\bbaz\b/i, name: "foo/bar/baz placeholder" },
  { pattern: /TODO:|FIXME:|XXX:|HACK:/i, name: "TODO/FIXME marker" },
  { pattern: /mock|placeholder|sample|dummy/i, name: "Mock/sample indicator" },
  { pattern: /123-?45-?6789/i, name: "Fake SSN pattern" },
  { pattern: /555-\d{4}/i, name: "Fake phone pattern" },
  { pattern: /John\s+Doe|Jane\s+Doe/i, name: "Placeholder name" },
  { pattern: /1234\s*5678\s*9012\s*3456/i, name: "Fake credit card" },
];

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: "Email address" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: "SSN format" },
  { pattern: /\b\d{16}\b/, name: "Credit card number" },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, name: "Phone number" },
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore.*previous.*instructions/i,
  /disregard.*rules/i,
  /system.*prompt/i,
  /jailbreak/i,
  /pretend.*you.*are/i,
  /forget.*everything/i,
];

const UNSAFE_CODE_PATTERNS = [
  /eval\s*\(/,
  /exec\s*\(/,
  /child_process/,
  /rm\s+-rf/,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM.*WHERE\s*1\s*=\s*1/i,
  /TRUNCATE\s+TABLE/i,
];

export function checkFakeData(text: string): FakeDataCheckResult {
  const detectedPatterns: string[] = [];

  for (const { pattern, name } of FAKE_DATA_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(name);
    }
  }

  return {
    hasFakeData: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

export function checkPII(text: string): { hasPII: boolean; types: string[] } {
  const detectedTypes: string[] = [];

  for (const { pattern, name } of PII_PATTERNS) {
    if (pattern.test(text)) {
      detectedTypes.push(name);
    }
  }

  return {
    hasPII: detectedTypes.length > 0,
    types: detectedTypes,
  };
}

export function checkSecurity(response: AgentResponse): SecurityCheckResult {
  const fullText = JSON.stringify(response);
  
  const promptInjectionBlocked = !PROMPT_INJECTION_PATTERNS.some(p => p.test(fullText));
  
  let safeCodeGenerated = true;
  if (response.codeOutput) {
    safeCodeGenerated = !UNSAFE_CODE_PATTERNS.some(p => p.test(response.codeOutput || ""));
  }

  const piiCheck = checkPII(fullText);

  return {
    promptInjectionBlocked,
    safeCodeGenerated,
    piiDetected: piiCheck.hasPII,
  };
}

export function validateResponse(
  response: AgentResponse,
  validationLevel: "low" | "medium" | "high" | "strict"
): ValidationResult {
  const passed: string[] = [];
  const failed: string[] = [];

  if (response.reasoning && response.reasoning.length > 0) {
    passed.push("Contains reasoning steps");
  } else {
    failed.push("Missing reasoning steps");
  }

  if (response.confidence >= 0 && response.confidence <= 1) {
    passed.push("Valid confidence score");
  } else {
    failed.push("Invalid confidence score");
  }

  if (response.recommendation && response.recommendation.length > 10) {
    passed.push("Has substantive recommendation");
  } else {
    failed.push("Recommendation too short or missing");
  }

  if (validationLevel === "high" || validationLevel === "strict") {
    if (response.reasoning.length >= 3) {
      passed.push("Sufficient reasoning depth");
    } else {
      failed.push("Insufficient reasoning depth");
    }

    if (response.alternatives && response.alternatives.length > 0) {
      passed.push("Provides alternatives");
    } else {
      failed.push("No alternatives provided");
    }
  }

  if (validationLevel === "strict") {
    if (response.warnings && response.warnings.length > 0) {
      passed.push("Identifies potential risks");
    } else {
      failed.push("No risk analysis provided");
    }

    const fakeDataCheck = checkFakeData(JSON.stringify(response));
    if (!fakeDataCheck.hasFakeData) {
      passed.push("No fake/placeholder data detected");
    } else {
      failed.push(`Fake data detected: ${fakeDataCheck.patterns.join(", ")}`);
    }
  }

  const score = passed.length / (passed.length + failed.length);

  return { passed, failed, score };
}

export interface EnforcementConfig {
  enforceValidation: boolean;
  enforceSecurity: boolean;
  enforceFakeDataCheck: boolean;
  minValidationScore: number;
}

const DEFAULT_ENFORCEMENT: EnforcementConfig = {
  enforceValidation: true,
  enforceSecurity: true,
  enforceFakeDataCheck: true,
  minValidationScore: 0.7,
};

export function enforceValidation(
  response: AgentResponse,
  config: AgentConfig,
  enforcement: Partial<EnforcementConfig> = {},
  errorContext: Partial<ErrorContext> = {}
): {
  validation: ValidationResult;
  security: SecurityCheckResult;
  fakeData: FakeDataCheckResult;
} {
  const opts = { ...DEFAULT_ENFORCEMENT, ...enforcement };
  
  const isStrict = config.validationLevel === "strict";
  const shouldEnforce = isStrict || opts.enforceValidation;

  const validation = validateResponse(response, config.validationLevel);
  const security = checkSecurity(response);
  const fakeData = checkFakeData(JSON.stringify(response));

  logger.logValidationResult(validation.passed, validation.failed, shouldEnforce);

  if (shouldEnforce && validation.failed.length > 0 && validation.score < opts.minValidationScore) {
    throw new ValidationError(validation.failed, errorContext);
  }

  if (opts.enforceSecurity) {
    if (!security.promptInjectionBlocked) {
      logger.logSecurityEvent("prompt_injection", true);
      throw new SecurityError("prompt_injection", "Prompt injection detected and blocked", errorContext);
    }

    if (!security.safeCodeGenerated) {
      logger.logSecurityEvent("unsafe_code", true);
      throw new SecurityError("unsafe_code", "Unsafe code patterns detected", errorContext);
    }

    if (security.piiDetected) {
      logger.logSecurityEvent("pii_detected", true, "PII detected in response");
      if (isStrict) {
        throw new SecurityError("pii_leak", "PII detected in response - blocked in strict mode", errorContext);
      }
    }
  }

  if (isStrict && opts.enforceFakeDataCheck && fakeData.hasFakeData) {
    throw new ValidationError(
      [`Fake/placeholder data detected: ${fakeData.patterns.join(", ")}`],
      errorContext
    );
  }

  return { validation, security, fakeData };
}

export interface CLASSicThresholds {
  minAccuracy: number;
  maxLatencyMs: number;
  maxCost: number;
}

const AGENT_THRESHOLDS: Record<string, CLASSicThresholds> = {
  architect: { minAccuracy: 0.85, maxLatencyMs: 30000, maxCost: 0.10 },
  mechanic: { minAccuracy: 0.90, maxLatencyMs: 20000, maxCost: 0.08 },
  codeNinja: { minAccuracy: 0.88, maxLatencyMs: 25000, maxCost: 0.12 },
  philosopher: { minAccuracy: 0.80, maxLatencyMs: 35000, maxCost: 0.15 },
};

export function enforceClassicThresholds(
  agentType: string,
  metrics: CLASSicMetrics,
  errorContext: Partial<ErrorContext> = {}
): void {
  const thresholds = AGENT_THRESHOLDS[agentType];
  if (!thresholds) return;

  const failures: string[] = [];

  if (metrics.accuracy.taskSuccessRate < thresholds.minAccuracy) {
    failures.push(`Accuracy ${metrics.accuracy.taskSuccessRate.toFixed(2)} below threshold ${thresholds.minAccuracy}`);
  }

  if (metrics.latency.totalMs > thresholds.maxLatencyMs) {
    failures.push(`Latency ${metrics.latency.totalMs}ms exceeds threshold ${thresholds.maxLatencyMs}ms`);
  }

  if (metrics.cost.estimatedCost > thresholds.maxCost) {
    failures.push(`Cost $${metrics.cost.estimatedCost.toFixed(4)} exceeds threshold $${thresholds.maxCost}`);
  }

  if (failures.length > 0) {
    logger.warn("CLASSic threshold violations", { agentType, failures, metrics });
    throw new ValidationError(failures, errorContext);
  }
}
