#!/usr/bin/env node
import { Orchestrator } from "./agents";
import { FakeDataScanner, type ScanResult } from "./scanner";
import { createLogger } from "./logger";
import { DEFAULT_AGENT_CONFIG, STRICT_AGENT_CONFIG } from "./constants";
import type { AgentType, AgentConfig } from "./types";

const logger = createLogger({ level: "info" });

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

function printHelp(): void {
  console.log(`
AI Coding Agents CLI

Usage:
  ai-agents <command> [options]

Commands:
  invoke <agent> <prompt>    Invoke an AI agent
  scan <path>                Scan code for fake/placeholder data
  help                       Show this help message

Options for 'invoke':
  --strict                   Use strict configuration
  --agent <type>             Agent type: architect, mechanic, ninja, philosopher

Options for 'scan':
  --strict                   Fail on warnings (not just errors)
  --ext <extensions>         File extensions to scan (comma-separated)

Environment Variables:
  OPENAI_API_KEY             Required for invoke command
  XAI_API_KEY                Optional for Grok second opinions

Examples:
  ai-agents invoke architect "Design a REST API for user management"
  ai-agents invoke mechanic "Debug this authentication issue" --strict
  ai-agents scan ./src --ext .ts,.tsx
  ai-agents scan ./server --strict
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
