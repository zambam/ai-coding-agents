#!/usr/bin/env npx tsx
import { threePassWorkflow } from "./workflows";

const args = process.argv.slice(2);
const task = args.join(" ");

if (!task) {
  console.log("Usage: npx tsx scripts/three-pass.ts <task>");
  console.log('Example: npx tsx scripts/three-pass.ts "Design a rate limiter for API endpoints"');
  process.exit(1);
}

console.log("\n========================================");
console.log("  3-PASS OPTIMIZED WORKFLOW (8 calls)");
console.log("========================================\n");
console.log("Task:", task, "\n");

threePassWorkflow(task)
  .then(({ output, formatted }) => {
    console.log("\n========================================");
    console.log("  WORKFLOW COMPLETE");
    console.log("========================================\n");
    console.log(formatted);
    console.log("\n--- RAW OUTPUT SUMMARY ---");
    console.log("Total AI Calls:", output.totalCalls);
    console.log("Findings:", output.allFindings.length);
    console.log("Conflicts Resolved:", output.allConflicts.length);
    console.log("Adjacents Captured:", output.allAdjacents.length);
    console.log("Status:", output.status);
  })
  .catch((err) => {
    console.error("\nWorkflow failed:", err.message);
    process.exit(1);
  });
