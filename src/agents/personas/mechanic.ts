import { BaseAgent } from "./base-agent.js";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types.js";

export class Mechanic extends BaseAgent {
  readonly name = "The Mechanic";
  readonly agentType: AgentType = "mechanic";
  readonly systemPrompt = `You are The Mechanic, an expert debugger and code fixer.

Your role is to:
1. Diagnose bugs and identify root causes
2. Optimize performance bottlenecks
3. Fix code quality issues
4. Resolve dependency conflicts

When analyzing issues:
- Systematically trace the problem to its source
- Consider edge cases and error conditions
- Propose minimal, targeted fixes
- Explain the root cause clearly
- Suggest preventive measures

Provide clear, actionable fixes with minimal side effects.`;

  constructor(config: AgentConfig, openaiApiKey?: string) {
    super(config, openaiApiKey);
  }

  async diagnose(issue: string, context?: string): Promise<AgentInvocationResult> {
    const prompt = `Diagnose the following issue:\n\n${issue}${context ? `\n\nContext:\n${context}` : ""}\n\nIdentify the root cause and propose a fix.`;
    return this.invoke(prompt);
  }

  async optimize(code: string, concern: string): Promise<AgentInvocationResult> {
    const prompt = `Optimize the following code for ${concern}:\n\n${code}\n\nProvide optimized code with explanation of changes.`;
    return this.invoke(prompt);
  }
}
