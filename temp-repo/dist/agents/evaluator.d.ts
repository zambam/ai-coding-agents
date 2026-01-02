import type { CLASSicMetrics, ValidationLevel, AgentResponse, ValidationResult } from "../types";
export declare class Evaluator {
    private validationLevel;
    constructor(validationLevel?: ValidationLevel);
    calculateCost(inputTokens: number, outputTokens: number): {
        tokens: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCost: number;
    };
    measureLatency(startTime: number, stepTimes?: number[]): {
        totalMs: number;
        perStepMs: number[];
    };
    validateResponse(response: AgentResponse): ValidationResult;
    checkSecurity(response: AgentResponse): {
        promptInjectionBlocked: boolean;
        safeCodeGenerated: boolean;
    };
    assessStability(consensusScore: number, pathsEvaluated: number, response: AgentResponse): {
        consistencyScore: number;
        hallucinationDetected: boolean;
        pathsEvaluated: number;
    };
    buildMetrics(startTime: number, inputTokens: number, outputTokens: number, response: AgentResponse, consensusScore: number, pathsEvaluated: number): CLASSicMetrics;
}
//# sourceMappingURL=evaluator.d.ts.map