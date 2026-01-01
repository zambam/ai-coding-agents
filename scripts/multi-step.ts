#!/usr/bin/env npx tsx
import { multiStepReview } from "./workflows";

const args = process.argv.slice(2);
let steps = 3;
let task = "";

if (args[0] === "--steps" && args[1]) {
  steps = parseInt(args[1], 10);
  task = args.slice(2).join(" ");
} else {
  task = args.join(" ");
}

if (!task) {
  console.log("Usage: npx tsx scripts/multi-step.ts [--steps N] <task>");
  console.log('Example: npx tsx scripts/multi-step.ts --steps 5 "Design a scalable microservices architecture"');
  process.exit(1);
}

console.log(`\n[Multi-Step Review] ${steps} iterations\n`);
console.log("Task:", task, "\n");

multiStepReview(task, steps)
  .then((result) => {
    console.log("\n=== FINAL RESULT ===");
    console.log("Recommendation:", result.response.recommendation);
    console.log("\nAlternatives:", result.response.alternatives);
    console.log("\nValidations:", result.response.validations);
  })
  .catch(console.error);
