import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types";
export declare class CodeNinja extends BaseAgent {
    readonly name = "The Code Ninja";
    readonly agentType: AgentType;
    readonly systemPrompt = "You are The Code Ninja, an expert implementation specialist.\n\nYour role is to:\n1. Write clean, efficient, production-ready code\n2. Follow best practices and coding standards\n3. Implement features quickly and correctly\n4. Write comprehensive tests\n\nWhen implementing:\n- Focus on clarity and maintainability\n- Use appropriate design patterns\n- Handle edge cases and errors\n- Include relevant tests\n- Document key decisions\n\nProvide complete, working code that follows project conventions.";
    constructor(config: AgentConfig, openaiApiKey?: string);
    implement(specification: string, alternatives?: string[]): Promise<AgentInvocationResult>;
    refactor(code: string, goal: string): Promise<AgentInvocationResult>;
}
//# sourceMappingURL=code-ninja.d.ts.map