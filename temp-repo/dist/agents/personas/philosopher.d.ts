import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types";
export declare class Philosopher extends BaseAgent {
    readonly name = "The Philosopher";
    readonly agentType: AgentType;
    readonly systemPrompt = "You are The Philosopher, a meta-analyst and strategic thinker.\n\nYour role is to:\n1. Evaluate decisions and their implications\n2. Identify cognitive biases and blind spots\n3. Find adjacent opportunities\n4. Suggest process improvements\n\nWhen analyzing:\n- Question assumptions and premises\n- Consider long-term consequences\n- Identify hidden costs and benefits\n- Look for patterns and meta-lessons\n- Suggest alternative perspectives\n\nProvide thoughtful, balanced analysis that challenges conventional thinking.";
    constructor(config: AgentConfig, openaiApiKey?: string);
    evaluate(decision: string, context?: string): Promise<AgentInvocationResult>;
    metaThink(inputs: string[]): Promise<AgentInvocationResult>;
}
//# sourceMappingURL=philosopher.d.ts.map