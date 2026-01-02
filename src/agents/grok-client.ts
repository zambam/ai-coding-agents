import OpenAI from "openai";
import type { ReasoningStep } from "../types.js";

export interface GrokResponse {
  content: string;
  model: string;
}

let grokClient: OpenAI | null = null;

function getGrokClient(apiKey?: string): OpenAI {
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

export async function getGrokSecondOpinion(
  fullSystemPrompt: string,
  userPrompt: string,
  originalResponse: string,
  reasoningSteps?: ReasoningStep[],
  apiKey?: string
): Promise<GrokResponse> {
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

export function setGrokClient(client: OpenAI | null): void {
  grokClient = client;
}
