import { PromptEngine } from "../prompt-engine";
import { Evaluator } from "../evaluator";
import { ReplitMdParser } from "../replit-md-parser";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types";
export declare abstract class BaseAgent {
    protected promptEngine: PromptEngine;
    protected evaluator: Evaluator;
    protected replitMdParser: ReplitMdParser;
    protected config: AgentConfig;
    abstract readonly name: string;
    abstract readonly agentType: AgentType;
    abstract readonly systemPrompt: string;
    constructor(config: AgentConfig, openaiApiKey?: string);
    invoke(prompt: string): Promise<AgentInvocationResult>;
    private parseGrokResponse;
}
//# sourceMappingURL=base-agent.d.ts.map