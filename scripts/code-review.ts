#!/usr/bin/env npx tsx
import { codeReview } from "./workflows";
import * as fs from "fs";

const filePath = process.argv[2];

if (!filePath) {
  console.log("Usage: npx tsx scripts/code-review.ts <file-path>");
  console.log("Example: npx tsx scripts/code-review.ts src/auth.ts");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const code = fs.readFileSync(filePath, "utf-8");

console.log("\n[Code Review] Mechanic + Philosopher\n");
console.log("File:", filePath);
console.log("Lines:", code.split("\n").length, "\n");

codeReview(code)
  .then((result) => {
    console.log("\n=== MECHANIC ANALYSIS ===");
    console.log("Issues:", result.analysis.response.recommendation);
    console.log("\nPassed:", result.analysis.response.validations.passed);
    console.log("Failed:", result.analysis.response.validations.failed);

    console.log("\n=== PHILOSOPHER META-REVIEW ===");
    console.log("Evaluation:", result.meta.response.recommendation);
  })
  .catch(console.error);
