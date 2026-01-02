import { Architect, Mechanic, CodeNinja } from "../agents/personas";
import { DEFAULT_AGENT_CONFIG } from "@shared/schema";
import { fetchPullRequest, postPRComment, type PRInfo, type PRFile } from "./client";

export interface PRReviewResult {
  prInfo: PRInfo;
  architectAnalysis: string;
  mechanicValidation: string;
  codeQuality: string;
  summary: string;
  score: number;
  recommendations: string[];
  posted: boolean;
}

const REVIEW_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "medium" as const,
  maxTokens: 2048,
};

export async function reviewPullRequest(
  owner: string,
  repo: string,
  prNumber: number,
  postComment: boolean = false
): Promise<PRReviewResult> {
  console.log(`\n[PR Review] Fetching PR #${prNumber} from ${owner}/${repo}...`);
  const prInfo = await fetchPullRequest(owner, repo, prNumber);

  console.log(`[PR Review] Analyzing "${prInfo.title}" by @${prInfo.author}`);
  console.log(`[PR Review] Files changed: ${prInfo.files.length}`);

  const architect = new Architect(REVIEW_CONFIG);
  const mechanic = new Mechanic(REVIEW_CONFIG);
  const codeNinja = new CodeNinja(REVIEW_CONFIG);

  const filesSummary = formatFilesSummary(prInfo.files);
  const diffPreview = prInfo.diff.substring(0, 8000);

  console.log("[Call 1] ARCHITECT: Analyzing architecture impact...");
  const architectPrompt = `Review this Pull Request for architectural impact:

**PR Title:** ${prInfo.title}
**Author:** @${prInfo.author}
**Description:** ${prInfo.body || "No description provided"}

**Files Changed:**
${filesSummary}

**Diff Preview:**
\`\`\`diff
${diffPreview}
\`\`\`

Analyze:
1. Architectural patterns used (good or concerning)
2. Impact on system design
3. Potential scalability issues
4. Suggested improvements

Keep response under 400 words.`;

  const architectResult = await architect.invoke(architectPrompt);
  const architectAnalysis = architectResult.response.recommendation;

  console.log("[Call 2] MECHANIC: Validating implementation...");
  const mechanicPrompt = `Validate this Pull Request implementation:

**PR Title:** ${prInfo.title}
**Files Changed:**
${filesSummary}

**Architect's Analysis:**
${architectAnalysis}

**Diff:**
\`\`\`diff
${diffPreview}
\`\`\`

Check for:
1. Bugs or logic errors
2. Edge cases not handled
3. Error handling gaps
4. Performance concerns
5. Security issues

Keep response under 400 words.`;

  const mechanicResult = await mechanic.invoke(mechanicPrompt);
  const mechanicValidation = mechanicResult.response.recommendation;

  console.log("[Call 3] CODE NINJA: Evaluating code quality...");
  const ninjaPrompt = `Evaluate code quality for this PR:

**Files Changed:**
${filesSummary}

**Diff:**
\`\`\`diff
${diffPreview}
\`\`\`

Rate (1-10) and comment on:
1. Code readability
2. Naming conventions
3. DRY principles
4. Test coverage (if visible)
5. Documentation

Provide an overall score and top 3 quick wins.`;

  const ninjaResult = await codeNinja.invoke(ninjaPrompt);
  const codeQuality = ninjaResult.response.recommendation;

  const score = extractScore(codeQuality);
  const recommendations = extractRecommendations(
    architectAnalysis,
    mechanicValidation,
    codeQuality
  );

  const summary = generateSummary(prInfo, architectAnalysis, mechanicValidation, codeQuality, score);

  let posted = false;
  if (postComment) {
    console.log("[PR Review] Posting review comment to GitHub...");
    await postPRComment(owner, repo, prNumber, formatGitHubComment(summary, score, recommendations));
    posted = true;
    console.log("[PR Review] Comment posted successfully!");
  }

  console.log(`[PR Review] Complete. Score: ${score}/10`);

  return {
    prInfo,
    architectAnalysis,
    mechanicValidation,
    codeQuality,
    summary,
    score,
    recommendations,
    posted,
  };
}

function formatFilesSummary(files: PRFile[]): string {
  return files
    .map((f) => `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`)
    .join("\n");
}

function extractScore(codeQuality: string): number {
  const scoreMatch = codeQuality.match(/(\d+)\s*\/\s*10|score[:\s]+(\d+)/i);
  if (scoreMatch) {
    return parseInt(scoreMatch[1] || scoreMatch[2], 10);
  }
  return 7;
}

function extractRecommendations(
  architect: string,
  mechanic: string,
  ninja: string
): string[] {
  const recommendations: string[] = [];
  const combined = [architect, mechanic, ninja].join("\n");

  const patterns = [
    /suggest(?:ion)?[:\s]+(.+?)(?:\n|$)/gi,
    /recommend(?:ation)?[:\s]+(.+?)(?:\n|$)/gi,
    /should[:\s]+(.+?)(?:\n|$)/gi,
    /consider[:\s]+(.+?)(?:\n|$)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      if (match[1] && match[1].length > 10 && match[1].length < 200) {
        recommendations.push(match[1].trim());
      }
    }
  }

  return recommendations.slice(0, 5);
}

function generateSummary(
  prInfo: PRInfo,
  architect: string,
  mechanic: string,
  ninja: string,
  score: number
): string {
  return `# AI Code Review: ${prInfo.title}

## Overview
- **Author:** @${prInfo.author}
- **Files Changed:** ${prInfo.files.length}
- **Total Changes:** +${prInfo.files.reduce((s, f) => s + f.additions, 0)} / -${prInfo.files.reduce((s, f) => s + f.deletions, 0)}
- **Quality Score:** ${score}/10

## Architecture Analysis
${architect}

## Implementation Validation
${mechanic}

## Code Quality
${ninja}
`;
}

function formatGitHubComment(summary: string, score: number, recommendations: string[]): string {
  const emoji = score >= 8 ? "white_check_mark" : score >= 6 ? "large_orange_diamond" : "warning";

  return `## :robot: AI Code Review

:${emoji}: **Quality Score: ${score}/10**

${recommendations.length > 0 ? `### Top Recommendations
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : ""}

<details>
<summary>Full Analysis</summary>

${summary}

</details>

---
*Automated review by AI Coding Agents*`;
}

export function formatPRReviewOutput(result: PRReviewResult): string {
  return `# PR Review Results

**Repository:** ${result.prInfo.owner}/${result.prInfo.repo}
**PR #${result.prInfo.number}:** ${result.prInfo.title}
**Author:** @${result.prInfo.author}
**Score:** ${result.score}/10
**Comment Posted:** ${result.posted ? "Yes" : "No"}

---

${result.summary}

---

## Recommendations
${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n") || "No specific recommendations."}
`;
}
