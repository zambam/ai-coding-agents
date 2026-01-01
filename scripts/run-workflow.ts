#!/usr/bin/env npx tsx
import { Orchestrator } from "../server/agents/orchestrator";
import { Architect, Mechanic, CodeNinja, Philosopher } from "../server/agents/personas";
import { DEFAULT_AGENT_CONFIG } from "../shared/schema";
import * as readline from "readline";

const RELAXED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "low" as const,
  maxTokens: 2048,
  temperature: 0.7,
};

const STRICT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "strict" as const,
  enablePhilosopher: true,
  enableSelfCritique: true,
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

async function quickReview(task: string) {
  console.log("\n[Quick Review] Architect + Mechanic\n");
  ensureApiKey();

  console.log("Step 1: Architect designing...");
  const architect = new Architect(RELAXED_CONFIG);
  const blueprint = await architect.invoke(task);
  console.log("  Recommendation:", blueprint.response.recommendation.slice(0, 200) + "...\n");

  console.log("Step 2: Mechanic checking for issues...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const fixes = await mechanic.invoke("Check for issues: " + blueprint.response.recommendation);
  console.log("  Fixes:", fixes.response.recommendation.slice(0, 200) + "...\n");

  return { blueprint, fixes };
}

async function quickImplement(task: string) {
  console.log("\n[Quick Implement] Code Ninja + Mechanic\n");
  ensureApiKey();

  console.log("Step 1: Code Ninja implementing...");
  const ninja = new CodeNinja(RELAXED_CONFIG);
  const code = await ninja.invoke(task);
  console.log("  Code:", code.response.recommendation.slice(0, 200) + "...\n");

  console.log("Step 2: Mechanic optimizing...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const optimized = await mechanic.invoke("Optimize and document: " + code.response.recommendation);
  console.log("  Optimized:", optimized.response.recommendation.slice(0, 200) + "...\n");

  return { code, optimized };
}

async function fullPipeline(task: string) {
  console.log("\n[Full Pipeline] All 4 Agents\n");
  ensureApiKey();
  const orchestrator = new Orchestrator(STRICT_CONFIG);

  console.log("Running full pipeline...");
  const result = await orchestrator.runPipeline(task);

  console.log("\nBlueprint:", result.blueprint.response.recommendation.slice(0, 150) + "...");
  console.log("Implementation:", result.implementation.response.recommendation.slice(0, 150) + "...");
  if (result.diagnosis) {
    console.log("Diagnosis:", result.diagnosis.response.recommendation.slice(0, 150) + "...");
  }
  if (result.metaAnalysis) {
    console.log("Meta-Analysis:", result.metaAnalysis.response.recommendation.slice(0, 150) + "...");
  }

  return result;
}

async function multiStepReview(task: string, steps: number = 3) {
  console.log(`\n[Multi-Step Review] ${steps} iterations\n`);
  ensureApiKey();
  const orchestrator = new Orchestrator(RELAXED_CONFIG);

  console.log("Step 1: Initial Architect design...");
  let blueprint = await orchestrator.invokeAgent("architect", task);
  console.log("  Design complete.\n");

  for (let i = 1; i < steps; i++) {
    console.log(`Step ${i + 1}a: Mechanic refining...`);
    const fixes = await orchestrator.invokeAgent(
      "mechanic",
      `Iteration ${i}: Refine and fix: ${blueprint.response.recommendation}`
    );

    console.log(`Step ${i + 1}b: Architect incorporating fixes...`);
    blueprint = await orchestrator.invokeAgent(
      "architect",
      `Incorporate fixes: ${fixes.response.recommendation}`
    );
    console.log(`  Iteration ${i} complete.\n`);
  }

  console.log("Final recommendation:", blueprint.response.recommendation.slice(0, 300) + "...\n");
  return blueprint;
}

async function codeReview(code: string) {
  console.log("\n[Code Review] Mechanic + Philosopher\n");
  ensureApiKey();

  console.log("Step 1: Mechanic analyzing code...");
  const mechanic = new Mechanic(RELAXED_CONFIG);
  const analysis = await mechanic.invoke(`Review this code for bugs, security issues, and improvements:\n\n${code}`);
  console.log("  Issues found:", analysis.response.validations.failed.length);

  console.log("Step 2: Philosopher meta-analysis...");
  const philosopher = new Philosopher(RELAXED_CONFIG);
  const meta = await philosopher.invoke(`Evaluate code quality and architectural decisions:\n\n${code}`);

  return { analysis, meta };
}

async function diagnose(errorDescription: string, context?: string) {
  console.log("\n[Diagnose] Mechanic debugging\n");
  ensureApiKey();

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const fullPrompt = context
    ? `Error: ${errorDescription}\n\nContext:\n${context}`
    : errorDescription;

  console.log("Diagnosing issue...");
  const diagnosis = await mechanic.diagnose(errorDescription, context || "");

  console.log("\nRoot Cause:", diagnosis.response.recommendation.slice(0, 300) + "...");
  console.log("Suggested Fixes:", diagnosis.response.alternatives.slice(0, 3).join("\n  - "));

  return diagnosis;
}

async function interactive() {
  console.log("\n=== AI Agents Interactive Mode ===\n");
  console.log("Available commands:");
  console.log("  1. quick-review <task>     - Architect + Mechanic review");
  console.log("  2. quick-implement <task>  - Code Ninja + Mechanic");
  console.log("  3. pipeline <task>         - Full 4-agent pipeline");
  console.log("  4. multi-step <task>       - Iterative refinement");
  console.log("  5. diagnose <error>        - Debug an issue");
  console.log("  6. exit                    - Quit\n");

  while (true) {
    const input = await prompt("\n> ");
    const [command, ...rest] = input.trim().split(" ");
    const args = rest.join(" ");

    try {
      switch (command) {
        case "1":
        case "quick-review":
          if (!args) {
            const task = await prompt("Enter task to review: ");
            await quickReview(task);
          } else {
            await quickReview(args);
          }
          break;

        case "2":
        case "quick-implement":
          if (!args) {
            const task = await prompt("Enter task to implement: ");
            await quickImplement(task);
          } else {
            await quickImplement(args);
          }
          break;

        case "3":
        case "pipeline":
          if (!args) {
            const task = await prompt("Enter task for full pipeline: ");
            await fullPipeline(task);
          } else {
            await fullPipeline(args);
          }
          break;

        case "4":
        case "multi-step":
          if (!args) {
            const task = await prompt("Enter task for multi-step review: ");
            await multiStepReview(task);
          } else {
            await multiStepReview(args);
          }
          break;

        case "5":
        case "diagnose":
          if (!args) {
            const error = await prompt("Enter error description: ");
            await diagnose(error);
          } else {
            await diagnose(args);
          }
          break;

        case "6":
        case "exit":
        case "quit":
          console.log("Goodbye!");
          process.exit(0);

        default:
          console.log("Unknown command. Try: quick-review, quick-implement, pipeline, multi-step, diagnose, exit");
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
    }
  }
}

const mode = process.argv[2];
const taskArg = process.argv.slice(3).join(" ");

async function main() {
  switch (mode) {
    case "interactive":
      await interactive();
      break;

    case "quick-review":
      if (!taskArg) {
        console.error("Usage: npx tsx scripts/run-workflow.ts quick-review <task>");
        process.exit(1);
      }
      await quickReview(taskArg);
      break;

    case "quick-implement":
      if (!taskArg) {
        console.error("Usage: npx tsx scripts/run-workflow.ts quick-implement <task>");
        process.exit(1);
      }
      await quickImplement(taskArg);
      break;

    case "pipeline":
      if (!taskArg) {
        console.error("Usage: npx tsx scripts/run-workflow.ts pipeline <task>");
        process.exit(1);
      }
      await fullPipeline(taskArg);
      break;

    case "multi-step":
      if (!taskArg) {
        console.error("Usage: npx tsx scripts/run-workflow.ts multi-step <task>");
        process.exit(1);
      }
      await multiStepReview(taskArg);
      break;

    case "diagnose":
      if (!taskArg) {
        console.error("Usage: npx tsx scripts/run-workflow.ts diagnose <error>");
        process.exit(1);
      }
      await diagnose(taskArg);
      break;

    default:
      console.log("AI Agents Workflow Runner\n");
      console.log("Usage: npx tsx scripts/run-workflow.ts <mode> [task]\n");
      console.log("Modes:");
      console.log("  interactive     - Interactive prompt mode");
      console.log("  quick-review    - Architect + Mechanic (2 agents)");
      console.log("  quick-implement - Code Ninja + Mechanic (2 agents)");
      console.log("  pipeline        - Full 4-agent pipeline");
      console.log("  multi-step      - Iterative refinement (3+ steps)");
      console.log("  diagnose        - Debug an error with Mechanic\n");
      console.log("Examples:");
      console.log('  npx tsx scripts/run-workflow.ts interactive');
      console.log('  npx tsx scripts/run-workflow.ts quick-review "Design a REST API for user management"');
      console.log('  npx tsx scripts/run-workflow.ts pipeline "Build authentication system"');
      process.exit(0);
  }
}

main().catch(console.error);

export { quickReview, quickImplement, fullPipeline, multiStepReview, codeReview, diagnose };
