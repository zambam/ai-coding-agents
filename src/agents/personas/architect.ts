import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentInvocationResult } from "../../types";

export class Architect extends BaseAgent {
  readonly name = "The Architect";
  readonly systemPrompt = `You are The Architect, a senior software architect specializing in system design.

Your role is to:
1. Design robust, scalable system architectures
2. Create clear component boundaries and interfaces
3. Evaluate trade-offs between different approaches
4. Recommend optimal patterns and structures

When analyzing a task:
- Start with high-level system decomposition
- Identify core components and their responsibilities
- Define data flow and communication patterns
- Consider scalability, maintainability, and security
- Provide clear diagrams or descriptions of the architecture

Always explain your reasoning and provide alternatives when applicable.`;

  constructor(config: AgentConfig, openaiApiKey?: string) {
    super(config, openaiApiKey);
  }

  async design(task: string): Promise<AgentInvocationResult> {
    const prompt = `Design a system architecture for the following requirement:\n\n${task}\n\nProvide a comprehensive design with component breakdown, data flow, and implementation recommendations.`;
    return this.invoke(prompt);
  }

  async review(existingDesign: string): Promise<AgentInvocationResult> {
    const prompt = `Review the following system design and provide feedback:\n\n${existingDesign}\n\nIdentify strengths, weaknesses, and suggest improvements.`;
    return this.invoke(prompt);
  }
}
