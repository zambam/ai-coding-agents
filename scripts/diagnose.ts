#!/usr/bin/env npx tsx
import { diagnose } from "./workflows";

const error = process.argv.slice(2).join(" ");

if (!error) {
  console.log("Usage: npx tsx scripts/diagnose.ts <error description>");
  console.log('Example: npx tsx scripts/diagnose.ts "TypeError: Cannot read property of undefined in auth.js line 42"');
  process.exit(1);
}

console.log("\n[Diagnose] Mechanic debugging\n");
console.log("Error:", error, "\n");

diagnose(error)
  .then((result) => {
    console.log("\n=== DIAGNOSIS ===");
    console.log("Root Cause:", result.response.recommendation);
    console.log("\nSuggested Fixes:", result.response.alternatives);
    console.log("\nValidations:", result.response.validations);
  })
  .catch(console.error);
