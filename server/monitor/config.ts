import type { FailureCategory, FailureSeverity } from "@shared/schema";

export const MONITOR_CONFIG = {
  apiAuthEnabled: false,
  retentionDays: 60,
  crossProjectLearningEnabled: false,
  guidelinesUpdateDebounceMs: 300000,
  minObservationsForGuidelines: 10,
  ruleCreationThreshold: 3,
  maxReportsPerMinute: 60,
  maxReportsPerHour: 500,
} as const;

export type MonitorConfig = typeof MONITOR_CONFIG;

export const SEVERITY_WEIGHTS: Record<FailureSeverity, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

export const CATEGORY_SEVERITY_DEFAULTS: Record<FailureCategory, FailureSeverity> = {
  security_gap: "critical",
  logic_error: "high",
  context_blindness: "medium",
  outdated_api: "medium",
  missing_edge_case: "medium",
  poor_readability: "low",
  broke_existing: "high",
  hallucinated_code: "critical",
};

export const CATEGORY_DESCRIPTIONS: Record<FailureCategory, string> = {
  security_gap: "Security vulnerabilities or unsafe code patterns",
  logic_error: "Incorrect logic, off-by-one errors, wrong conditions",
  context_blindness: "Ignoring project context, conventions, or existing patterns",
  outdated_api: "Using deprecated or outdated APIs and methods",
  missing_edge_case: "Not handling null, empty, or boundary conditions",
  poor_readability: "Hard to understand code, missing comments, bad naming",
  broke_existing: "Changes that break existing functionality",
  hallucinated_code: "Non-existent APIs, libraries, or incorrect syntax",
};

export const FAILURE_PATTERNS: Array<{
  category: FailureCategory;
  patterns: RegExp[];
  keywords: string[];
}> = [
  {
    category: "security_gap",
    patterns: [
      /eval\s*\(/i,
      /innerHTML\s*=/i,
      /password.*=.*['"][^'"]+['"]/i,
      /api[_-]?key.*=.*['"][^'"]+['"]/i,
      /exec\s*\(/i,
    ],
    keywords: ["sql injection", "xss", "csrf", "hardcoded secret", "insecure"],
  },
  {
    category: "logic_error",
    patterns: [
      /if\s*\([^)]*==[^=]/i,
      /\b(i|j|k)\s*<=?\s*\1\b/,
      /return\s+true\s*;?\s*return\s+false/i,
    ],
    keywords: ["off by one", "wrong condition", "infinite loop", "deadlock"],
  },
  {
    category: "context_blindness",
    patterns: [],
    keywords: ["ignores existing", "doesn't follow", "inconsistent with", "project convention"],
  },
  {
    category: "outdated_api",
    patterns: [
      /componentWillMount/i,
      /componentWillReceiveProps/i,
      /\$\.ajax/i,
      /new Buffer\(/i,
    ],
    keywords: ["deprecated", "legacy", "outdated", "old version"],
  },
  {
    category: "missing_edge_case",
    patterns: [
      /\.\w+\s*\(/,
    ],
    keywords: ["null check", "undefined", "empty array", "boundary", "edge case"],
  },
  {
    category: "poor_readability",
    patterns: [
      /[a-z]{1,2}\d?\s*[=:]/,
    ],
    keywords: ["unclear", "confusing", "no comments", "hard to read", "magic number"],
  },
  {
    category: "broke_existing",
    patterns: [],
    keywords: ["breaks", "regression", "stopped working", "no longer works"],
  },
  {
    category: "hallucinated_code",
    patterns: [],
    keywords: ["doesn't exist", "made up", "hallucinated", "fake api", "not real"],
  },
];
