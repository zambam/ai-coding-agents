import type { AgentType, PromptMetrics } from "@shared/schema";
import type { IDataTelemetry, PromptVariant, RunOutcome } from "../../storage";
export interface PromptSelectionResult {
    variant: PromptVariant;
    promptText: string;
    version: number;
}
export interface PromptOptimizationConfig {
    minSampleSize: number;
    pValueThreshold: number;
    improvementThreshold: number;
    maxConcurrentTests: number;
}
export declare class PromptOptimizer {
    private storage;
    private config;
    constructor(storage: IDataTelemetry, config?: Partial<PromptOptimizationConfig>);
    selectPromptVariant(agentType: AgentType): Promise<PromptSelectionResult | null>;
    createShadowVariant(agentType: AgentType, promptText: string): Promise<PromptVariant>;
    promoteToABTest(variantId: string, trafficPercent?: number): Promise<PromptVariant | undefined>;
    computeVariantMetrics(variantId: string, outcomes: RunOutcome[]): Promise<PromptMetrics>;
    evaluateABTest(agentType: AgentType): Promise<{
        winner: PromptVariant | null;
        loser: PromptVariant | null;
        significant: boolean;
        pValue: number | null;
    }>;
    promoteWinner(winnerId: string, loserId: string): Promise<void>;
    private computePValue;
    private normalCDF;
}
//# sourceMappingURL=prompt-optimizer.d.ts.map