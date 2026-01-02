import type { AgentType } from "@shared/schema";
import type { IDataTelemetry } from "../../storage";
export interface LearningSignal {
    agentType: AgentType;
    signalType: "positive" | "negative" | "neutral";
    strength: number;
    insights: string[];
    suggestedImprovements: string[];
    dataPoints: number;
}
export interface OutcomePattern {
    pattern: string;
    frequency: number;
    associatedTags: string[];
    avgRating: number | null;
}
export interface LearnerConfig {
    minDataPoints: number;
    lookbackDays: number;
    significanceThreshold: number;
}
export declare class OutcomeLearner {
    private storage;
    private config;
    constructor(storage: IDataTelemetry, config?: Partial<LearnerConfig>);
    analyzeAgentPerformance(agentType: AgentType): Promise<LearningSignal>;
    identifyFeedbackPatterns(agentType: AgentType): Promise<OutcomePattern[]>;
    generateImprovementSuggestions(agentType: AgentType): Promise<string[]>;
    computeGrokAgreementRate(agentType: AgentType): Promise<number>;
    private filterRecentOutcomes;
    private computeAcceptanceRate;
    private tagToSuggestion;
}
//# sourceMappingURL=outcome-learner.d.ts.map