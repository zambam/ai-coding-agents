import type { AgentConfig, ReasoningStep, ConsistencyMode, ConsistencyResult, SelfCritiqueResult } from "../types";
export declare class PromptEngine {
    private config;
    private openai;
    constructor(config: AgentConfig, openaiApiKey?: string);
    generateWithCoT(systemPrompt: string, userPrompt: string, model?: string): Promise<{
        response: string;
        reasoning: ReasoningStep[];
        tokensUsed: number;
    }>;
    runSelfConsistency(systemPrompt: string, userPrompt: string, mode: ConsistencyMode): Promise<ConsistencyResult>;
    applySelfCritique(originalResponse: string, systemPrompt: string): Promise<SelfCritiqueResult>;
}
//# sourceMappingURL=prompt-engine.d.ts.map