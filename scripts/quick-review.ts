#!/usr/bin/env npx tsx
import { quickReview } from "./workflows";

const task = process.argv.slice(2).join(" ");

if (!task) {
  console.log("Usage: npx tsx scripts/quick-review.ts <task>");
  console.log('Example: npx tsx scripts/quick-review.ts "Design a REST API for user management"');
  process.exit(1);
}

console.log("\n[Quick Review] Architect + Mechanic\n");
console.log("Task:", task, "\n");

quickReview(task)
  .then((result) => {
    console.log("\n=== ARCHITECT BLUEPRINT ===");
    console.log("Recommendation:", result.blueprint.response.recommendation);
    console.log("\nAlternatives:", result.blueprint.response.alternatives);
    console.log("\nValidations:", result.blueprint.response.validations);

    console.log("\n=== MECHANIC FIXES ===");
    console.log("Recommendation:", result.fixes.response.recommendation);
    console.log("\nValidations:", result.fixes.response.validations);
  })
  .catch(console.error);
