#!/usr/bin/env node
import { Orchestrator } from "./agents";
import { FakeDataScanner, type ScanResult } from "./scanner";
import { createLogger } from "./logger";
import { DEFAULT_AGENT_CONFIG, STRICT_AGENT_CONFIG } from "./constants";
import type { AgentType, AgentConfig } from "./types";
import type { ExternalAgentType } from "../shared/schema";

const logger = createLogger({ level: "info" });
const API_BASE_URL = process.env.AI_AGENTS_API_URL || "http://localhost:5000";

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

function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY");
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function invokeAgent(options: InvokeOptions): Promise<CommandResult> {
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    const message = `Missing required environment variables: ${envCheck.missing.join(", ")}`;
    console.error("Error:", message);
    console.error("\nTo use the invoke command, set the following environment variables:");
    console.error("  OPENAI_API_KEY - Your OpenAI API key");
    console.error("  XAI_API_KEY - (Optional) Your xAI API key for Grok second opinions");
    return { success: false, exitCode: 1, message };
  }
  
  const config = options.strict 
    ? { ...STRICT_AGENT_CONFIG, ...options.config }
    : { ...DEFAULT_AGENT_CONFIG, ...options.config };
  
  const orchestrator = new Orchestrator(config);
  
  logger.info(`Invoking agent: ${options.agent}`);
  
  try {
    const result = await orchestrator.invokeAgent(options.agent, options.prompt);
    
    console.log("\n--- Agent Response ---");
    console.log("Recommendation:", result.response.recommendation);
    console.log("Confidence:", result.response.confidence);
    
    if (result.response.reasoning.length > 0) {
      console.log("\nReasoning Steps:");
      result.response.reasoning.forEach((step) => {
        console.log(`  ${step.step}. ${step.thought}`);
        if (step.action) console.log(`     Action: ${step.action}`);
        if (step.observation) console.log(`     Observation: ${step.observation}`);
      });
    }
    
    if (result.response.alternatives && result.response.alternatives.length > 0) {
      console.log("\nAlternatives:");
      result.response.alternatives.forEach((alt, i) => {
        console.log(`  ${i + 1}. ${alt}`);
      });
    }
    
    if (result.response.warnings && result.response.warnings.length > 0) {
      console.log("\nWarnings:");
      result.response.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }
    
    console.log("\n--- Metrics ---");
    console.log("Cost:", result.metrics.cost.estimatedCost.toFixed(4));
    console.log("Tokens:", result.metrics.cost.tokens);
    console.log("Latency:", result.metrics.latency.totalMs, "ms");
    console.log("Task Success Rate:", (result.metrics.accuracy.taskSuccessRate * 100).toFixed(1) + "%");
    console.log("Consistency Score:", (result.metrics.stability.consistencyScore * 100).toFixed(1) + "%");
    
    if (result.response.grokSecondOpinion) {
      console.log("\n--- Grok Second Opinion ---");
      console.log("Rating:", result.response.grokSecondOpinion.rating, "/ 10");
      if (result.response.grokSecondOpinion.agreements.length > 0) {
        console.log("Agreements:", result.response.grokSecondOpinion.agreements.join("; "));
      }
      if (result.response.grokSecondOpinion.improvements.length > 0) {
        console.log("Improvements:", result.response.grokSecondOpinion.improvements.join("; "));
      }
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Agent invocation failed: ${message}`);
    console.error("Error:", message);
    return { success: false, exitCode: 1, message };
  }
}

export async function runScan(options: ScanOptions): Promise<CommandResult> {
  const scanner = new FakeDataScanner({
    strict: options.strict ?? false,
    extensions: options.extensions ?? [".ts", ".tsx", ".js", ".jsx"],
  });
  
  logger.info(`Starting QA scan: ${options.path}`);
  
  try {
    const result = await scanner.scanDirectory(options.path);
    
    printScanResult(result);
    
    return { 
      success: result.passed, 
      exitCode: result.passed ? 0 : 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Scan failed: ${message}`);
    console.error("Error:", message);
    return { success: false, exitCode: 1, message };
  }
}

function printScanResult(result: ScanResult): void {
  console.log("\n=== QA Scan Results ===\n");
  console.log("Status:", result.passed ? "PASSED" : "FAILED");
  console.log("Files Scanned:", result.filesScanned);
  console.log("Total Issues:", result.issues.length);
  
  if (result.issues.length > 0) {
    console.log("\n--- Issues Found ---\n");
    
    const byFile = new Map<string, typeof result.issues>();
    for (const issue of result.issues) {
      const existing = byFile.get(issue.file) ?? [];
      existing.push(issue);
      byFile.set(issue.file, existing);
    }
    
    for (const [file, issues] of byFile) {
      console.log(`\n${file}:`);
      for (const issue of issues) {
        const severity = issue.severity === "error" ? "[ERROR]" : "[WARN] ";
        console.log(`  ${severity} Line ${issue.line}: ${issue.message}`);
        console.log(`          Pattern: ${issue.pattern}`);
      }
    }
  }
  
  console.log("\n--- Summary ---");
  const errors = result.issues.filter(i => i.severity === "error").length;
  const warnings = result.issues.filter(i => i.severity === "warning").length;
  console.log(`Errors: ${errors}, Warnings: ${warnings}`);
}

export async function submitReport(options: ReportOptions): Promise<CommandResult> {
  logger.info(`Submitting report for project: ${options.projectId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/external/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: options.projectId,
        externalAgent: options.agent,
        action: options.action,
        codeGenerated: options.codeGenerated,
        codeAccepted: options.codeAccepted,
        humanCorrection: options.humanCorrection,
        errorMessage: options.errorMessage,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log("\n=== Report Submitted ===\n");
    console.log("Report ID:", result.reportId);
    console.log("Failure Detected:", result.detectedFailure ? "Yes" : "No");
    if (result.failureCategory) {
      console.log("Category:", result.failureCategory);
      console.log("Severity:", result.failureSeverity);
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Report submission failed: ${message}`);
    console.error("Error:", message);
    return { success: false, exitCode: 1, message };
  }
}

export async function generateRules(options: GenerateRulesOptions): Promise<CommandResult> {
  logger.info(`Generating rules for project: ${options.projectId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/guidelines/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: options.projectId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log("\n=== Guidelines Generated ===\n");
    console.log("Project:", result.guidelines.projectId);
    console.log("Rules Generated:", result.rulesGenerated);
    console.log("Confidence:", (result.guidelines.confidence * 100).toFixed(1) + "%");
    console.log("Observations:", result.guidelines.observationCount);
    
    if (options.output) {
      const fs = await import("fs");
      fs.writeFileSync(options.output, result.guidelines.rulesMarkdown);
      console.log(`\nRules written to: ${options.output}`);
    } else {
      console.log("\n--- AGENT_RULES.md ---\n");
      console.log(result.guidelines.rulesMarkdown);
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Rules generation failed: ${message}`);
    console.error("Error:", message);
    return { success: false, exitCode: 1, message };
  }
}

export async function viewAnalytics(options: AnalyticsOptions): Promise<CommandResult> {
  logger.info("Fetching analytics");
  
  try {
    const url = new URL(`${API_BASE_URL}/api/agents/monitor/analytics`);
    if (options.projectId) {
      url.searchParams.set("projectId", options.projectId);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (options.format === "json" || options.export) {
      console.log(JSON.stringify(result, null, 2));
      return { success: true, exitCode: 0 };
    }
    
    console.log("\n=== Monitor Analytics ===\n");
    console.log("Project:", result.projectId);
    console.log("Total Reports:", result.analytics.totalReports);
    console.log("Health Score:", result.healthScore.toFixed(1) + "%");
    
    console.log("\n--- Failures by Category ---");
    for (const [category, count] of Object.entries(result.analytics.failuresByCategory)) {
      if (count as number > 0) {
        console.log(`  ${category}: ${count}`);
      }
    }
    
    console.log("\n--- Failures by Severity ---");
    for (const [severity, count] of Object.entries(result.analytics.failuresBySeverity)) {
      if (count as number > 0) {
        console.log(`  ${severity}: ${count}`);
      }
    }
    
    if (result.analytics.topPatterns.length > 0) {
      console.log("\n--- Top Patterns ---");
      result.analytics.topPatterns.slice(0, 5).forEach((p: { pattern: string; occurrences: number; category: string }) => {
        console.log(`  ${p.category}: ${p.pattern} (${p.occurrences}x)`);
      });
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Analytics fetch failed: ${message}`);
    console.error("Error:", message);
    return { success: false, exitCode: 1, message };
  }
}

function printHelp(): void {
  console.log(`
AI Coding Agents CLI

Usage:
  ai-agents <command> [options]

Commands:
  invoke <agent> <prompt>    Invoke an AI agent
  scan <path>                Scan code for fake/placeholder data
  report <projectId>         Submit an external agent report
  generate-rules <projectId> Generate AGENT_RULES.md for a project
  analytics [projectId]      View failure analytics
  help                       Show this help message

Options for 'invoke':
  --strict                   Use strict configuration
  --agent <type>             Agent type: architect, mechanic, ninja, philosopher

Options for 'scan':
  --strict                   Fail on warnings (not just errors)
  --ext <extensions>         File extensions to scan (comma-separated)

Options for 'report':
  --agent <type>             External agent: replit_agent, cursor, copilot, claude_code, etc.
  --action <action>          Action performed (e.g., "code_generation")
  --code <code>              Generated code (optional)
  --accepted                 Whether code was accepted
  --correction <code>        Human correction (optional)
  --error <message>          Error message (optional)

Options for 'generate-rules':
  --output <file>            Output file path (default: prints to stdout)

Options for 'analytics':
  --json                     Output as JSON
  --export                   Export data (requires projectId)

Environment Variables:
  OPENAI_API_KEY             Required for invoke command
  XAI_API_KEY                Optional for Grok second opinions
  AI_AGENTS_API_URL          API server URL (default: http://localhost:5000)

Examples:
  ai-agents invoke architect "Design a REST API for user management"
  ai-agents invoke mechanic "Debug this authentication issue" --strict
  ai-agents scan ./src --ext .ts,.tsx
  ai-agents report my-project --agent cursor --action code_gen --accepted
  ai-agents generate-rules my-project --output AGENT_RULES.md
  ai-agents analytics my-project --json
`);
}

export async function parseArgs(args: string[]): Promise<CommandResult> {
  const command = args[0];
  
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return { success: true, exitCode: 0 };
  }
  
  if (command === "invoke") {
    const agentArg = args[1];
    const promptParts: string[] = [];
    let strict = false;
    
    const agentMap: Record<string, AgentType> = {
      architect: "architect",
      mechanic: "mechanic",
      ninja: "codeNinja",
      codeninja: "codeNinja",
      philosopher: "philosopher",
    };
    
    const agent = agentMap[agentArg?.toLowerCase() ?? ""];
    if (!agent) {
      console.error("Error: Invalid agent type. Choose: architect, mechanic, ninja, philosopher");
      return { success: false, exitCode: 1 };
    }
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--strict") {
        strict = true;
      } else {
        promptParts.push(args[i]);
      }
    }
    
    const prompt = promptParts.join(" ");
    if (!prompt) {
      console.error("Error: Prompt is required");
      return { success: false, exitCode: 1 };
    }
    
    return invokeAgent({ agent, prompt, strict });
  }
  
  if (command === "scan") {
    const path = args[1];
    if (!path) {
      console.error("Error: Path is required");
      return { success: false, exitCode: 1 };
    }
    
    let strict = false;
    let extensions: string[] | undefined;
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--strict") {
        strict = true;
      } else if (args[i] === "--ext" && args[i + 1]) {
        extensions = args[i + 1].split(",").map(e => e.trim());
        i++;
      }
    }
    
    return runScan({ path, strict, extensions });
  }
  
  if (command === "report") {
    const projectId = args[1];
    if (!projectId) {
      console.error("Error: projectId is required");
      return { success: false, exitCode: 1 };
    }
    
    let agent: ExternalAgentType = "replit_agent";
    let action = "code_generation";
    let codeGenerated: string | undefined;
    let codeAccepted = false;
    let humanCorrection: string | undefined;
    let errorMessage: string | undefined;
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--agent" && args[i + 1]) {
        agent = args[i + 1] as ExternalAgentType;
        i++;
      } else if (args[i] === "--action" && args[i + 1]) {
        action = args[i + 1];
        i++;
      } else if (args[i] === "--code" && args[i + 1]) {
        codeGenerated = args[i + 1];
        i++;
      } else if (args[i] === "--accepted") {
        codeAccepted = true;
      } else if (args[i] === "--correction" && args[i + 1]) {
        humanCorrection = args[i + 1];
        i++;
      } else if (args[i] === "--error" && args[i + 1]) {
        errorMessage = args[i + 1];
        i++;
      }
    }
    
    return submitReport({ projectId, agent, action, codeGenerated, codeAccepted, humanCorrection, errorMessage });
  }
  
  if (command === "generate-rules") {
    const projectId = args[1];
    if (!projectId) {
      console.error("Error: projectId is required");
      return { success: false, exitCode: 1 };
    }
    
    let output: string | undefined;
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--output" && args[i + 1]) {
        output = args[i + 1];
        i++;
      }
    }
    
    return generateRules({ projectId, output });
  }
  
  if (command === "analytics") {
    const projectId = args[1];
    let format: "json" | "csv" | undefined;
    let exportData = false;
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--json") {
        format = "json";
      } else if (args[i] === "--csv") {
        format = "csv";
      } else if (args[i] === "--export") {
        exportData = true;
      }
    }
    
    return viewAnalytics({ projectId, format, export: exportData });
  }
  
  console.error(`Error: Unknown command '${command}'`);
  printHelp();
  return { success: false, exitCode: 1 };
}

async function main(): Promise<void> {
  const result = await parseArgs(process.argv.slice(2));
  process.exit(result.exitCode);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
