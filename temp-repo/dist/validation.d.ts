import type { AgentResponse, AgentConfig, CLASSicMetrics } from "./types";
import { type ErrorContext } from "./errors";
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
export declare function checkFakeData(text: string): FakeDataCheckResult;
export declare function checkPII(text: string): {
    hasPII: boolean;
    types: string[];
};
export declare function checkSecurity(response: AgentResponse): SecurityCheckResult;
export declare function validateResponse(response: AgentResponse, validationLevel: "low" | "medium" | "high" | "strict"): ValidationResult;
export interface EnforcementConfig {
    enforceValidation: boolean;
    enforceSecurity: boolean;
    enforceFakeDataCheck: boolean;
    minValidationScore: number;
}
export declare function enforceValidation(response: AgentResponse, config: AgentConfig, enforcement?: Partial<EnforcementConfig>, errorContext?: Partial<ErrorContext>): {
    validation: ValidationResult;
    security: SecurityCheckResult;
    fakeData: FakeDataCheckResult;
};
export interface CLASSicThresholds {
    minAccuracy: number;
    maxLatencyMs: number;
    maxCost: number;
}
export declare function enforceClassicThresholds(agentType: string, metrics: CLASSicMetrics, errorContext?: Partial<ErrorContext>): void;
//# sourceMappingURL=validation.d.ts.map