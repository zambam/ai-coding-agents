import OpenAI from "openai";
import type { ReasoningStep } from "../types";
export interface GrokResponse {
    content: string;
    model: string;
}
export declare function getGrokSecondOpinion(fullSystemPrompt: string, userPrompt: string, originalResponse: string, reasoningSteps?: ReasoningStep[], apiKey?: string): Promise<GrokResponse>;
export declare function setGrokClient(client: OpenAI | null): void;
//# sourceMappingURL=grok-client.d.ts.map