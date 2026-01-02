export const OUTCOME_STATUSES = ["accepted", "rejected", "edited", "ignored"];
export const PROMPT_STATUSES = ["shadow", "ab_test", "promoted", "retired"];
export const FEEDBACK_TAGS = [
    "too_verbose",
    "too_brief",
    "incorrect",
    "off_topic",
    "helpful",
    "creative",
    "slow",
    "confusing",
];
export const DEFAULT_LOGGER_CONFIG = {
    level: "info",
    destination: "stdout",
    prettyPrint: false,
    redactPrompts: true,
    redactPatterns: [/api_key/i, /password/i, /secret/i, /token/i],
};
export const DEFAULT_DIAGNOSTICS_OPTIONS = {
    requireAuth: false,
    includeConfig: true,
    includeLastRun: true,
    maxRunHistory: 10,
};
export const EXTERNAL_AGENT_TYPES = [
    "replit_agent",
    "cursor",
    "copilot",
    "claude_code",
    "windsurf",
    "aider",
    "continue",
    "cody",
    "unknown",
];
export const FAILURE_CATEGORIES = [
    "security_gap",
    "logic_error",
    "context_blindness",
    "outdated_api",
    "missing_edge_case",
    "poor_readability",
    "broke_existing",
    "hallucinated_code",
];
export const FAILURE_SEVERITIES = ["low", "medium", "high", "critical"];
//# sourceMappingURL=types.js.map