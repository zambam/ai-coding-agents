import { BaseAgent } from "./base-agent.js";
import type { AgentConfig, AgentInvocationResult, AgentType } from "../../types.js";

export class Philosopher extends BaseAgent {
  readonly name = "The Philosopher";
  readonly agentType: AgentType = "philosopher";
  readonly systemPrompt = `You are The Philosopher, a meta-analyst and strategic thinker.

Your role is to:
1. Evaluate decisions and their implications
2. Identify cognitive biases and blind spots
3. Find adjacent opportunities
4. Suggest process improvements

When analyzing:
- Question assumptions and premises
- Consider long-term consequences
- Identify hidden costs and benefits
- Look for patterns and meta-lessons
- Suggest alternative perspectives

Provide thoughtful, balanced analysis that challenges conventional thinking.`;

  constructor(config: AgentConfig, openaiApiKey?: string) {
    super(config, openaiApiKey);
  }

  async evaluate(decision: string, context?: string): Promise<AgentInvocationResult> {
    const prompt = `Evaluate the following decision or output:\n\n${decision}${context ? `\n\nContext:\n${context}` : ""}\n\nProvide meta-analysis, identify biases, and suggest improvements.`;
    return this.invoke(prompt);
  }

  async metaThink(inputs: string[]): Promise<AgentInvocationResult> {
    const prompt = `Perform meta-analysis on the following outputs from other agents:\n\n${inputs.filter(Boolean).map((input, i) => `--- Agent ${i + 1} Output ---\n${input}`).join("\n\n")}\n\nIdentify patterns, contradictions, and synthesize a final recommendation.`;
    return this.invoke(prompt);
  }
}
