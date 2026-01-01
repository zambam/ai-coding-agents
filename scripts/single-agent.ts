#!/usr/bin/env npx tsx
import { architectOnly, ninjaOnly, mechanicOnly, philosopherOnly } from "./workflows";

const agent = process.argv[2];
const task = process.argv.slice(3).join(" ");

if (!agent || !task) {
  console.log("Usage: npx tsx scripts/single-agent.ts <agent> <task>");
  console.log("\nAgents:");
  console.log("  architect   - Design and architecture");
  console.log("  ninja       - Fast implementation");
  console.log("  mechanic    - Debug and fix");
  console.log("  philosopher - Meta-analysis and evaluation");
  console.log('\nExample: npx tsx scripts/single-agent.ts architect "Design a caching layer"');
  process.exit(1);
}

const agentFns: Record<string, (task: string) => Promise<any>> = {
  architect: architectOnly,
  ninja: ninjaOnly,
  mechanic: mechanicOnly,
  philosopher: philosopherOnly,
};

const fn = agentFns[agent.toLowerCase()];

if (!fn) {
  console.error(`Unknown agent: ${agent}`);
  console.log("Available agents: architect, ninja, mechanic, philosopher");
  process.exit(1);
}

console.log(`\n[Single Agent] ${agent}\n`);
console.log("Task:", task, "\n");

fn(task)
  .then((result) => {
    console.log("\n=== RESULT ===");
    console.log("Recommendation:", result.response.recommendation);
    console.log("\nAlternatives:", result.response.alternatives);
    console.log("\nValidations:", result.response.validations);
  })
  .catch(console.error);
