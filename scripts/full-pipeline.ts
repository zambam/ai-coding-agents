#!/usr/bin/env npx tsx
import { fullPipeline } from "./workflows";

const task = process.argv.slice(2).join(" ");

if (!task) {
  console.log("Usage: npx tsx scripts/full-pipeline.ts <task>");
  console.log('Example: npx tsx scripts/full-pipeline.ts "Build a user authentication system with JWT"');
  process.exit(1);
}

console.log("\n[Full Pipeline] All 4 Agents\n");
console.log("Task:", task, "\n");

fullPipeline(task)
  .then((result) => {
    console.log("\n=== ARCHITECT BLUEPRINT ===");
    console.log("Recommendation:", result.blueprint.response.recommendation);
    console.log("Alternatives:", result.blueprint.response.alternatives);

    console.log("\n=== CODE NINJA IMPLEMENTATION ===");
    console.log("Recommendation:", result.implementation.response.recommendation);
    console.log("Validations:", result.implementation.response.validations);

    if (result.diagnosis) {
      console.log("\n=== MECHANIC DIAGNOSIS ===");
      console.log("Recommendation:", result.diagnosis.response.recommendation);
    }

    if (result.metaAnalysis) {
      console.log("\n=== PHILOSOPHER META-ANALYSIS ===");
      console.log("Recommendation:", result.metaAnalysis.response.recommendation);
    }
  })
  .catch(console.error);
