import { Orchestrator } from "../server/agents/orchestrator";
import { Architect, Mechanic, CodeNinja, Philosopher } from "../server/agents/personas";
import { DEFAULT_AGENT_CONFIG } from "../shared/schema";
import { buildContextPrompt } from "./file-context-loader";

export const RELAXED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "low" as const,
  maxTokens: 4096,
  temperature: 0.7,
};

export const STRICT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "strict" as const,
  maxTokens: 4096,
  enablePhilosopher: true,
  enableSelfCritique: true,
};

export const OPTIMIZED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  maxTokens: 4096,
  temperature: 0.6,
  enablePhilosopher: false,
  validationLevel: "low" as const,
};

export function ensureApiKey(): void {
  const key = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY required");
}

export async function quickReview(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);

  const architect = new Architect(RELAXED_CONFIG);
  const blueprint = await architect.invoke(contextTask);

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const fixes = await mechanic.invoke("Check for issues in this design:\n\n" + blueprint.response.recommendation);

  return { blueprint, fixes };
}

export async function quickImplement(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);

  const ninja = new CodeNinja(RELAXED_CONFIG);
  const code = await ninja.invoke(contextTask);

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const optimized = await mechanic.invoke("Optimize and document this code:\n\n" + code.response.recommendation);

  return { code, optimized };
}

export async function fullPipeline(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const orchestrator = new Orchestrator(STRICT_CONFIG);
  return orchestrator.runPipeline(contextTask);
}

export async function multiStepReview(task: string, files: string[] = [], steps: number = 3) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const orchestrator = new Orchestrator(OPTIMIZED_CONFIG);

  let blueprint = await orchestrator.invokeAgent("architect", contextTask);

  for (let i = 1; i < steps; i++) {
    const fixes = await orchestrator.invokeAgent(
      "mechanic",
      `Iteration ${i}: Analyze and improve this design. Reference the original requirements.\n\n${blueprint.response.recommendation}`
    );

    blueprint = await orchestrator.invokeAgent(
      "architect",
      `Incorporate these improvements while maintaining alignment with original requirements:\n\n${fixes.response.recommendation}`
    );
  }

  return blueprint;
}

export async function codeReview(code: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(
    `Review this code for bugs, security issues, and improvements:\n\n${code}`,
    files,
    true
  );

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const analysis = await mechanic.invoke(contextTask);

  const philosopher = new Philosopher(RELAXED_CONFIG);
  const meta = await philosopher.invoke(
    `Evaluate code quality and architectural decisions based on this analysis:\n\n${analysis.response.recommendation}`
  );

  return { analysis, meta };
}

export async function diagnose(errorDescription: string, context?: string, files: string[] = []) {
  ensureApiKey();
  const fullPrompt = context
    ? `Error: ${errorDescription}\n\nContext:\n${context}`
    : errorDescription;
  const contextTask = buildContextPrompt(fullPrompt, files, true);
  
  const mechanic = new Mechanic(RELAXED_CONFIG);
  return mechanic.diagnose(contextTask, "");
}

export async function architectOnly(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const architect = new Architect(RELAXED_CONFIG);
  return architect.design(contextTask);
}

export async function ninjaOnly(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const ninja = new CodeNinja(RELAXED_CONFIG);
  return ninja.implement(contextTask, []);
}

export async function mechanicOnly(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const mechanic = new Mechanic(RELAXED_CONFIG);
  return mechanic.invoke(contextTask);
}

export async function philosopherOnly(task: string, files: string[] = []) {
  ensureApiKey();
  const contextTask = buildContextPrompt(task, files, true);
  const philosopher = new Philosopher(RELAXED_CONFIG);
  return philosopher.invoke(contextTask);
}
