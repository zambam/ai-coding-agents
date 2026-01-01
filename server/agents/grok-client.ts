import OpenAI from "openai";

const grokClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

export interface GrokResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function getGrokSecondOpinion(
  systemPrompt: string,
  userPrompt: string,
  originalResponse: string
): Promise<GrokResponse> {
  const secondOpinionPrompt = `You are providing a second opinion on an AI coding assistant's response.

ORIGINAL RESPONSE TO REVIEW:
${originalResponse}

USER'S ORIGINAL QUESTION:
${userPrompt}

Provide your independent analysis:
1. Do you agree with the recommendation? Why or why not?
2. What alternatives or improvements would you suggest?
3. Are there any risks or considerations the original response missed?
4. Rate the original response quality (1-10) and explain.

Be direct, uncensored, and innovative in your feedback. Challenge assumptions if needed.`;

  try {
    const response = await grokClient.chat.completions.create({
      model: "grok-3-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: secondOpinionPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || "";
    
    return {
      content,
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error("Grok API error:", error);
    throw error;
  }
}

export async function invokeGrokDirect(
  systemPrompt: string,
  userPrompt: string
): Promise<GrokResponse> {
  try {
    const response = await grokClient.chat.completions.create({
      model: "grok-3-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    
    return {
      content,
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error("Grok API error:", error);
    throw error;
  }
}

export { grokClient };
