import { PromptEngine } from "../prompt-engine";
import { Evaluator } from "../evaluator";
import { ReplitMdParser } from "../replit-md-parser";
import type { AgentConfig, AgentResponse, CLASSicMetrics, DEFAULT_AGENT_CONFIG, ReasoningStep } from "@shared/schema";
import type { AgentInvocationResult } from "../types";

export abstract class BaseAgent {
  protected promptEngine: PromptEngine;
  protected evaluator: Evaluator;
  protected replitMdParser: ReplitMdParser;
  protected config: AgentConfig;

  abstract readonly name: string;
  abstract readonly systemPrompt: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.promptEngine = new PromptEngine(config);
    this.evaluator = new Evaluator(config.validationLevel);
    this.replitMdParser = new ReplitMdParser();
  }

  async invoke(prompt: string): Promise<AgentInvocationResult> {
    const startTime = Date.now();
    
    const replitConfig = await this.replitMdParser.parse();
    const contextAddition = this.replitMdParser.buildContextFromConfig(replitConfig);
    
    const fullSystemPrompt = contextAddition 
      ? `${this.systemPrompt}\n\n--- Project Context ---\n${contextAddition}`
      : this.systemPrompt;

    const consistencyResult = await this.promptEngine.runSelfConsistency(
      fullSystemPrompt,
      prompt,
      this.config.consistencyMode
    );

    let finalResponse: string;
    let reasoning: ReasoningStep[];
    
    if (this.config.enableSelfCritique) {
      const critiqueResult = await this.promptEngine.applySelfCritique(
        JSON.stringify(consistencyResult.selectedPath),
        fullSystemPrompt
      );
      finalResponse = critiqueResult.improvedResponse;
      reasoning = consistencyResult.selectedPath.steps;
    } else {
      finalResponse = JSON.stringify({
        reasoning: consistencyResult.selectedPath.steps,
        recommendation: consistencyResult.selectedPath.conclusion,
        confidence: consistencyResult.selectedPath.confidence,
      });
      reasoning = consistencyResult.selectedPath.steps;
    }

    let parsedResponse: AgentResponse;
    try {
      const parsed = JSON.parse(finalResponse);
      parsedResponse = {
        reasoning: parsed.reasoning || reasoning,
        recommendation: parsed.recommendation || parsed.conclusion || consistencyResult.selectedPath.conclusion,
        confidence: parsed.confidence || consistencyResult.selectedPath.confidence,
        alternatives: parsed.alternatives || [],
        warnings: parsed.warnings || [],
        codeOutput: parsed.codeOutput,
        validations: parsed.validations || { passed: [], failed: [] },
      };
    } catch {
      parsedResponse = {
        reasoning,
        recommendation: consistencyResult.selectedPath.conclusion,
        confidence: consistencyResult.selectedPath.confidence,
        alternatives: [],
        warnings: [],
        validations: { passed: [], failed: [] },
      };
    }

    const validation = this.evaluator.validateResponse(parsedResponse);
    parsedResponse.validations = {
      passed: [...parsedResponse.validations.passed, ...validation.passed],
      failed: [...parsedResponse.validations.failed, ...validation.failed],
    };

    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(finalResponse.length / 4);

    const metrics = this.evaluator.buildMetrics(
      startTime,
      inputTokens,
      outputTokens,
      parsedResponse,
      consistencyResult.consensusScore,
      consistencyResult.allPaths.length
    );

    return {
      response: parsedResponse,
      metrics,
    };
  }
}
