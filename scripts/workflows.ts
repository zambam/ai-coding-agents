import { Orchestrator } from "../server/agents/orchestrator";
import { Architect, Mechanic, CodeNinja, Philosopher } from "../server/agents/personas";
import { DEFAULT_AGENT_CONFIG } from "../shared/schema";

export const RELAXED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "low" as const,
  maxTokens: 2048,
  temperature: 0.7,
};

export const STRICT_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "strict" as const,
  enablePhilosopher: true,
  enableSelfCritique: true,
};

export const OPTIMIZED_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  maxTokens: 2048,
  temperature: 0.6,
  enablePhilosopher: false,
  validationLevel: "low" as const,
};

export function ensureApiKey(): void {
  const key = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY required");
}

export async function quickReview(task: string) {
  ensureApiKey();

  const architect = new Architect(RELAXED_CONFIG);
  const blueprint = await architect.invoke(task);

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const fixes = await mechanic.invoke("Check for issues: " + blueprint.response.recommendation);

  return { blueprint, fixes };
}

export async function quickImplement(task: string) {
  ensureApiKey();

  const ninja = new CodeNinja(RELAXED_CONFIG);
  const code = await ninja.invoke(task);

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const optimized = await mechanic.invoke("Optimize and document: " + code.response.recommendation);

  return { code, optimized };
}

export async function fullPipeline(task: string) {
  ensureApiKey();
  const orchestrator = new Orchestrator(STRICT_CONFIG);
  return orchestrator.runPipeline(task);
}

export async function multiStepReview(task: string, steps: number = 3) {
  ensureApiKey();
  const orchestrator = new Orchestrator(OPTIMIZED_CONFIG);

  let blueprint = await orchestrator.invokeAgent("architect", task);

  for (let i = 1; i < steps; i++) {
    const fixes = await orchestrator.invokeAgent(
      "mechanic",
      `Iteration ${i}: Refine and fix: ${blueprint.response.recommendation}`
    );

    blueprint = await orchestrator.invokeAgent(
      "architect",
      `Incorporate fixes: ${fixes.response.recommendation}`
    );
  }

  return blueprint;
}

export async function codeReview(code: string) {
  ensureApiKey();

  const mechanic = new Mechanic(RELAXED_CONFIG);
  const analysis = await mechanic.invoke(
    `Review this code for bugs, security issues, and improvements:\n\n${code}`
  );

  const philosopher = new Philosopher(RELAXED_CONFIG);
  const meta = await philosopher.invoke(
    `Evaluate code quality and architectural decisions:\n\n${code}`
  );

  return { analysis, meta };
}

export async function diagnose(errorDescription: string, context?: string) {
  ensureApiKey();
  const mechanic = new Mechanic(RELAXED_CONFIG);
  return mechanic.diagnose(errorDescription, context || "");
}

export async function architectOnly(task: string) {
  ensureApiKey();
  const architect = new Architect(RELAXED_CONFIG);
  return architect.design(task);
}

export async function ninjaOnly(task: string) {
  ensureApiKey();
  const ninja = new CodeNinja(RELAXED_CONFIG);
  return ninja.implement(task, []);
}

export async function mechanicOnly(task: string) {
  ensureApiKey();
  const mechanic = new Mechanic(RELAXED_CONFIG);
  return mechanic.invoke(task);
}

export async function philosopherOnly(task: string) {
  ensureApiKey();
  const philosopher = new Philosopher(RELAXED_CONFIG);
  return philosopher.invoke(task);
}
