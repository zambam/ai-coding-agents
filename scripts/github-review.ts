#!/usr/bin/env npx tsx
import { reviewPullRequest, formatPRReviewOutput } from "../server/github/pr-reviewer";
import { analyzeIssue, formatIssueAnalysisOutput } from "../server/github/issue-analyzer";
import { listRepositoryPRs, listRepositoryIssues } from "../server/github/client";
import * as fs from "fs";
import * as path from "path";

function parseRepoUrl(url: string): { owner: string; repo: string; type: "pr" | "issue"; number: number } | null {
  const prMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (prMatch) {
    return { owner: prMatch[1], repo: prMatch[2], type: "pr", number: parseInt(prMatch[3], 10) };
  }

  const issueMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
  if (issueMatch) {
    return { owner: issueMatch[1], repo: issueMatch[2], type: "issue", number: parseInt(issueMatch[3], 10) };
  }

  return null;
}

function saveOutput(type: string, owner: string, repo: string, number: number, content: string): string {
  const outputDir = path.join(process.cwd(), "review_output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${type}-${owner}-${repo}-${number}-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, content);
  return filepath;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log("GitHub Review CLI\n");
    console.log("Usage:");
    console.log("  npx tsx scripts/github-review.ts pr <owner/repo#number> [--post]");
    console.log("  npx tsx scripts/github-review.ts pr <github-url> [--post]");
    console.log("  npx tsx scripts/github-review.ts issue <owner/repo#number> [--post]");
    console.log("  npx tsx scripts/github-review.ts issue <github-url> [--post]");
    console.log("  npx tsx scripts/github-review.ts list-prs <owner/repo>");
    console.log("  npx tsx scripts/github-review.ts list-issues <owner/repo>\n");
    console.log("Examples:");
    console.log('  npx tsx scripts/github-review.ts pr facebook/react#12345');
    console.log('  npx tsx scripts/github-review.ts pr https://github.com/facebook/react/pull/12345 --post');
    console.log('  npx tsx scripts/github-review.ts issue vercel/next.js#54321');
    console.log('  npx tsx scripts/github-review.ts list-prs vercel/next.js');
    process.exit(0);
  }

  const target = args[1];
  const postComment = args.includes("--post");

  switch (command) {
    case "pr": {
      if (!target) {
        console.error("Error: PR target required (owner/repo#number or URL)");
        process.exit(1);
      }

      let owner: string, repo: string, prNumber: number;

      if (target.includes("github.com")) {
        const parsed = parseRepoUrl(target);
        if (!parsed || parsed.type !== "pr") {
          console.error("Error: Invalid GitHub PR URL");
          process.exit(1);
        }
        owner = parsed.owner;
        repo = parsed.repo;
        prNumber = parsed.number;
      } else {
        const match = target.match(/([^\/]+)\/([^#]+)#(\d+)/);
        if (!match) {
          console.error("Error: Invalid format. Use owner/repo#number");
          process.exit(1);
        }
        owner = match[1];
        repo = match[2];
        prNumber = parseInt(match[3], 10);
      }

      console.log(`\nReviewing PR #${prNumber} in ${owner}/${repo}...`);
      if (postComment) {
        console.log("(Will post comment to GitHub)");
      }

      const result = await reviewPullRequest(owner, repo, prNumber, postComment);
      const formatted = formatPRReviewOutput(result);

      console.log("\n" + formatted);

      const outputPath = saveOutput("pr", owner, repo, prNumber, formatted);
      console.log(`\nOutput saved to: ${outputPath}`);
      break;
    }

    case "issue": {
      if (!target) {
        console.error("Error: Issue target required (owner/repo#number or URL)");
        process.exit(1);
      }

      let owner: string, repo: string, issueNumber: number;

      if (target.includes("github.com")) {
        const parsed = parseRepoUrl(target);
        if (!parsed || parsed.type !== "issue") {
          console.error("Error: Invalid GitHub issue URL");
          process.exit(1);
        }
        owner = parsed.owner;
        repo = parsed.repo;
        issueNumber = parsed.number;
      } else {
        const match = target.match(/([^\/]+)\/([^#]+)#(\d+)/);
        if (!match) {
          console.error("Error: Invalid format. Use owner/repo#number");
          process.exit(1);
        }
        owner = match[1];
        repo = match[2];
        issueNumber = parseInt(match[3], 10);
      }

      console.log(`\nAnalyzing issue #${issueNumber} in ${owner}/${repo}...`);
      if (postComment) {
        console.log("(Will post analysis to GitHub)");
      }

      const result = await analyzeIssue(owner, repo, issueNumber, postComment);
      const formatted = formatIssueAnalysisOutput(result);

      console.log("\n" + formatted);

      const outputPath = saveOutput("issue", owner, repo, issueNumber, formatted);
      console.log(`\nOutput saved to: ${outputPath}`);
      break;
    }

    case "list-prs": {
      if (!target) {
        console.error("Error: Repository required (owner/repo)");
        process.exit(1);
      }

      const [owner, repo] = target.split("/");
      if (!owner || !repo) {
        console.error("Error: Invalid format. Use owner/repo");
        process.exit(1);
      }

      console.log(`\nFetching open PRs for ${owner}/${repo}...`);
      const prs = await listRepositoryPRs(owner, repo, "open");

      if (prs.length === 0) {
        console.log("No open PRs found.");
      } else {
        console.log(`\nFound ${prs.length} open PR(s):\n`);
        for (const pr of prs) {
          console.log(`  #${pr.number} - ${pr.title} (@${pr.author})`);
        }
      }
      break;
    }

    case "list-issues": {
      if (!target) {
        console.error("Error: Repository required (owner/repo)");
        process.exit(1);
      }

      const [owner, repo] = target.split("/");
      if (!owner || !repo) {
        console.error("Error: Invalid format. Use owner/repo");
        process.exit(1);
      }

      console.log(`\nFetching open issues for ${owner}/${repo}...`);
      const issues = await listRepositoryIssues(owner, repo, "open");

      if (issues.length === 0) {
        console.log("No open issues found.");
      } else {
        console.log(`\nFound ${issues.length} open issue(s):\n`);
        for (const issue of issues) {
          const labels = issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
          console.log(`  #${issue.number} - ${issue.title} (@${issue.author})${labels}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log("Use: pr, issue, list-prs, or list-issues");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nError:", error instanceof Error ? error.message : error);
  process.exit(1);
});
