import { Architect, Mechanic, CodeNinja, Philosopher } from "./personas";
import type { AgentConfig, AgentType, AgentInvocationResult } from "../types";
import { DEFAULT_AGENT_CONFIG } from "../constants";

export class Orchestrator {
  private config: AgentConfig;
  private architect: Architect;
  private mechanic: Mechanic;
  private codeNinja: CodeNinja;
  private philosopher: Philosopher;
  private openaiApiKey?: string;

  constructor(config: Partial<AgentConfig> = {}, openaiApiKey?: string) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.openaiApiKey = openaiApiKey;
    this.architect = new Architect(this.config, openaiApiKey);
    this.mechanic = new Mechanic(this.config, openaiApiKey);
    this.codeNinja = new CodeNinja(this.config, openaiApiKey);
    this.philosopher = new Philosopher(this.config, openaiApiKey);
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

  async runQAReview(scope: "full" | "staged" = "full"): Promise<{
    architectAudit: AgentInvocationResult;
    mechanicDiagnosis: AgentInvocationResult;
    codeNinjaRemediation: AgentInvocationResult;
    philosopherValidation: AgentInvocationResult;
  }> {
    const auditPrompt = scope === "full" 
      ? "Perform a complete architecture audit of the codebase. Identify dependency issues, duplicate configurations, and schema inconsistencies."
      : "Review the staged changes for architectural issues and potential problems.";
    
    const architectAudit = await this.architect.invoke(auditPrompt);

    const mechanicDiagnosis = await this.mechanic.diagnose(
      "Review the codebase for bugs, performance issues, and code quality problems",
      JSON.stringify(architectAudit.response)
    );

    const codeNinjaRemediation = await this.codeNinja.invoke(
      `Based on the following issues, propose fixes with priorities:\n\nArchitect findings: ${architectAudit.response.recommendation}\n\nMechanic findings: ${mechanicDiagnosis.response.recommendation}`
    );

    const philosopherValidation = await this.philosopher.metaThink([
      JSON.stringify(architectAudit.response),
      JSON.stringify(mechanicDiagnosis.response),
      JSON.stringify(codeNinjaRemediation.response),
    ]);

    return {
      architectAudit,
      mechanicDiagnosis,
      codeNinjaRemediation,
      philosopherValidation,
    };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}
