import { Architect, Mechanic, CodeNinja, Philosopher } from "./personas";
import type { AgentConfig, AgentType, AgentInvocationResult } from "../types";
export declare class Orchestrator {
    private config;
    private architect;
    private mechanic;
    private codeNinja;
    private philosopher;
    private openaiApiKey?;
    constructor(config?: Partial<AgentConfig>, openaiApiKey?: string);
    getAgent(type: AgentType): Architect | Mechanic | CodeNinja | Philosopher;
    invokeAgent(type: AgentType, prompt: string): Promise<AgentInvocationResult>;
    runPipeline(task: string): Promise<{
        blueprint: AgentInvocationResult;
        implementation: AgentInvocationResult;
        diagnosis?: AgentInvocationResult;
        metaAnalysis?: AgentInvocationResult;
    }>;
    runQAReview(scope?: "full" | "staged"): Promise<{
        architectAudit: AgentInvocationResult;
        mechanicDiagnosis: AgentInvocationResult;
        codeNinjaRemediation: AgentInvocationResult;
        philosopherValidation: AgentInvocationResult;
    }>;
    getConfig(): AgentConfig;
}
//# sourceMappingURL=orchestrator.d.ts.map