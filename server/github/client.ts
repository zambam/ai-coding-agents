import { Octokit } from "@octokit/rest";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=github",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("GitHub not connected. Please connect your GitHub account in the Replit integrations panel.");
  }
  return accessToken;
}

export async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export interface PRInfo {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  diff: string;
  files: PRFile[];
  author: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface IssueInfo {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  state: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  comments: IssueComment[];
}

export interface IssueComment {
  author: string;
  body: string;
  createdAt: string;
}

export async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRInfo> {
  const octokit = await getGitHubClient();
  const accessToken = await getAccessToken();

  const [pr, files] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: prNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: prNumber }),
  ]);

  const diffResponse = await fetch(pr.data.diff_url, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!diffResponse.ok) {
    console.warn(`Warning: Could not fetch diff (${diffResponse.status}). Using file patches instead.`);
  }

  const diff = diffResponse.ok
    ? await diffResponse.text()
    : files.data.map((f) => f.patch || "").join("\n\n");

  return {
    owner,
    repo,
    number: prNumber,
    title: pr.data.title,
    body: pr.data.body || "",
    diff,
    files: files.data.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    })),
    author: pr.data.user?.login || "unknown",
    state: pr.data.state,
    createdAt: pr.data.created_at,
    updatedAt: pr.data.updated_at,
  };
}

export async function fetchIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueInfo> {
  const octokit = await getGitHubClient();

  const [issue, comments] = await Promise.all([
    octokit.issues.get({ owner, repo, issue_number: issueNumber }),
    octokit.issues.listComments({ owner, repo, issue_number: issueNumber }),
  ]);

  return {
    owner,
    repo,
    number: issueNumber,
    title: issue.data.title,
    body: issue.data.body || "",
    author: issue.data.user?.login || "unknown",
    state: issue.data.state,
    labels: issue.data.labels.map((l) =>
      typeof l === "string" ? l : l.name || ""
    ),
    createdAt: issue.data.created_at,
    updatedAt: issue.data.updated_at,
    comments: comments.data.map((c) => ({
      author: c.user?.login || "unknown",
      body: c.body || "",
      createdAt: c.created_at,
    })),
  };
}

export async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const octokit = await getGitHubClient();
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

export async function postIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const octokit = await getGitHubClient();
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function listRepositoryPRs(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<Array<{ number: number; title: string; author: string; state: string }>> {
  const octokit = await getGitHubClient();
  const prs = await octokit.pulls.list({ owner, repo, state });

  return prs.data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login || "unknown",
    state: pr.state,
  }));
}

export async function listRepositoryIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<Array<{ number: number; title: string; author: string; labels: string[] }>> {
  const octokit = await getGitHubClient();
  const issues = await octokit.issues.listForRepo({ owner, repo, state });

  return issues.data
    .filter((i) => !i.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      author: issue.user?.login || "unknown",
      labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
    }));
}
