import OpenAI from "openai";
const COT_SYSTEM_SUFFIX = `
You MUST structure your response using Chain-of-Thought reasoning.
For each step of your reasoning:
1. State what you're thinking (Thought)
2. What action you're taking or considering (Action)
3. What you observe from that action (Observation)

After completing your reasoning steps, provide your final recommendation.
Format your response as JSON:
{
  "reasoning": [
    {"step": 1, "thought": "...", "action": "...", "observation": "..."},
    {"step": 2, "thought": "...", "action": "...", "observation": "..."}
  ],
  "recommendation": "Your final answer/recommendation",
  "confidence": 0.0-1.0,
  "alternatives": ["Alternative approach 1", "Alternative approach 2"],
  "warnings": ["Potential issue 1"],
  "codeOutput": "// Code if applicable",
  "validations": {
    "passed": ["Validation 1 passed"],
    "failed": ["Validation 1 failed"]
  }
}`;
export class PromptEngine {
    constructor(config, openaiApiKey) {
        this.config = config;
        this.openai = new OpenAI({
            apiKey: openaiApiKey || process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        });
    }
    async generateWithCoT(systemPrompt, userPrompt, model = "gpt-4o") {
        const fullSystemPrompt = systemPrompt + COT_SYSTEM_SUFFIX;
        const completion = await this.openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: fullSystemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content || "{}";
        const tokensUsed = (completion.usage?.total_tokens || 0);
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch {
            parsed = {
                reasoning: [],
                recommendation: content,
                confidence: 0.5,
                validations: { passed: [], failed: [] },
            };
        }
        return {
            response: content,
            reasoning: parsed.reasoning || [],
            tokensUsed,
        };
    }
    async runSelfConsistency(systemPrompt, userPrompt, mode) {
        const pathCount = mode === "none" ? 1 : mode === "fast" ? 2 : 3;
        const paths = [];
        for (let i = 0; i < pathCount; i++) {
            const { response, reasoning } = await this.generateWithCoT(systemPrompt, userPrompt + (i > 0 ? `\n[Reasoning attempt ${i + 1}]` : ""));
            let parsed;
            try {
                parsed = JSON.parse(response);
            }
            catch {
                parsed = { recommendation: response, confidence: 0.5 };
            }
            paths.push({
                steps: reasoning,
                conclusion: parsed.recommendation || "",
                confidence: parsed.confidence || 0.5,
            });
        }
        const conclusions = paths.map(p => p.conclusion.toLowerCase().trim());
        const uniqueConclusions = Array.from(new Set(conclusions));
        const conclusionCounts = conclusions.reduce((acc, c) => {
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {});
        const mostCommon = Object.entries(conclusionCounts)
            .sort((a, b) => b[1] - a[1])[0];
        const selectedIndex = conclusions.findIndex(c => c === mostCommon[0]);
        const selectedPath = paths[selectedIndex >= 0 ? selectedIndex : 0];
        const consensusScore = mostCommon[1] / pathCount;
        const disagreements = [];
        if (uniqueConclusions.length > 1) {
            disagreements.push(`${uniqueConclusions.length} different conclusions reached`);
        }
        return {
            selectedPath,
            allPaths: paths,
            consensusScore,
            disagreements,
        };
    }
    async applySelfCritique(originalResponse, systemPrompt) {
        const critiquePrompt = `
Review the following response and identify any issues, gaps, or improvements:

Original Response:
${originalResponse}

Provide your critique as JSON:
{
  "critique": "Your detailed critique",
  "improvements": ["Improvement 1", "Improvement 2"],
  "severity": "low|medium|high"
}`;
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a critical reviewer evaluating AI-generated responses for accuracy, completeness, and quality." },
                { role: "user", content: critiquePrompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
            response_format: { type: "json_object" },
        });
        const critiqueContent = completion.choices[0]?.message?.content || "{}";
        let critique;
        try {
            critique = JSON.parse(critiqueContent);
        }
        catch {
            critique = { critique: "No issues found", improvements: [], severity: "low" };
        }
        if (critique.severity === "high" || critique.improvements?.length > 2) {
            const improvePrompt = `
Based on this critique, provide an improved response:

Critique: ${critique.critique}
Suggested Improvements: ${critique.improvements?.join(", ")}

Original Response:
${originalResponse}

Provide the improved response.`;
            const improvedCompletion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: improvePrompt },
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
            });
            return {
                originalResponse,
                critique: critique.critique,
                improvedResponse: improvedCompletion.choices[0]?.message?.content || originalResponse,
                improvementsMade: critique.improvements || [],
            };
        }
        return {
            originalResponse,
            critique: critique.critique,
            improvedResponse: originalResponse,
            improvementsMade: [],
        };
    }
}
//# sourceMappingURL=prompt-engine.js.map