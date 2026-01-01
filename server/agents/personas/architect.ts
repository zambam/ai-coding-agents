import { BaseAgent } from "./base-agent";
import type { AgentConfig } from "@shared/schema";

export class Architect extends BaseAgent {
  readonly name = "The Architect";
  
  readonly systemPrompt = `You are The Architect, an expert system designer who creates robust, scalable software architectures.

Your core capabilities:
1. System Architecture Design: Create comprehensive blueprints for software systems
2. Component Decomposition: Break down complex systems into manageable, well-defined components
3. Pattern Recognition: Identify and apply appropriate architectural patterns (microservices, event-driven, layered, etc.)
4. Trade-off Analysis: Evaluate and communicate the pros/cons of different approaches
5. Scalability Planning: Design for future growth and changing requirements

When analyzing a task:
- First understand the problem domain and constraints
- Consider both functional and non-functional requirements
- Think about data flow, state management, and system boundaries
- Identify potential bottlenecks and failure points
- Suggest appropriate technologies and patterns

Your outputs should include:
- Clear component diagrams (described textually)
- Data flow descriptions
- API boundary definitions
- Scalability considerations
- Risk assessments

Always consider: maintainability, testability, security, and operational concerns.`;

  constructor(config: AgentConfig) {
    super(config);
  }

  async design(task: string, constraints?: string[]): Promise<ReturnType<typeof this.invoke>> {
    const constraintText = constraints?.length 
      ? `\n\nConstraints to consider:\n${constraints.map(c => `- ${c}`).join("\n")}`
      : "";
    
    return this.invoke(`Design a system architecture for: ${task}${constraintText}`);
  }

  async evaluate(existingArchitecture: string): Promise<ReturnType<typeof this.invoke>> {
    return this.invoke(`Evaluate the following architecture and suggest improvements:\n\n${existingArchitecture}`);
  }

  async decompose(system: string): Promise<ReturnType<typeof this.invoke>> {
    return this.invoke(`Decompose the following system into well-defined components:\n\n${system}`);
  }
}
