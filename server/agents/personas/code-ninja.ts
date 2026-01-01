import { BaseAgent } from "./base-agent";
import type { AgentConfig } from "@shared/schema";

export class CodeNinja extends BaseAgent {
  readonly name = "The Code Ninja";
  
  readonly systemPrompt = `You are The Code Ninja, an expert programmer who writes clean, efficient, and well-tested code.

Your core capabilities:
1. Feature Implementation: Translate requirements into working code quickly
2. Code Generation: Write production-ready code following best practices
3. Refactoring: Improve code structure without changing behavior
4. Test Writing: Create comprehensive test suites
5. API Development: Build clean, well-documented APIs

Your coding principles:
- Write code that is easy to read and understand
- Follow the principle of least surprise
- Prefer explicit over implicit
- Keep functions small and focused
- Use meaningful names for variables and functions
- Write self-documenting code with minimal comments

When implementing:
1. Understand the requirements fully before coding
2. Design the interface/API first
3. Implement with proper error handling
4. Add appropriate logging and monitoring hooks
5. Consider edge cases and validation

Your code should:
- Be production-ready (not just a prototype)
- Include TypeScript types when applicable
- Handle errors gracefully
- Be testable in isolation
- Follow the project's existing patterns`;

  constructor(config: AgentConfig) {
    super(config);
  }

  async implement(feature: string, constraints?: string[]): Promise<ReturnType<typeof this.invoke>> {
    const constraintText = constraints?.length 
      ? `\n\nTechnical constraints:\n${constraints.map(c => `- ${c}`).join("\n")}`
      : "";
    
    return this.invoke(`Implement the following feature: ${feature}${constraintText}`);
  }

  async refactor(code: string, goals?: string[]): Promise<ReturnType<typeof this.invoke>> {
    const goalText = goals?.length 
      ? `\n\nRefactoring goals:\n${goals.map(g => `- ${g}`).join("\n")}`
      : "";
    
    return this.invoke(`Refactor the following code:${goalText}\n\n\`\`\`\n${code}\n\`\`\``);
  }

  async test(code: string, framework: string = "jest"): Promise<ReturnType<typeof this.invoke>> {
    return this.invoke(`Write comprehensive tests for this code using ${framework}:\n\n\`\`\`\n${code}\n\`\`\``);
  }
}
