#!/usr/bin/env npx tsx
import { Orchestrator } from "../server/agents/orchestrator";
import { Architect, Mechanic, CodeNinja, Philosopher } from "../server/agents/personas";
import { ThreePassWorkflow } from "../server/agents/three-pass-workflow";
import { DEFAULT_AGENT_CONFIG } from "../shared/schema";
import { buildContextPrompt, extractFilePaths, loadTaskContext, validateContextLoaded } from "./file-context-loader";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const RELAXED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "low" as const,
  maxTokens: 4096,
  temperature: 0.7,
};

const STRICT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "strict" as const,
  maxTokens: 4096,
  enablePhilosopher: true,
  enableSelfCritique: true,
};

const THREE_PASS_WORKFLOW_CONFIG = {
  philosopherTriggerThreshold: 0.15,
  autoMergeSimpleConflicts: true,
  storeAdjacentsInML: true,
  documentAdjacentsInOutput: true,
};

function ensureApiKey(): void {
  const key = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY required");
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function saveReviewOutput(mode: string, task: string, result: any): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const taskSlug = task.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const filename = `${taskSlug}-${mode}-${timestamp}.md`;
  const outputDir = "docs/reviews";
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, filename);
  
  let content = `# AI Workflow Review\n\n`;
  content += `**Mode:** ${mode}\n`;
  content += `**Task:** ${task}\n`;
  content += `**Date:** ${new Date().toISOString()}\n`;
  content += `**Files Loaded:** ${extractFilePaths(task).length}\n\n`;
  content += `---\n\n`;
  
  if (result.response) {
    content += `## Recommendation\n\n${result.response.recommendation}\n\n`;
    if (result.response.reasoning?.length) {
      content += `## Reasoning\n\n`;
      for (const step of result.response.reasoning) {
        content += `- **${step.step}**: ${step.thought}\n`;
      }
      content += `\n`;
    }
    if (result.response.alternatives?.length) {
      content += `## Alternatives\n\n`;
      for (const alt of result.response.alternatives) {
        content += `- ${alt}\n`;
      }
      content += `\n`;
    }
  } else if (typeof result === "object") {
    content += `## Result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`;
  } else {
    content += `## Result\n\n${result}\n`;
  }
  
  fs.writeFileSync(outputPath, content);
  return outputPath;
}

async function quickReview(task: string, additionalFiles: string[] = []) {
  console.log("\n[Quick Review] Architect + Mechanic\n");
  ensureApiKey();

  const contextTask = buildContextPrompt(task, additionalFiles, true);
  
  console.log("Step 1: Architect designing...");
  const architect = new Architect(RELAXED_CONFIG);
  const blueprint = await architect.invoke(contextTask);
  console.log("  Design complete.\n");

  console.log("Step 2: Mechanic checking for issues...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const fixes = await mechanic.invoke("Analyze this design for issues and improvements:\n\n" + blueprint.response.recommendation);
  console.log("  Analysis complete.\n");

  const outputPath = saveReviewOutput("quick-review", task, blueprint);
  console.log(`Output saved to: ${outputPath}\n`);

  return { blueprint, fixes };
}

async function quickImplement(task: string, additionalFiles: string[] = []) {
  console.log("\n[Quick Implement] Code Ninja + Mechanic\n");
  ensureApiKey();

  const contextTask = buildContextPrompt(task, additionalFiles, true);

  console.log("Step 1: Code Ninja implementing...");
  const ninja = new CodeNinja(RELAXED_CONFIG);
  const code = await ninja.invoke(contextTask);
  console.log("  Implementation complete.\n");

  console.log("Step 2: Mechanic optimizing...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const optimized = await mechanic.invoke("Optimize and document this code:\n\n" + code.response.recommendation);
  console.log("  Optimization complete.\n");

  const outputPath = saveReviewOutput("quick-implement", task, code);
  console.log(`Output saved to: ${outputPath}\n`);

  return { code, optimized };
}

async function fullPipeline(task: string, additionalFiles: string[] = []) {
  console.log("\n[Full Pipeline] All 4 Agents\n");
  ensureApiKey();
  
  const contextTask = buildContextPrompt(task, additionalFiles, true);
  const orchestrator = new Orchestrator(STRICT_CONFIG);

  console.log("Running full pipeline...");
  const result = await orchestrator.runPipeline(contextTask);

  console.log("\nPipeline complete.");
  const outputPath = saveReviewOutput("pipeline", task, result.blueprint);
  console.log(`Output saved to: ${outputPath}\n`);

  return result;
}

async function multiStepReview(task: string, additionalFiles: string[] = [], steps: number = 3) {
  console.log(`\n[Multi-Step Review] ${steps} iterations\n`);
  ensureApiKey();
  
  const contextTask = buildContextPrompt(task, additionalFiles, true);
  const orchestrator = new Orchestrator(RELAXED_CONFIG);

  console.log("Step 1: Initial Architect design...");
  let blueprint = await orchestrator.invokeAgent("architect", contextTask);
  console.log("  Initial design complete.\n");

  for (let i = 1; i < steps; i++) {
    console.log(`Step ${i + 1}a: Mechanic analyzing...`);
    const fixes = await orchestrator.invokeAgent(
      "mechanic",
      `Iteration ${i}: Analyze and improve. Reference original task requirements.\n\n${blueprint.response.recommendation}`
    );

    console.log(`Step ${i + 1}b: Architect incorporating...`);
    blueprint = await orchestrator.invokeAgent(
      "architect",
      `Incorporate improvements while maintaining alignment with original requirements:\n\n${fixes.response.recommendation}`
    );
    console.log(`  Iteration ${i} complete.\n`);
  }

  const outputPath = saveReviewOutput("multi-step", task, blueprint);
  console.log(`Output saved to: ${outputPath}\n`);
  
  return blueprint;
}

async function codeReview(filePath: string) {
  console.log("\n[Code Review] Mechanic + Philosopher\n");
  ensureApiKey();

  const contextTask = buildContextPrompt(`Review this code file for bugs, security issues, and improvements: ${filePath}`, [filePath], true);

  console.log("Step 1: Mechanic analyzing code...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const analysis = await mechanic.invoke(contextTask);
  console.log("  Analysis complete.");

  console.log("Step 2: Philosopher meta-analysis...");
  const philosopher = new Philosopher(RELAXED_CONFIG);
  const meta = await philosopher.invoke(`Evaluate code quality and architectural decisions:\n\n${analysis.response.recommendation}`);
  console.log("  Meta-analysis complete.\n");

  const outputPath = saveReviewOutput("code-review", filePath, analysis);
  console.log(`Output saved to: ${outputPath}\n`);

  return { analysis, meta };
}

async function diagnose(errorDescription: string, contextFiles: string[] = []) {
  console.log("\n[Diagnose] Mechanic debugging\n");
  ensureApiKey();

  const contextTask = buildContextPrompt(errorDescription, contextFiles, false);

  console.log("Diagnosing issue...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const diagnosis = await mechanic.diagnose(contextTask, "");

  console.log("\nDiagnosis complete.");
  const outputPath = saveReviewOutput("diagnose", errorDescription, diagnosis);
  console.log(`Output saved to: ${outputPath}\n`);

  return diagnosis;
}

async function threePass(task: string, additionalFiles: string[] = []) {
  console.log("\n========================================");
  console.log("  3-PASS OPTIMIZED WORKFLOW (8 calls)");
  console.log("========================================\n");
  ensureApiKey();

  const contextTask = buildContextPrompt(task, additionalFiles, true);
  const workflow = new ThreePassWorkflow(RELAXED_CONFIG, THREE_PASS_WORKFLOW_CONFIG);
  
  const output = await workflow.execute(contextTask);
  const formatted = workflow.formatOutput(output);
  
  const outputPath = saveReviewOutput("three-pass", task, { response: { recommendation: formatted } });
  console.log(`\nOutput saved to: ${outputPath}\n`);
  
  return { output, formatted };
}

async function interactive() {
  console.log("\n=== AI Agents Interactive Mode ===\n");
  console.log("Available commands:");
  console.log("  1. quick-review <task>     - Architect + Mechanic review");
  console.log("  2. quick-implement <task>  - Code Ninja + Mechanic");
  console.log("  3. pipeline <task>         - Full 4-agent pipeline");
  console.log("  4. multi-step <task>       - Iterative refinement");
  console.log("  5. three-pass <task>       - 3-Pass optimized workflow (8 calls)");
  console.log("  6. diagnose <error>        - Debug an issue");
  console.log("  7. exit                    - Quit\n");
  console.log("NOTE: Include file paths in your task and they will be auto-loaded.\n");
  console.log("Example: three-pass Design a rate limiter for API endpoints\n");

  while (true) {
    const input = await prompt("\n> ");
    const [command, ...rest] = input.trim().split(" ");
    const args = rest.join(" ");

    try {
      switch (command) {
        case "1":
        case "quick-review":
          if (!args) {
            const task = await prompt("Enter task (include file paths): ");
            await quickReview(task);
          } else {
            await quickReview(args);
          }
          break;

        case "2":
        case "quick-implement":
          if (!args) {
            const task = await prompt("Enter task (include file paths): ");
            await quickImplement(task);
          } else {
            await quickImplement(args);
          }
          break;

        case "3":
        case "pipeline":
          if (!args) {
            const task = await prompt("Enter task (include file paths): ");
            await fullPipeline(task);
          } else {
            await fullPipeline(args);
          }
          break;

        case "4":
        case "multi-step":
          if (!args) {
            const task = await prompt("Enter task (include file paths): ");
            await multiStepReview(task);
          } else {
            await multiStepReview(args);
          }
          break;

        case "5":
        case "three-pass":
          if (!args) {
            const task = await prompt("Enter task (include file paths): ");
            await threePass(task);
          } else {
            await threePass(args);
          }
          break;

        case "6":
        case "diagnose":
          if (!args) {
            const error = await prompt("Enter error description: ");
            await diagnose(error);
          } else {
            await diagnose(args);
          }
          break;

        case "7":
        case "exit":
        case "quit":
          console.log("Goodbye!");
          process.exit(0);

        default:
          console.log("Unknown command. Try: quick-review, quick-implement, pipeline, multi-step, diagnose, exit");
      }
    } catch (error) {
      console.error("\nERROR:", error instanceof Error ? error.message : error);
      console.error("\nThis error means the workflow cannot proceed. Please fix the issue and try again.\n");
    }
  }
}

function parseArgs(): { mode: string; task: string; files: string[]; steps: number } {
  const args = process.argv.slice(2);
  const mode = args[0] || "";
  const files: string[] = [];
  let steps = 3;
  let taskParts: string[] = [];
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--files" && args[i + 1]) {
      files.push(...args[i + 1].split(","));
      i++;
    } else if (args[i] === "--steps" && args[i + 1]) {
      steps = parseInt(args[i + 1], 10) || 3;
      i++;
    } else {
      taskParts.push(args[i]);
    }
  }
  
  return { mode, task: taskParts.join(" "), files, steps };
}

async function main() {
  const { mode, task, files, steps } = parseArgs();
  
  switch (mode) {
    case "interactive":
      await interactive();
      break;

    case "quick-review":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts quick-review <task> [--files file1,file2]");
        console.error("\nExample:");
        console.error('  npx tsx scripts/run-workflow.ts quick-review "Analyze docs/ML_TRAINING.md"');
        process.exit(1);
      }
      await quickReview(task, files);
      break;

    case "quick-implement":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts quick-implement <task> [--files file1,file2]");
        process.exit(1);
      }
      await quickImplement(task, files);
      break;

    case "pipeline":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts pipeline <task> [--files file1,file2]");
        process.exit(1);
      }
      await fullPipeline(task, files);
      break;

    case "multi-step":
    case "multistep":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts multi-step <task> [--files file1,file2] [--steps N]");
        process.exit(1);
      }
      await multiStepReview(task, files, steps);
      break;

    case "code-review":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts code-review <file-path>");
        process.exit(1);
      }
      await codeReview(task);
      break;

    case "diagnose":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts diagnose <error> [--files file1,file2]");
        process.exit(1);
      }
      await diagnose(task, files);
      break;

    case "three-pass":
    case "3-pass":
      if (!task) {
        console.error("Usage: npx tsx scripts/run-workflow.ts three-pass <task> [--files file1,file2]");
        console.error("\nExample:");
        console.error('  npx tsx scripts/run-workflow.ts three-pass "Design a rate limiter for API endpoints"');
        process.exit(1);
      }
      await threePass(task, files);
      break;

    default:
      console.log("AI Agents Workflow Runner\n");
      console.log("Usage: npx tsx scripts/run-workflow.ts <mode> <task> [options]\n");
      console.log("Modes:");
      console.log("  interactive     - Interactive prompt mode");
      console.log("  quick-review    - Architect + Mechanic (2 agents)");
      console.log("  quick-implement - Code Ninja + Mechanic (2 agents)");
      console.log("  pipeline        - Full 4-agent pipeline");
      console.log("  multi-step      - Iterative refinement (3+ steps)");
      console.log("  three-pass      - 3-Pass optimized workflow (8 calls) [NEW]");
      console.log("  code-review     - Review a specific file");
      console.log("  diagnose        - Debug an error with Mechanic\n");
      console.log("Options:");
      console.log("  --files <list>  - Comma-separated list of additional files to load");
      console.log("  --steps <N>     - Number of iterations for multi-step (default: 3)\n");
      console.log("IMPORTANT: Include file paths in your task and they will be auto-loaded.\n");
      console.log("Examples:");
      console.log('  npx tsx scripts/run-workflow.ts three-pass "Design a rate limiter for API endpoints"');
      console.log('  npx tsx scripts/run-workflow.ts quick-review "Analyze docs/PROPOSAL.md for gaps"');
      console.log('  npx tsx scripts/run-workflow.ts multi-step "Review server/routes.ts" --steps 5');
      process.exit(0);
  }
}

main().catch((error) => {
  console.error("\nFATAL ERROR:", error instanceof Error ? error.message : error);
  console.error("\nThe workflow failed. No output was produced.");
  process.exit(1);
});

export { quickReview, quickImplement, fullPipeline, multiStepReview, codeReview, diagnose, threePass };
