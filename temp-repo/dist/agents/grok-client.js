import OpenAI from "openai";
let grokClient = null;
function getGrokClient(apiKey) {
    if (!grokClient) {
        const key = apiKey || process.env.XAI_API_KEY;
        if (!key) {
            throw new Error("XAI_API_KEY is required for Grok second opinions");
        }
        grokClient = new OpenAI({
            apiKey: key,
            baseURL: "https://api.x.ai/v1",
        });
    }
    return grokClient;
}
export async function getGrokSecondOpinion(fullSystemPrompt, userPrompt, originalResponse, reasoningSteps, apiKey) {
    const client = getGrokClient(apiKey);
    const reviewPrompt = `You are a code review expert providing a second opinion on AI-generated recommendations.

SYSTEM CONTEXT:
${fullSystemPrompt}

ORIGINAL USER REQUEST:
${userPrompt}

${reasoningSteps ? `REASONING STEPS TAKEN:
${JSON.stringify(reasoningSteps, null, 2)}

` : ""}AI RECOMMENDATION TO REVIEW:
${originalResponse}

Please provide your second opinion:
1. Rate the recommendation (1-10)
2. What do you agree with? (strengths)
3. What could be improved? (suggestions)
4. What risks or issues might have been missed? (concerns)

Be constructive and specific. If you largely agree, say so briefly. Focus on substantive improvements.`;
    const completion = await client.chat.completions.create({
        model: "grok-3-latest",
        messages: [
            { role: "user", content: reviewPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
    });
    return {
        content: completion.choices[0]?.message?.content || "No response from Grok",
        model: "grok-3-latest",
    };
}
export function setGrokClient(client) {
    grokClient = client;
}
//# sourceMappingURL=grok-client.js.map