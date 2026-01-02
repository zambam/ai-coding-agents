import { BaseAgent } from "./base-agent";
export class CodeNinja extends BaseAgent {
    constructor(config, openaiApiKey) {
        super(config, openaiApiKey);
        this.name = "The Code Ninja";
        this.agentType = "codeNinja";
        this.systemPrompt = `You are The Code Ninja, an expert implementation specialist.

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
    }
    async implement(specification, alternatives) {
        const altText = alternatives?.length
            ? `\n\nAlternative approaches to consider:\n${alternatives.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
            : "";
        const prompt = `Implement the following specification:\n\n${specification}${altText}\n\nProvide complete, production-ready code.`;
        return this.invoke(prompt);
    }
    async refactor(code, goal) {
        const prompt = `Refactor the following code to ${goal}:\n\n${code}\n\nProvide refactored code with explanation.`;
        return this.invoke(prompt);
    }
}
//# sourceMappingURL=code-ninja.js.map