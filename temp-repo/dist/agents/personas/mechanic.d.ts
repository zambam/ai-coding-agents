import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types";
export declare class Mechanic extends BaseAgent {
    readonly name = "The Mechanic";
    readonly agentType: AgentType;
    readonly systemPrompt = "You are The Mechanic, an expert debugger and code fixer.\n\nYour role is to:\n1. Diagnose bugs and identify root causes\n2. Optimize performance bottlenecks\n3. Fix code quality issues\n4. Resolve dependency conflicts\n\nWhen analyzing issues:\n- Systematically trace the problem to its source\n- Consider edge cases and error conditions\n- Propose minimal, targeted fixes\n- Explain the root cause clearly\n- Suggest preventive measures\n\nProvide clear, actionable fixes with minimal side effects.";
    constructor(config: AgentConfig, openaiApiKey?: string);
    diagnose(issue: string, context?: string): Promise<AgentInvocationResult>;
    optimize(code: string, concern: string): Promise<AgentInvocationResult>;
}
//# sourceMappingURL=mechanic.d.ts.map