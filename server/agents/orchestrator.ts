import { Architect, Mechanic, CodeNinja, Philosopher } from "./personas";
import type { AgentConfig, AgentType } from "@shared/schema";
import { DEFAULT_AGENT_CONFIG } from "@shared/schema";
import type { AgentInvocationResult } from "./types";
import { PromptOptimizer, OutcomeLearner, MemoryManager } from "./learning";
import type { IDataTelemetry, InsertRunOutcome } from "../storage";
import { randomUUID } from "crypto";

export interface LearningEnabledConfig {
  enableLearning: boolean;
  enableMemoryContext: boolean;
  enablePromptOptimization: boolean;
}

const DEFAULT_LEARNING_CONFIG: LearningEnabledConfig = {
  enableLearning: false,
  enableMemoryContext: false,
  enablePromptOptimization: false,
};

export class Orchestrator {
  private config: AgentConfig;
  private learningConfig: LearningEnabledConfig;
  private architect: Architect;
  private mechanic: Mechanic;
  private codeNinja: CodeNinja;
  private philosopher: Philosopher;

  private promptOptimizer?: PromptOptimizer;
  private outcomeLearner?: OutcomeLearner;
  private memoryManager?: MemoryManager;
  private storage?: IDataTelemetry;

  constructor(
    config: Partial<AgentConfig> = {},
    learningConfig: Partial<LearningEnabledConfig> = {},
    storage?: IDataTelemetry
  ) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.learningConfig = { ...DEFAULT_LEARNING_CONFIG, ...learningConfig };
    this.storage = storage;

    this.architect = new Architect(this.config);
    this.mechanic = new Mechanic(this.config);
    this.codeNinja = new CodeNinja(this.config);
    this.philosopher = new Philosopher(this.config);

    if (storage && this.learningConfig.enableLearning) {
      this.promptOptimizer = new PromptOptimizer(storage);
      this.outcomeLearner = new OutcomeLearner(storage);
      this.memoryManager = new MemoryManager(storage);
    }
  }

  getAgent(type: AgentType) {
    switch (type) {
      case "architect":
        return this.architect;
      case "mechanic":
        return this.mechanic;
      case "codeNinja":
        return this.codeNinja;
      case "philosopher":
        return this.philosopher;
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  async invokeAgent(type: AgentType, prompt: string): Promise<AgentInvocationResult> {
    const agent = this.getAgent(type);
    const result = await agent.invoke(prompt);

    if (this.config.enablePhilosopher && this.config.validationLevel === "strict") {
      const philosopherEval = await this.philosopher.evaluate(
        JSON.stringify(result.response),
        `Original prompt: ${prompt}`
      );
      
      result.response.validations.passed.push(
        ...philosopherEval.response.validations.passed.map(v => `[Philosopher] ${v}`)
      );
      result.response.validations.failed.push(
        ...philosopherEval.response.validations.failed.map(v => `[Philosopher] ${v}`)
      );
    }

    return result;
  }

  async runPipeline(task: string): Promise<{
    blueprint: AgentInvocationResult;
    implementation: AgentInvocationResult;
    diagnosis?: AgentInvocationResult;
    metaAnalysis?: AgentInvocationResult;
  }> {
    const blueprint = await this.architect.design(task);
    
    const implementation = await this.codeNinja.implement(
      blueprint.response.recommendation,
      blueprint.response.alternatives
    );

    let diagnosis: AgentInvocationResult | undefined;
    if (implementation.response.validations.failed.length > 0) {
      diagnosis = await this.mechanic.diagnose(
        "Implementation has validation failures",
        JSON.stringify(implementation.response.validations.failed)
      );
    }

    let metaAnalysis: AgentInvocationResult | undefined;
    if (this.config.enablePhilosopher) {
      metaAnalysis = await this.philosopher.metaThink([
        JSON.stringify(blueprint.response),
        JSON.stringify(implementation.response),
        diagnosis ? JSON.stringify(diagnosis.response) : "",
      ]);
    }

    return {
      blueprint,
      implementation,
      diagnosis,
      metaAnalysis,
    };
  }

  async invokeWithLearning(
    type: AgentType,
    prompt: string
  ): Promise<{ result: AgentInvocationResult; runId: string; promptVersion?: string }> {
    const runId = randomUUID();
    let promptVersion: string | undefined;
    let enhancedPrompt = prompt;
    let systemPromptOverride: string | undefined;

    if (this.learningConfig.enablePromptOptimization && this.promptOptimizer) {
      const selection = await this.promptOptimizer.selectPromptVariant(type);
      if (selection) {
        promptVersion = selection.variant.id;
        systemPromptOverride = selection.promptText;
      }
    }

    if (this.learningConfig.enableMemoryContext && this.memoryManager) {
      const context = await this.memoryManager.buildContextFromMemories(type, prompt);
      if (context) {
        enhancedPrompt = prompt + "\n\n" + context;
      }
    }

    const agent = this.getAgent(type);
    const result = systemPromptOverride
      ? await agent.invokeWithSystemPrompt(enhancedPrompt, systemPromptOverride)
      : await agent.invoke(enhancedPrompt);

    if (this.config.enablePhilosopher && this.config.validationLevel === "strict") {
      const philosopherEval = await this.philosopher.evaluate(
        JSON.stringify(result.response),
        `Original prompt: ${prompt}`
      );
      
      result.response.validations.passed.push(
        ...philosopherEval.response.validations.passed.map(v => `[Philosopher] ${v}`)
      );
      result.response.validations.failed.push(
        ...philosopherEval.response.validations.failed.map(v => `[Philosopher] ${v}`)
      );
    }

    return { result, runId, promptVersion };
  }

  async recordOutcome(
    runId: string,
    agentType: AgentType,
    outcomeStatus: "accepted" | "rejected" | "edited" | "ignored",
    options: {
      editDistance?: number;
      timeToDecision?: number;
      grokAgreed?: boolean;
      promptVersion?: string;
      classicMetrics?: {
        cost: number;
        latency: number;
        accuracy: number;
        security: number;
        stability: number;
      };
    } = {}
  ): Promise<void> {
    if (!this.storage) return;

    const outcome: InsertRunOutcome = {
      runId,
      agentType,
      outcomeStatus,
      editDistance: options.editDistance,
      timeToDecision: options.timeToDecision,
      grokAgreed: options.grokAgreed,
      promptVersion: options.promptVersion,
      classicMetrics: options.classicMetrics,
    };

    await this.storage.createRunOutcome(outcome);

    if (
      outcomeStatus === "accepted" &&
      this.memoryManager &&
      options.classicMetrics
    ) {
      const qualityScore = options.classicMetrics.accuracy;
      if (qualityScore >= 0.8) {
        await this.memoryManager.storeMemory(
          agentType,
          `Task for ${agentType}`,
          `High quality response`,
          qualityScore
        );
      }
    }
  }

  async getLearningInsights(agentType: AgentType): Promise<{
    performanceSignal?: Awaited<ReturnType<OutcomeLearner["analyzeAgentPerformance"]>>;
    improvementSuggestions?: string[];
    memoryStats?: Awaited<ReturnType<MemoryManager["getMemoryStats"]>>;
  }> {
    const insights: {
      performanceSignal?: Awaited<ReturnType<OutcomeLearner["analyzeAgentPerformance"]>>;
      improvementSuggestions?: string[];
      memoryStats?: Awaited<ReturnType<MemoryManager["getMemoryStats"]>>;
    } = {};

    if (this.outcomeLearner) {
      insights.performanceSignal = await this.outcomeLearner.analyzeAgentPerformance(agentType);
      insights.improvementSuggestions = await this.outcomeLearner.generateImprovementSuggestions(agentType);
    }

    if (this.memoryManager) {
      insights.memoryStats = await this.memoryManager.getMemoryStats(agentType);
    }

    return insights;
  }

  async evaluateAndOptimize(agentType: AgentType): Promise<{
    promoted: boolean;
    winner?: string;
    loser?: string;
  }> {
    if (!this.promptOptimizer) {
      return { promoted: false };
    }

    const evaluation = await this.promptOptimizer.evaluateABTest(agentType);

    if (evaluation.significant && evaluation.winner && evaluation.loser) {
      await this.promptOptimizer.promoteWinner(evaluation.winner.id, evaluation.loser.id);
      return {
        promoted: true,
        winner: evaluation.winner.id,
        loser: evaluation.loser.id,
      };
    }

    return { promoted: false };
  }
}
