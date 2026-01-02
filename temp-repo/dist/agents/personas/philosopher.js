import { BaseAgent } from "./base-agent";
export class Philosopher extends BaseAgent {
    constructor(config, openaiApiKey) {
        super(config, openaiApiKey);
        this.name = "The Philosopher";
        this.agentType = "philosopher";
        this.systemPrompt = `You are The Philosopher, a meta-analyst and strategic thinker.

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
    }
    async evaluate(decision, context) {
        const prompt = `Evaluate the following decision or output:\n\n${decision}${context ? `\n\nContext:\n${context}` : ""}\n\nProvide meta-analysis, identify biases, and suggest improvements.`;
        return this.invoke(prompt);
    }
    async metaThink(inputs) {
        const prompt = `Perform meta-analysis on the following outputs from other agents:\n\n${inputs.filter(Boolean).map((input, i) => `--- Agent ${i + 1} Output ---\n${input}`).join("\n\n")}\n\nIdentify patterns, contradictions, and synthesize a final recommendation.`;
        return this.invoke(prompt);
    }
}
//# sourceMappingURL=philosopher.js.map