import { BaseAgent } from "./base-agent";
export class Architect extends BaseAgent {
    constructor(config, openaiApiKey) {
        super(config, openaiApiKey);
        this.name = "The Architect";
        this.agentType = "architect";
        this.systemPrompt = `You are The Architect, a senior software architect specializing in system design.

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
    }
    async design(task) {
        const prompt = `Design a system architecture for the following requirement:\n\n${task}\n\nProvide a comprehensive design with component breakdown, data flow, and implementation recommendations.`;
        return this.invoke(prompt);
    }
    async review(existingDesign) {
        const prompt = `Review the following system design and provide feedback:\n\n${existingDesign}\n\nIdentify strengths, weaknesses, and suggest improvements.`;
        return this.invoke(prompt);
    }
}
//# sourceMappingURL=architect.js.map