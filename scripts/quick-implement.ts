#!/usr/bin/env npx tsx
import { quickImplement } from "./workflows";

const task = process.argv.slice(2).join(" ");

if (!task) {
  console.log("Usage: npx tsx scripts/quick-implement.ts <task>");
  console.log('Example: npx tsx scripts/quick-implement.ts "Create a function to validate email addresses"');
  process.exit(1);
}

console.log("\n[Quick Implement] Code Ninja + Mechanic\n");
console.log("Task:", task, "\n");

quickImplement(task)
  .then((result) => {
    console.log("\n=== CODE NINJA OUTPUT ===");
    console.log("Code:", result.code.response.recommendation);
    console.log("\nValidations:", result.code.response.validations);

    console.log("\n=== MECHANIC OPTIMIZED ===");
    console.log("Optimized:", result.optimized.response.recommendation);
    console.log("\nValidations:", result.optimized.response.validations);
  })
  .catch(console.error);
