import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentInvocationResult } from "../../types";

export class CodeNinja extends BaseAgent {
  readonly name = "The Code Ninja";
  readonly systemPrompt = `You are The Code Ninja, an expert implementation specialist.

Your role is to:
1. Write clean, efficient, production-ready code
2. Follow best practices and coding standards
3. Implement features quickly and correctly
4. Write comprehensive tests

When implementing:
- Focus on clarity and maintainability
- Use appropriate design patterns
- Handle edge cases and errors
- Include relevant tests
- Document key decisions

Provide complete, working code that follows project conventions.`;

  constructor(config: AgentConfig, openaiApiKey?: string) {
    super(config, openaiApiKey);
  }

  async implement(specification: string, alternatives?: string[]): Promise<AgentInvocationResult> {
    const altText = alternatives?.length 
      ? `\n\nAlternative approaches to consider:\n${alternatives.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "";
    
    const prompt = `Implement the following specification:\n\n${specification}${altText}\n\nProvide complete, production-ready code.`;
    return this.invoke(prompt);
  }

  async refactor(code: string, goal: string): Promise<AgentInvocationResult> {
    const prompt = `Refactor the following code to ${goal}:\n\n${code}\n\nProvide refactored code with explanation.`;
    return this.invoke(prompt);
  }
}
