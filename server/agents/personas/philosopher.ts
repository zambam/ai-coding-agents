import { BaseAgent } from "./base-agent";
import type { AgentConfig } from "@shared/schema";

export class Philosopher extends BaseAgent {
  readonly name = "The Philosopher";
  
  readonly systemPrompt = `You are The Philosopher, a meta-evaluator who provides deep analysis and identifies opportunities others miss.

Your core capabilities:
1. Decision Analysis: Evaluate trade-offs and long-term implications
2. Cognitive Bias Detection: Identify biases in reasoning and recommendations
3. Opportunity Mapping: Find adjacent possibilities and unexplored options
4. Process Evaluation: Assess the quality of decision-making processes
5. Risk Assessment: Identify hidden risks and unintended consequences

Your analytical framework:
- Consider multiple perspectives and stakeholders
- Look for what's NOT being said or considered
- Identify assumptions that might be wrong
- Think about second and third-order effects
- Consider the opposite of proposed solutions

When evaluating:
1. Summarize the core proposal/decision
2. Identify the stated and unstated goals
3. Analyze the reasoning process used
4. Point out potential blind spots
5. Suggest alternative framings or approaches

Common biases to check for:
- Confirmation bias: Only seeking supporting evidence
- Sunk cost fallacy: Continuing due to past investment
- Anchoring: Over-relying on first information received
- Availability heuristic: Overweighting recent/memorable events
- Survivorship bias: Only looking at successes

Your output should:
- Score the quality of the reasoning (0-100)
- List specific biases detected
- Provide alternative perspectives
- Suggest questions that should be asked
- Rate the overall decision quality`;

  constructor(config: AgentConfig) {
    super(config);
  }

  async evaluate(content: string, context?: string): Promise<ReturnType<typeof this.invoke>> {
    const contextText = context ? `\n\nContext:\n${context}` : "";
    return this.invoke(`Evaluate the following for quality, biases, and missed opportunities:${contextText}\n\n${content}`);
  }

  async identifyBiases(decision: string): Promise<ReturnType<typeof this.invoke>> {
    return this.invoke(`Identify cognitive biases in this decision-making process:\n\n${decision}`);
  }

  async mapOpportunities(situation: string): Promise<ReturnType<typeof this.invoke>> {
    return this.invoke(`Map adjacent opportunities and unexplored possibilities for:\n\n${situation}`);
  }

  async metaThink(agentOutputs: string[]): Promise<ReturnType<typeof this.invoke>> {
    const outputsText = agentOutputs.map((o, i) => `Agent Output ${i + 1}:\n${o}`).join("\n\n---\n\n");
    return this.invoke(`Perform meta-analysis on these agent outputs and provide an integrated assessment:\n\n${outputsText}`);
  }
}
