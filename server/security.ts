import type { Request, Response, NextFunction } from "express";
import { logger } from "../src/logger";
import type { SecurityEvent } from "../src/types";

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+(instructions|prompts?)/i,
  /disregard\s+(previous|all)\s+(instructions|prompts?)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|a|an)/i,
  /system:\s*$/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<<SYS>>/i,
  /<\/SYS>/i,
  /\bDAN\b.*\bmode\b/i,
  /jailbreak/i,
];

const UNSAFE_CODE_PATTERNS = [
  /eval\s*\(/i,
  /exec\s*\(/i,
  /Function\s*\(\s*['"]/i,
  /__import__\s*\(/i,
  /subprocess\.(run|call|Popen)/i,
  /os\.(system|popen|exec)/i,
  /child_process/i,
  /spawn\s*\(/i,
  /require\s*\(\s*['"]child_process['"]\s*\)/i,
  /\$\(\s*[`'"]/i,
  /rm\s+-rf/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM\s+.*WHERE\s+1\s*=\s*1/i,
  /TRUNCATE\s+TABLE/i,
  /;\s*--/i,
  /UNION\s+SELECT/i,
  /<script[^>]*>/i,
  /javascript:/i,
  /on(click|load|error|mouseover)\s*=/i,
];

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
  /\b(?:password|pwd|passwd)\s*[:=]\s*\S+/i,
  /\b(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*\S+/i,
  /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i,
  /\b(?:sk-|pk-)[A-Za-z0-9]{32,}/,
];

export interface SecurityCheckResult {
  safe: boolean;
  events: SecurityEvent[];
}

export function checkPromptInjection(input: string): { detected: boolean; patterns: string[] } {
  const detectedPatterns: string[] = [];
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }
  return { detected: detectedPatterns.length > 0, patterns: detectedPatterns };
}

export function checkUnsafeCode(input: string): { detected: boolean; patterns: string[] } {
  const detectedPatterns: string[] = [];
  for (const pattern of UNSAFE_CODE_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }
  return { detected: detectedPatterns.length > 0, patterns: detectedPatterns };
}

export function checkPIIPatterns(input: string): { detected: boolean; patterns: string[] } {
  const detectedPatterns: string[] = [];
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }
  return { detected: detectedPatterns.length > 0, patterns: detectedPatterns };
}

export function sanitizePayload<T extends Record<string, unknown>>(
  payload: T,
  options: { redactPII?: boolean; maxDepth?: number } = {}
): T {
  const { redactPII = true, maxDepth = 10 } = options;

  function sanitize(obj: unknown, depth: number): unknown {
    if (depth > maxDepth) return "[MAX_DEPTH_EXCEEDED]";

    if (typeof obj === "string") {
      let result = obj;
      if (redactPII) {
        for (const pattern of PII_PATTERNS) {
          result = result.replace(pattern, "[REDACTED]");
        }
      }
      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, depth + 1));
    }

    if (obj !== null && typeof obj === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("token") ||
          lowerKey.includes("api_key") ||
          lowerKey.includes("apikey") ||
          lowerKey.includes("authorization")
        ) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = sanitize(value, depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  return sanitize(payload, 0) as T;
}

export function runSecurityChecks(input: string, options: { blockOnDetection?: boolean } = {}): SecurityCheckResult {
  const { blockOnDetection = true } = options;
  const events: SecurityEvent[] = [];

  const injectionResult = checkPromptInjection(input);
  if (injectionResult.detected) {
    events.push({
      eventType: "prompt_injection",
      blocked: blockOnDetection,
      details: `Detected patterns: ${injectionResult.patterns.join(", ")}`,
      timestamp: new Date(),
    });
    logger.logSecurityEvent("prompt_injection", blockOnDetection, injectionResult.patterns.join(", "));
  }

  const unsafeResult = checkUnsafeCode(input);
  if (unsafeResult.detected) {
    events.push({
      eventType: "unsafe_code",
      blocked: blockOnDetection,
      details: `Detected patterns: ${unsafeResult.patterns.join(", ")}`,
      timestamp: new Date(),
    });
    logger.logSecurityEvent("unsafe_code", blockOnDetection, unsafeResult.patterns.join(", "));
  }

  const piiResult = checkPIIPatterns(input);
  if (piiResult.detected) {
    events.push({
      eventType: "pii_detected",
      blocked: false,
      details: `Detected PII patterns: ${piiResult.patterns.length} types`,
      timestamp: new Date(),
    });
    logger.logSecurityEvent("pii_detected", false, `${piiResult.patterns.length} PII patterns detected`);
  }

  const safe = !injectionResult.detected && !unsafeResult.detected;

  return { safe, events };
}

export interface SecurityMiddlewareOptions {
  blockPromptInjection: boolean;
  blockUnsafeCode: boolean;
  logSecurityEvents: boolean;
  checkFields: string[];
}

const DEFAULT_SECURITY_OPTIONS: SecurityMiddlewareOptions = {
  blockPromptInjection: true,
  blockUnsafeCode: true,
  logSecurityEvents: true,
  checkFields: ["prompt", "content", "message", "input", "query", "text"],
};

export function createSecurityMiddleware(options: Partial<SecurityMiddlewareOptions> = {}) {
  const config = { ...DEFAULT_SECURITY_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== "object") {
      return next();
    }

    const result = runDeepSecurityChecks(req.body, { 
      blockOnDetection: config.blockPromptInjection || config.blockUnsafeCode 
    });

    if (!result.safe && (config.blockPromptInjection || config.blockUnsafeCode)) {
      return res.status(400).json({
        error: "Security check failed",
        message: "The request contains potentially unsafe content",
        events: result.events.map((e) => ({ type: e.eventType, blocked: e.blocked })),
      });
    }

    (req as Request & { securityEvents?: SecurityEvent[] }).securityEvents = result.events;
    next();
  };
}

function normalizeUnicode(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function extractAllStrings(obj: unknown, maxDepth = 10, depth = 0): string[] {
  if (depth > maxDepth) return [];
  
  if (typeof obj === "string") {
    return [obj];
  }
  
  if (Array.isArray(obj)) {
    return obj.flatMap((item) => extractAllStrings(item, maxDepth, depth + 1));
  }
  
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).flatMap((val) => extractAllStrings(val, maxDepth, depth + 1));
  }
  
  return [];
}

export function runDeepSecurityChecks(input: unknown, options: { blockOnDetection?: boolean } = {}): SecurityCheckResult {
  const { blockOnDetection = true } = options;
  const events: SecurityEvent[] = [];

  const allStrings = extractAllStrings(input);
  
  for (const str of allStrings) {
    const normalized = normalizeUnicode(str);
    const result = runSecurityChecks(normalized, { blockOnDetection });
    events.push(...result.events);
  }

  const safe = events.every((e) => !e.blocked);
  return { safe, events };
}

export function rateLimitMiddleware(options: { windowMs?: number; maxRequests?: number; maxIps?: number } = {}) {
  const { windowMs = 60000, maxRequests = 100, maxIps = 10000 } = options;
  const requests = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requests.entries()) {
      if (now > record.resetAt) {
        requests.delete(ip);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    if (requests.size >= maxIps && !requests.has(ip)) {
      logger.warn("Rate limiter at capacity", { currentSize: requests.size, maxIps });
      return res.status(503).json({
        error: "Service Temporarily Unavailable",
        message: "Server is experiencing high load. Please try again later.",
      });
    }

    let record = requests.get(ip);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      requests.set(ip, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      logger.warn("Rate limit exceeded", { ip, count: record.count });
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - record.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000).toString());

    next();
  };
}
