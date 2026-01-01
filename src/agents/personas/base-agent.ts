import { PromptEngine } from "../prompt-engine";
import { Evaluator } from "../evaluator";
import { ReplitMdParser } from "../replit-md-parser";
import { getGrokSecondOpinion } from "../grok-client";
import type { AgentConfig, AgentResponse, ReasoningStep, GrokSecondOpinion, AgentInvocationResult } from "../../types";

export abstract class BaseAgent {
  protected promptEngine: PromptEngine;
  protected evaluator: Evaluator;
  protected replitMdParser: ReplitMdParser;
  protected config: AgentConfig;

  abstract readonly name: string;
  abstract readonly systemPrompt: string;

  constructor(config: AgentConfig, openaiApiKey?: string) {
    this.config = config;
    this.promptEngine = new PromptEngine(config, openaiApiKey);
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

    if (this.config.enableGrokSecondOpinion && process.env.XAI_API_KEY) {
      try {
        const grokResponse = await getGrokSecondOpinion(
          fullSystemPrompt,
          prompt,
          parsedResponse.recommendation
        );
        
        parsedResponse.grokSecondOpinion = this.parseGrokResponse(grokResponse.content, grokResponse.model);
      } catch (error) {
        console.error("Failed to get Grok second opinion:", error);
      }
    }

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

  private parseGrokResponse(content: string, model: string): GrokSecondOpinion {
    const ratingMatch = content.match(/(\d+)\s*\/\s*10|rating[:\s]+(\d+)/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1] || ratingMatch[2]) : undefined;

    const agreements: string[] = [];
    const improvements: string[] = [];
    const risks: string[] = [];

    const lines = content.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('agree') || trimmed.toLowerCase().includes('strength')) {
        currentSection = 'agreements';
      } else if (trimmed.toLowerCase().includes('improve') || trimmed.toLowerCase().includes('suggest') || trimmed.toLowerCase().includes('alternative')) {
        currentSection = 'improvements';
      } else if (trimmed.toLowerCase().includes('risk') || trimmed.toLowerCase().includes('miss') || trimmed.toLowerCase().includes('concern')) {
        currentSection = 'risks';
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
        const item = trimmed.replace(/^[-*\d.]\s*/, '');
        if (item.length > 10) {
          if (currentSection === 'agreements') agreements.push(item);
          else if (currentSection === 'improvements') improvements.push(item);
          else if (currentSection === 'risks') risks.push(item);
        }
      }
    }

    return {
      content,
      model,
      rating,
      agreements,
      improvements,
      risks,
    };
  }
}
