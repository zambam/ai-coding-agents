#!/usr/bin/env node
import type { AgentType, AgentConfig, ExternalAgentType } from "./types";
interface InvokeOptions {
    agent: AgentType;
    prompt: string;
    strict?: boolean;
    config?: Partial<AgentConfig>;
}
interface ScanOptions {
    path: string;
    extensions?: string[];
    strict?: boolean;
}
interface ReportOptions {
    projectId: string;
    agent: ExternalAgentType;
    action: string;
    codeGenerated?: string;
    codeAccepted?: boolean;
    humanCorrection?: string;
    errorMessage?: string;
}
interface AnalyticsOptions {
    projectId?: string;
    format?: "json" | "csv";
    export?: boolean;
}
interface GenerateRulesOptions {
    projectId: string;
    output?: string;
}
interface CommandResult {
    success: boolean;
    exitCode: number;
    message?: string;
}
export declare function invokeAgent(options: InvokeOptions): Promise<CommandResult>;
export declare function runScan(options: ScanOptions): Promise<CommandResult>;
export declare function submitReport(options: ReportOptions): Promise<CommandResult>;
export declare function generateRules(options: GenerateRulesOptions): Promise<CommandResult>;
export declare function viewAnalytics(options: AnalyticsOptions): Promise<CommandResult>;
export declare function parseArgs(args: string[]): Promise<CommandResult>;
export {};
//# sourceMappingURL=cli.d.ts.map