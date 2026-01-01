import { Architect, Mechanic, CodeNinja, Philosopher } from "./personas";
import type { AgentConfig, AgentType, DEFAULT_AGENT_CONFIG } from "@shared/schema";
import type { AgentInvocationResult } from "./types";

const DEFAULT_CONFIG: AgentConfig = {
  consistencyMode: "fast",
  validationLevel: "medium",
  enableSelfCritique: true,
  enablePhilosopher: false,
  maxTokens: 4096,
  temperature: 0.7,
};

export class Orchestrator {
  private config: AgentConfig;
  private architect: Architect;
  private mechanic: Mechanic;
  private codeNinja: CodeNinja;
  private philosopher: Philosopher;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.architect = new Architect(this.config);
    this.mechanic = new Mechanic(this.config);
    this.codeNinja = new CodeNinja(this.config);
    this.philosopher = new Philosopher(this.config);
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
}
