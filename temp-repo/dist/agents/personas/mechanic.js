import { BaseAgent } from "./base-agent";
export class Mechanic extends BaseAgent {
    constructor(config, openaiApiKey) {
        super(config, openaiApiKey);
        this.name = "The Mechanic";
        this.agentType = "mechanic";
        this.systemPrompt = `You are The Mechanic, an expert debugger and code fixer.

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
    }
    async diagnose(issue, context) {
        const prompt = `Diagnose the following issue:\n\n${issue}${context ? `\n\nContext:\n${context}` : ""}\n\nIdentify the root cause and propose a fix.`;
        return this.invoke(prompt);
    }
    async optimize(code, concern) {
        const prompt = `Optimize the following code for ${concern}:\n\n${code}\n\nProvide optimized code with explanation of changes.`;
        return this.invoke(prompt);
    }
}
//# sourceMappingURL=mechanic.js.map