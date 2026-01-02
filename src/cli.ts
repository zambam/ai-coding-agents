#!/usr/bin/env node
import { Orchestrator } from "./agents/index.js";
import { FakeDataScanner, type ScanResult } from "./scanner.js";
import { createLogger } from "./logger.js";
import { DEFAULT_AGENT_CONFIG, STRICT_AGENT_CONFIG } from "./constants.js";
import { initProject, type InitOptions, type InitResult } from "./init.js";
import type { AgentType, AgentConfig, ExternalAgentType } from "./types.js";

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

interface HooksOptions {
  action: 'install' | 'uninstall' | 'status';
}

interface InitProjectOptions {
  framework: 'express' | 'fastify' | 'koa' | 'hono';
  orm: 'drizzle' | 'prisma' | 'none';
  projectPath: string;
  projectId?: string;
  hubUrl?: string;
  writeStorage?: boolean;
  force?: boolean;
}

interface VerifyOptions {
  offline?: boolean;
  verbose?: boolean;
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
      const errorBody = await response.json() as { message?: string };
      throw new Error(errorBody.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json() as {
      reportId: string;
      detectedFailure: boolean;
      failureCategory?: string;
      failureSeverity?: string;
    };
    
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
      const errorBody = await response.json() as { message?: string };
      throw new Error(errorBody.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json() as {
      rulesGenerated: number;
      guidelines: {
        projectId: string;
        rulesMarkdown: string;
        confidence: number;
        observationCount: number;
      };
    };
    
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
      const errorBody = await response.json() as { message?: string };
      throw new Error(errorBody.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json() as {
      projectId?: string;
      healthScore: number;
      analytics: {
        totalReports: number;
        failuresByCategory: Record<string, number>;
        failuresBySeverity: Record<string, number>;
        topPatterns: Array<{ pattern: string; occurrences: number; category: string }>;
      };
    };
    
    if (options.format === "json" || options.export) {
      console.log(JSON.stringify(result, null, 2));
      return { success: true, exitCode: 0 };
    }
    
    console.log("\n=== Monitor Analytics ===\n");
    console.log("Project:", result.projectId ?? "All Projects");
    console.log("Total Reports:", result.analytics.totalReports);
    console.log("Health Score:", result.healthScore.toFixed(1) + "%");
    
    console.log("\n--- Failures by Category ---");
    for (const [category, count] of Object.entries(result.analytics.failuresByCategory)) {
      if (count > 0) {
        console.log(`  ${category}: ${count}`);
      }
    }
    
    console.log("\n--- Failures by Severity ---");
    for (const [severity, count] of Object.entries(result.analytics.failuresBySeverity)) {
      if (count > 0) {
        console.log(`  ${severity}: ${count}`);
      }
    }
    
    if (result.analytics.topPatterns.length > 0) {
      console.log("\n--- Top Patterns ---");
      result.analytics.topPatterns.slice(0, 5).forEach((p) => {
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

export async function manageHooks(options: HooksOptions): Promise<CommandResult> {
  const fs = await import("fs");
  const path = await import("path");
  
  const gitDir = path.join(process.cwd(), ".git");
  const hooksDir = path.join(gitDir, "hooks");
  
  if (!fs.existsSync(gitDir)) {
    console.error("Error: Not a git repository (no .git directory)");
    return { success: false, exitCode: 1, message: "Not a git repository" };
  }
  
  const hookFiles = ["post-commit", "pre-commit", "post-merge"];
  
  if (options.action === "status") {
    console.log("\n=== Git Hooks Status ===\n");
    for (const hook of hookFiles) {
      const hookPath = path.join(hooksDir, hook);
      const exists = fs.existsSync(hookPath);
      let isAiAgent = false;
      if (exists) {
        const content = fs.readFileSync(hookPath, "utf-8");
        isAiAgent = content.includes("AI Agent Monitor");
      }
      console.log(`  ${hook}: ${exists ? (isAiAgent ? "installed (ai-agents)" : "exists (other)") : "not installed"}`);
    }
    return { success: true, exitCode: 0 };
  }
  
  if (options.action === "install") {
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    
    console.log("\n=== Installing Git Hooks ===\n");
    
    const hookTemplates: Record<string, string> = {
      "post-commit": `#!/bin/bash
# AI Agent Monitor - Post-commit hook
# Reports accepted AI-generated code to the central hub

PROJECT_ID="\${AI_AGENTS_PROJECT_ID:-}"
API_URL="\${AI_AGENTS_API_URL:-http://localhost:5000}"

if [ -z "$PROJECT_ID" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE_URL" ]; then
    PROJECT_ID=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]//' | sed 's/\\.git$//')
  else
    PROJECT_ID=$(basename "$(pwd)")
  fi
fi

COMMIT_MSG=$(git log -1 --pretty=%B)
DETECTED_AGENT="unknown"

if echo "$COMMIT_MSG" | grep -qiE "copilot|cursor|claude|replit|windsurf|aider|continue|cody|gpt|ai-generated"; then
  echo "[AI Agent Monitor] Detected AI code, reporting..."
  curl -s -X POST "$API_URL/api/agents/external/report" \\
    -H "Content-Type: application/json" \\
    -d "{\\"projectId\\": \\"$PROJECT_ID\\", \\"externalAgent\\": \\"$DETECTED_AGENT\\", \\"action\\": \\"commit_accepted\\", \\"codeAccepted\\": true}" \\
    --max-time 5 >/dev/null 2>&1 || true
fi
`,
      "pre-commit": `#!/bin/bash
# AI Agent Monitor - Pre-commit hook
# Runs QA scan on staged files

if command -v npx &>/dev/null; then
  echo "[AI Agent Monitor] Running pre-commit scan..."
  npx ai-agents scan . 2>/dev/null || true
fi
`,
      "post-merge": `#!/bin/bash
# AI Agent Monitor - Post-merge hook
# Syncs AGENT_RULES.md after merges

PROJECT_ID="\${AI_AGENTS_PROJECT_ID:-}"
API_URL="\${AI_AGENTS_API_URL:-http://localhost:5000}"

if [ -z "$PROJECT_ID" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE_URL" ]; then
    PROJECT_ID=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]//' | sed 's/\\.git$//')
  fi
fi

if [ -n "$PROJECT_ID" ]; then
  echo "[AI Agent Monitor] Syncing AGENT_RULES.md..."
  npx ai-agents generate-rules "$PROJECT_ID" --output AGENT_RULES.md 2>/dev/null || true
fi
`
    };
    
    for (const [hook, content] of Object.entries(hookTemplates)) {
      const hookPath = path.join(hooksDir, hook);
      
      if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, "utf-8");
        if (!existing.includes("AI Agent Monitor")) {
          console.log(`  ${hook}: skipped (existing hook found, backup and retry)`);
          continue;
        }
      }
      
      fs.writeFileSync(hookPath, content);
      fs.chmodSync(hookPath, 0o755);
      console.log(`  ${hook}: installed`);
    }
    
    console.log("\nHooks installed successfully!");
    console.log("Set AI_AGENTS_API_URL to point to your hub server.");
    return { success: true, exitCode: 0 };
  }
  
  if (options.action === "uninstall") {
    console.log("\n=== Uninstalling Git Hooks ===\n");
    
    for (const hook of hookFiles) {
      const hookPath = path.join(hooksDir, hook);
      
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, "utf-8");
        if (content.includes("AI Agent Monitor")) {
          fs.unlinkSync(hookPath);
          console.log(`  ${hook}: removed`);
        } else {
          console.log(`  ${hook}: skipped (not an ai-agents hook)`);
        }
      } else {
        console.log(`  ${hook}: not found`);
      }
    }
    
    console.log("\nHooks uninstalled.");
    return { success: true, exitCode: 0 };
  }
  
  return { success: false, exitCode: 1, message: "Invalid action" };
}

async function runVerify(options: VerifyOptions): Promise<CommandResult> {
  const fs = await import("fs");
  const path = await import("path");
  const { execSync } = await import("child_process");
  
  interface VerifyCheck {
    name: string;
    status: 'pass' | 'fail' | 'skip';
    message: string;
    details?: string;
  }
  
  const checks: VerifyCheck[] = [];
  const configPath = path.join(process.cwd(), '.ai-agents.json');
  let config: { projectId?: string; hubUrl?: string } | null = null;
  
  // Check 1: Config file exists and is valid JSON
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      checks.push({ 
        name: 'Config file', 
        status: 'pass', 
        message: `.ai-agents.json valid (project: ${config?.projectId || 'unknown'})`,
        details: JSON.stringify(config, null, 2)
      });
    } catch (e) {
      checks.push({ 
        name: 'Config file', 
        status: 'fail', 
        message: 'Invalid JSON in .ai-agents.json',
        details: e instanceof Error ? e.message : String(e)
      });
    }
  } else {
    checks.push({ 
      name: 'Config file', 
      status: 'fail', 
      message: '.ai-agents.json not found. Run: npx ai-agents init' 
    });
  }
  
  // Check 2: CLI wrapper script exists and is executable
  const wrapperPath = path.join(process.cwd(), 'scripts', 'ai-agents.sh');
  if (fs.existsSync(wrapperPath)) {
    try {
      fs.accessSync(wrapperPath, fs.constants.X_OK);
      checks.push({ 
        name: 'CLI wrapper', 
        status: 'pass', 
        message: 'scripts/ai-agents.sh exists and is executable' 
      });
    } catch {
      checks.push({ 
        name: 'CLI wrapper', 
        status: 'fail', 
        message: 'scripts/ai-agents.sh exists but is not executable. Run: chmod +x scripts/ai-agents.sh' 
      });
    }
  } else {
    checks.push({ 
      name: 'CLI wrapper', 
      status: 'fail', 
      message: 'scripts/ai-agents.sh not found' 
    });
  }
  
  // Check 3: Storage adapter exists
  const storagePath = path.join(process.cwd(), 'server', 'agent-storage.ts');
  if (fs.existsSync(storagePath)) {
    const content = fs.readFileSync(storagePath, 'utf-8');
    if (content.includes('IAgentStorage')) {
      checks.push({ 
        name: 'Storage adapter', 
        status: 'pass', 
        message: 'server/agent-storage.ts implements IAgentStorage' 
      });
    } else {
      checks.push({ 
        name: 'Storage adapter', 
        status: 'fail', 
        message: 'server/agent-storage.ts missing IAgentStorage implementation' 
      });
    }
  } else {
    checks.push({ 
      name: 'Storage adapter', 
      status: 'skip', 
      message: 'server/agent-storage.ts not found (run init with --write-storage)' 
    });
  }
  
  // Check 4: Package exports resolve correctly (only if in a project with node_modules)
  // Note: We only test the main export since express/drizzle subpaths require those peer deps
  // Using ESM dynamic import since the package is ESM-only
  const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'ai-coding-agents');
  if (fs.existsSync(nodeModulesPath)) {
    const testPath = path.join(process.cwd(), '.ai-agents-test-imports.mjs');
    try {
      fs.writeFileSync(testPath, `
        const pkg = await import('ai-coding-agents');
        const required = ['Orchestrator', 'Architect', 'Mechanic', 'CodeNinja', 'Philosopher', 'logger', 'initProject'];
        const missing = required.filter(k => !pkg[k]);
        if (missing.length) {
          console.error('Missing: ' + missing.join(', '));
          process.exit(1);
        }
        console.log('ok');
      `);
      execSync(`node ${testPath}`, { encoding: 'utf-8' });
      checks.push({ 
        name: 'Package exports', 
        status: 'pass', 
        message: 'Core package exports resolve correctly' 
      });
    } catch (e) {
      checks.push({ 
        name: 'Package exports', 
        status: 'fail', 
        message: 'Package imports failed',
        details: e instanceof Error ? e.message : String(e)
      });
    } finally {
      if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    }
  } else {
    checks.push({ 
      name: 'Package exports', 
      status: 'skip', 
      message: 'ai-coding-agents not installed in node_modules' 
    });
  }
  
  // Check 5: Hub connectivity (unless offline)
  if (!options.offline && config?.hubUrl) {
    try {
      const healthUrl = `${config.hubUrl}/api/agents/health`;
      const response = await fetch(healthUrl, { 
        method: 'GET', 
        signal: AbortSignal.timeout(5000) 
      });
      if (response.ok) {
        const data = await response.json() as { status?: string };
        checks.push({ 
          name: 'Hub connection', 
          status: 'pass', 
          message: `Hub reachable at ${config.hubUrl} (status: ${data.status || 'ok'})` 
        });
      } else {
        checks.push({ 
          name: 'Hub connection', 
          status: 'fail', 
          message: `Hub returned HTTP ${response.status}` 
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      checks.push({ 
        name: 'Hub connection', 
        status: 'fail', 
        message: `Hub unreachable: ${msg}` 
      });
    }
  } else if (options.offline) {
    checks.push({ 
      name: 'Hub connection', 
      status: 'skip', 
      message: 'Skipped (--offline mode)' 
    });
  } else {
    checks.push({ 
      name: 'Hub connection', 
      status: 'skip', 
      message: 'No hubUrl in config' 
    });
  }
  
  // Check 6: Git hooks installed
  const hookPath = path.join(process.cwd(), '.git', 'hooks', 'post-commit');
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf-8');
    if (content.includes('AI Agent Monitor')) {
      checks.push({ 
        name: 'Git hooks', 
        status: 'pass', 
        message: 'AI agents git hooks installed' 
      });
    } else {
      checks.push({ 
        name: 'Git hooks', 
        status: 'skip', 
        message: 'post-commit hook exists but not for ai-agents' 
      });
    }
  } else {
    checks.push({ 
      name: 'Git hooks', 
      status: 'skip', 
      message: 'Git hooks not installed (run: npx ai-agents hooks install)' 
    });
  }
  
  // Print results
  console.log('\n=== AI Agents Setup Verification ===\n');
  let allPassed = true;
  for (const check of checks) {
    const icon = check.status === 'pass' ? '[OK]  ' : check.status === 'fail' ? '[FAIL]' : '[SKIP]';
    console.log(`${icon} ${check.name}: ${check.message}`);
    if (options.verbose && check.details) {
      console.log(`       Details: ${check.details}`);
    }
    if (check.status === 'fail') allPassed = false;
  }
  
  const failCount = checks.filter(c => c.status === 'fail').length;
  const passCount = checks.filter(c => c.status === 'pass').length;
  const skipCount = checks.filter(c => c.status === 'skip').length;
  
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  console.log(allPassed ? 'Setup is complete!' : `${failCount} check(s) need attention.`);
  
  return { success: allPassed, exitCode: allPassed ? 0 : 1 };
}

async function runInit(options: InitProjectOptions): Promise<CommandResult> {
  console.log("\n=== AI Coding Agents Project Initialization ===\n");
  console.log(`Framework: ${options.framework}`);
  console.log(`ORM: ${options.orm}`);
  console.log(`Path: ${options.projectPath}`);
  if (options.writeStorage) console.log(`Write Storage: enabled`);
  
  try {
    const result = await initProject({
      framework: options.framework,
      orm: options.orm,
      projectPath: options.projectPath,
      projectId: options.projectId,
      hubUrl: options.hubUrl,
      writeStorage: options.writeStorage,
      force: options.force
    });
    
    if (!result.success) {
      console.error("\nInitialization failed:");
      result.errors.forEach(err => console.error(`  - ${err}`));
      return { success: false, exitCode: 1 };
    }
    
    if (result.filesCreated.length > 0) {
      console.log("\nFiles created:");
      result.filesCreated.forEach(f => console.log(`  + ${f}`));
    }
    
    if (result.filesModified.length > 0) {
      console.log("\nFiles modified:");
      result.filesModified.forEach(f => console.log(`  ~ ${f}`));
    }
    
    if (result.instructions.length > 0) {
      console.log("\n=== Next Steps ===");
      result.instructions.forEach(i => console.log(i));
    }
    
    console.log("\n=== Initialization Complete ===\n");
    return { success: true, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Initialization failed: ${message}`);
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
  hooks <action>             Manage git hooks (install/uninstall/status)
  init                       Initialize project for agent reporting
  verify                     Verify project setup is correct
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

Options for 'hooks':
  install                    Install git hooks for ML reporting
  uninstall                  Remove ai-agents git hooks
  status                     Show current hook status

Options for 'init':
  --framework <type>         Framework: express (default), fastify, koa, hono
  --orm <type>               ORM: drizzle (default), prisma, none
  --path <dir>               Project path (default: current directory)
  --project-id <id>          Project identifier (default: directory name)
  --hub-url <url>            Hub server URL (default: http://localhost:5000)
  --write-storage            Generate server/agent-storage.ts scaffold
  --force                    Overwrite existing files without prompting

Options for 'verify':
  --offline                  Skip hub connection check
  --verbose                  Show detailed output for each check

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
  ai-agents hooks install
  ai-agents hooks status
  ai-agents init --framework express --orm drizzle --hub-url https://my-hub.replit.app
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
  
  if (command === "hooks") {
    const action = args[1];
    
    if (!action || !["install", "uninstall", "status"].includes(action)) {
      console.error("Error: hooks requires action: install, uninstall, or status");
      return { success: false, exitCode: 1 };
    }
    
    return manageHooks({ action: action as "install" | "uninstall" | "status" });
  }
  
  if (command === "init") {
    let framework: InitProjectOptions['framework'] = 'express';
    let orm: InitProjectOptions['orm'] = 'drizzle';
    let projectPath = process.cwd();
    let projectId: string | undefined;
    let hubUrl: string | undefined;
    let writeStorage = false;
    let force = false;
    
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--framework" && args[i + 1]) {
        framework = args[i + 1] as InitProjectOptions['framework'];
        i++;
      } else if (args[i] === "--orm" && args[i + 1]) {
        orm = args[i + 1] as InitProjectOptions['orm'];
        i++;
      } else if (args[i] === "--path" && args[i + 1]) {
        projectPath = args[i + 1];
        i++;
      } else if (args[i] === "--project-id" && args[i + 1]) {
        projectId = args[i + 1];
        i++;
      } else if (args[i] === "--hub-url" && args[i + 1]) {
        hubUrl = args[i + 1];
        i++;
      } else if (args[i] === "--write-storage") {
        writeStorage = true;
      } else if (args[i] === "--force") {
        force = true;
      }
    }
    
    return runInit({ framework, orm, projectPath, projectId, hubUrl, writeStorage, force });
  }
  
  if (command === "verify") {
    let offline = false;
    let verbose = false;
    
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--offline") {
        offline = true;
      } else if (args[i] === "--verbose") {
        verbose = true;
      }
    }
    
    return runVerify({ offline, verbose });
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
