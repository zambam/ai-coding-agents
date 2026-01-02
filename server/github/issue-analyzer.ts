import { Architect, Mechanic, Philosopher } from "../agents/personas";
import { DEFAULT_AGENT_CONFIG } from "@shared/schema";
import { fetchIssue, postIssueComment, type IssueInfo } from "./client";

export interface IssueAnalysisResult {
  issueInfo: IssueInfo;
  classification: IssueClassification;
  rootCauseAnalysis: string;
  suggestedSolution: string;
  implementationPlan: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: string;
  posted: boolean;
}

export interface IssueClassification {
  type: "bug" | "feature" | "enhancement" | "question" | "documentation" | "unknown";
  complexity: "simple" | "moderate" | "complex";
  affectedAreas: string[];
}

const ANALYSIS_CONFIG = {
  ...DEFAULT_AGENT_CONFIG,
  validationLevel: "medium" as const,
  maxTokens: 2048,
};

export async function analyzeIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  postComment: boolean = false
): Promise<IssueAnalysisResult> {
  console.log(`\n[Issue Analysis] Fetching issue #${issueNumber} from ${owner}/${repo}...`);
  const issueInfo = await fetchIssue(owner, repo, issueNumber);

  console.log(`[Issue Analysis] Analyzing "${issueInfo.title}" by @${issueInfo.author}`);
  console.log(`[Issue Analysis] Labels: ${issueInfo.labels.join(", ") || "none"}`);

  const philosopher = new Philosopher(ANALYSIS_CONFIG);
  const architect = new Architect(ANALYSIS_CONFIG);
  const mechanic = new Mechanic(ANALYSIS_CONFIG);

  const commentsContext = formatCommentsContext(issueInfo);

  console.log("[Call 1] PHILOSOPHER: Understanding issue context...");
  const philosopherPrompt = `Analyze this GitHub issue to understand its true nature:

**Issue Title:** ${issueInfo.title}
**Author:** @${issueInfo.author}
**Labels:** ${issueInfo.labels.join(", ") || "none"}

**Description:**
${issueInfo.body || "No description provided"}

${commentsContext}

Determine:
1. Issue type (bug, feature, enhancement, question, documentation)
2. Complexity level (simple, moderate, complex)
3. Affected areas of the system
4. Priority recommendation (critical, high, medium, low)
5. Key concerns or pain points

Keep response under 300 words.`;

  const philosopherResult = await philosopher.invoke(philosopherPrompt);
  const philosopherAnalysis = philosopherResult.response.recommendation;
  const classification = extractClassification(philosopherAnalysis, issueInfo.labels);
  const priority = extractPriority(philosopherAnalysis, issueInfo.labels);

  console.log("[Call 2] MECHANIC: Root cause analysis...");
  const mechanicPrompt = `Perform root cause analysis on this issue:

**Issue:** ${issueInfo.title}
**Type:** ${classification.type}
**Complexity:** ${classification.complexity}

**Context:**
${issueInfo.body || "No description"}

**Philosopher's Understanding:**
${philosopherAnalysis}

Provide:
1. Likely root cause(s)
2. Technical investigation steps
3. What might be going wrong
4. Quick debugging approach

Keep response under 400 words.`;

  const mechanicResult = await mechanic.invoke(mechanicPrompt);
  const rootCauseAnalysis = mechanicResult.response.recommendation;

  console.log("[Call 3] ARCHITECT: Solution and implementation plan...");
  const architectPrompt = `Design a solution for this issue:

**Issue:** ${issueInfo.title}
**Type:** ${classification.type}
**Priority:** ${priority}

**Root Cause Analysis:**
${rootCauseAnalysis}

Provide:
1. Suggested solution approach
2. Implementation steps (numbered)
3. Files likely to be modified
4. Testing considerations
5. Estimated effort (hours/days)

Keep response under 500 words.`;

  const architectResult = await architect.invoke(architectPrompt);
  const solutionPlan = architectResult.response.recommendation;

  const suggestedSolution = extractSuggestedSolution(solutionPlan);
  const implementationPlan = solutionPlan;
  const estimatedEffort = extractEffort(solutionPlan);

  let posted = false;
  if (postComment) {
    console.log("[Issue Analysis] Posting analysis to GitHub...");
    const comment = formatGitHubIssueComment(
      classification,
      priority,
      rootCauseAnalysis,
      suggestedSolution,
      estimatedEffort
    );
    await postIssueComment(owner, repo, issueNumber, comment);
    posted = true;
    console.log("[Issue Analysis] Comment posted successfully!");
  }

  console.log(`[Issue Analysis] Complete. Priority: ${priority}, Type: ${classification.type}`);

  return {
    issueInfo,
    classification,
    rootCauseAnalysis,
    suggestedSolution,
    implementationPlan,
    priority,
    estimatedEffort,
    posted,
  };
}

function formatCommentsContext(issueInfo: IssueInfo): string {
  if (issueInfo.comments.length === 0) {
    return "";
  }

  const recentComments = issueInfo.comments.slice(-5);
  return `**Recent Comments:**
${recentComments.map((c) => `@${c.author}: ${c.body.substring(0, 200)}...`).join("\n\n")}`;
}

function extractClassification(analysis: string, labels: string[]): IssueClassification {
  const lower = analysis.toLowerCase();
  const labelsLower = labels.map((l) => l.toLowerCase());

  let type: IssueClassification["type"] = "unknown";
  if (lower.includes("bug") || labelsLower.some((l) => l.includes("bug"))) {
    type = "bug";
  } else if (lower.includes("feature") || labelsLower.some((l) => l.includes("feature"))) {
    type = "feature";
  } else if (lower.includes("enhancement") || labelsLower.some((l) => l.includes("enhancement"))) {
    type = "enhancement";
  } else if (lower.includes("question") || labelsLower.some((l) => l.includes("question"))) {
    type = "question";
  } else if (lower.includes("documentation") || lower.includes("docs")) {
    type = "documentation";
  }

  let complexity: IssueClassification["complexity"] = "moderate";
  if (lower.includes("simple") || lower.includes("trivial") || lower.includes("easy")) {
    complexity = "simple";
  } else if (lower.includes("complex") || lower.includes("difficult") || lower.includes("major")) {
    complexity = "complex";
  }

  const areaPatterns = [
    /affect(?:s|ed|ing)?\s+(?:the\s+)?(\w+(?:\s+\w+)?)/gi,
    /(\w+)\s+(?:component|module|service|system)/gi,
  ];

  const affectedAreas: string[] = [];
  for (const pattern of areaPatterns) {
    let match;
    while ((match = pattern.exec(analysis)) !== null) {
      if (match[1] && match[1].length > 2) {
        affectedAreas.push(match[1].trim());
      }
    }
  }

  const uniqueAreas = affectedAreas.filter((v, i, a) => a.indexOf(v) === i);

  return {
    type,
    complexity,
    affectedAreas: uniqueAreas.slice(0, 5),
  };
}

function extractPriority(analysis: string, labels: string[]): IssueAnalysisResult["priority"] {
  const lower = analysis.toLowerCase();
  const labelsLower = labels.map((l) => l.toLowerCase());

  if (lower.includes("critical") || labelsLower.some((l) => l.includes("critical"))) {
    return "critical";
  }
  if (lower.includes("high priority") || lower.includes("urgent") || labelsLower.some((l) => l.includes("high"))) {
    return "high";
  }
  if (lower.includes("low priority") || lower.includes("nice to have") || labelsLower.some((l) => l.includes("low"))) {
    return "low";
  }
  return "medium";
}

function extractSuggestedSolution(plan: string): string {
  const lines = plan.split("\n");
  const solutionStart = lines.findIndex((l) =>
    l.toLowerCase().includes("solution") || l.toLowerCase().includes("approach")
  );

  if (solutionStart >= 0) {
    return lines.slice(solutionStart, solutionStart + 5).join("\n");
  }

  return lines.slice(0, 3).join("\n");
}

function extractEffort(plan: string): string {
  const effortMatch = plan.match(/(\d+(?:-\d+)?)\s*(hour|day|week|minute)/i);
  if (effortMatch) {
    return `${effortMatch[1]} ${effortMatch[2]}(s)`;
  }
  return "2-4 hours";
}

function formatGitHubIssueComment(
  classification: IssueClassification,
  priority: IssueAnalysisResult["priority"],
  rootCause: string,
  solution: string,
  effort: string
): string {
  const priorityEmoji = {
    critical: "rotating_light",
    high: "exclamation",
    medium: "large_blue_diamond",
    low: "small_blue_diamond",
  }[priority];

  return `## :robot: AI Issue Analysis

:${priorityEmoji}: **Priority:** ${priority.charAt(0).toUpperCase() + priority.slice(1)}
:bookmark: **Type:** ${classification.type}
:chart_with_upwards_trend: **Complexity:** ${classification.complexity}
:clock3: **Estimated Effort:** ${effort}

### Root Cause Analysis
${rootCause.substring(0, 500)}${rootCause.length > 500 ? "..." : ""}

### Suggested Solution
${solution}

---
*Automated analysis by AI Coding Agents*`;
}

export function formatIssueAnalysisOutput(result: IssueAnalysisResult): string {
  return `# Issue Analysis Results

**Repository:** ${result.issueInfo.owner}/${result.issueInfo.repo}
**Issue #${result.issueInfo.number}:** ${result.issueInfo.title}
**Author:** @${result.issueInfo.author}
**Type:** ${result.classification.type}
**Complexity:** ${result.classification.complexity}
**Priority:** ${result.priority}
**Estimated Effort:** ${result.estimatedEffort}
**Comment Posted:** ${result.posted ? "Yes" : "No"}

---

## Root Cause Analysis
${result.rootCauseAnalysis}

---

## Suggested Solution
${result.suggestedSolution}

---

## Implementation Plan
${result.implementationPlan}
`;
}
