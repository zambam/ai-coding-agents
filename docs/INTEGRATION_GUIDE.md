# Integration Guide

This guide covers integrating AI Coding Agents into your projects and CI/CD pipelines.

## Table of Contents

- [Basic Integration](#basic-integration)
- [Express/Node.js Integration](#expressnode-js-integration)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Pre-commit Hooks](#pre-commit-hooks)
- [VS Code Extension](#vs-code-extension)
- [Replit Integration](#replit-integration)

---

## Basic Integration

### Installation

```bash
npm install @ai-coding-agents/cli
```

### Simple Usage

```typescript
import { Orchestrator, DEFAULT_AGENT_CONFIG } from '@ai-coding-agents/cli';

async function getArchitectAdvice(task: string) {
  const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);
  const result = await orchestrator.invokeAgent('architect', task);
  return result.response.recommendation;
}

// Usage
const advice = await getArchitectAdvice('Design a caching layer for our API');
console.log(advice);
```

### With Error Handling

```typescript
import { 
  Orchestrator, 
  DEFAULT_AGENT_CONFIG,
  AgentErrorCode,
  isRecoverable 
} from '@ai-coding-agents/cli';

async function invokeWithRetry(agent: AgentType, prompt: string, retries = 3) {
  const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await orchestrator.invokeAgent(agent, prompt);
    } catch (error) {
      if (!isRecoverable(error.code) || attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## Express/Node.js Integration

### API Endpoint

```typescript
import express from 'express';
import { Orchestrator, DEFAULT_AGENT_CONFIG } from '@ai-coding-agents/cli';

const app = express();
app.use(express.json());

const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);

app.post('/api/agent/invoke', async (req, res) => {
  const { agent, prompt } = req.body;
  
  if (!agent || !prompt) {
    return res.status(400).json({ error: 'Missing agent or prompt' });
  }
  
  try {
    const result = await orchestrator.invokeAgent(agent, prompt);
    res.json({
      recommendation: result.response.recommendation,
      confidence: result.response.confidence,
      reasoning: result.response.reasoning,
      metrics: result.metrics,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Streaming Response (SSE)

```typescript
app.get('/api/agent/stream', async (req, res) => {
  const { agent, prompt } = req.query;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const result = await orchestrator.invokeAgent(agent as AgentType, prompt as string);
    
    // Stream reasoning steps
    for (const step of result.response.reasoning) {
      res.write(`data: ${JSON.stringify({ type: 'reasoning', step })}\n\n`);
    }
    
    // Final result
    res.write(`data: ${JSON.stringify({ type: 'result', response: result.response })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});
```

---

## GitHub Actions

### QA Scanning Workflow

Create `.github/workflows/ai-qa.yml`:

```yaml
name: AI Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  qa-scan:
    name: QA Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install AI Agents CLI
        run: npm install -g @ai-coding-agents/cli
      
      - name: Run QA Scanner
        run: ai-agents scan ./src --ext .ts,.tsx,.js,.jsx
      
      - name: Run Strict Scan on PRs
        if: github.event_name == 'pull_request'
        run: ai-agents scan ./src --strict
        continue-on-error: true
```

### AI Code Review

```yaml
  ai-review:
    name: AI Code Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install AI Agents CLI
        run: npm install -g @ai-coding-agents/cli
      
      - name: Get Changed Files
        id: changed
        run: |
          FILES=$(git diff --name-only ${{ github.event.pull_request.base.sha }} HEAD | grep -E '\.(ts|tsx|js|jsx)$' | tr '\n' ' ')
          echo "files=$FILES" >> $GITHUB_OUTPUT
      
      - name: Review Changes
        if: steps.changed.outputs.files != ''
        run: |
          ai-agents invoke architect "Review these files for architectural issues: ${{ steps.changed.outputs.files }}"
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - quality
  - review

qa-scan:
  stage: quality
  image: node:20
  script:
    - npm ci
    - npm install -g @ai-coding-agents/cli
    - ai-agents scan ./src --ext .ts,.tsx
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

ai-review:
  stage: review
  image: node:20
  script:
    - npm install -g @ai-coding-agents/cli
    - |
      CHANGED=$(git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
      if [ -n "$CHANGED" ]; then
        ai-agents invoke architect "Review: $CHANGED"
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
```

---

## Pre-commit Hooks

### Using Husky

Install husky:
```bash
npm install -D husky
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run QA scan on staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$STAGED_FILES" ]; then
  echo "Running AI QA scan on staged files..."
  npx ai-agents scan . --ext .ts,.tsx,.js,.jsx
  
  if [ $? -ne 0 ]; then
    echo "QA scan failed. Please fix the issues before committing."
    exit 1
  fi
fi
```

### Using lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "ai-agents scan"
    ]
  }
}
```

---

## VS Code Extension

Create a VS Code task in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI: Scan Current File",
      "type": "shell",
      "command": "npx ai-agents scan ${file}",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "AI: Architect Review",
      "type": "shell",
      "command": "npx ai-agents invoke architect \"Review this file: ${file}\"",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "AI: Debug Help",
      "type": "shell",
      "command": "npx ai-agents invoke mechanic \"${input:debugPrompt}\"",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ],
  "inputs": [
    {
      "id": "debugPrompt",
      "type": "promptString",
      "description": "Describe the issue you need help debugging"
    }
  ]
}
```

---

## Replit Integration

### Using in a Replit Project

1. Add the package to your Replit project:
```bash
npm install @ai-coding-agents/cli
```

2. Set up environment variables in the Secrets tab:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `XAI_API_KEY` - (Optional) Your xAI API key

3. Use in your code:
```typescript
import { Orchestrator, DEFAULT_AGENT_CONFIG } from '@ai-coding-agents/cli';

const orchestrator = new Orchestrator(DEFAULT_AGENT_CONFIG);

export async function getAIRecommendation(task: string) {
  const result = await orchestrator.invokeAgent('architect', task);
  return result.response;
}
```

### Replit Agent Configuration

Create a `replit.md` file with agent configuration:

```markdown
## Agent Configuration

consistency.mode: balanced
validationLevel: medium
enableSelfCritique: true
enablePhilosopher: false
enableGrokSecondOpinion: true
```

The agents will automatically parse this configuration when running in a Replit environment.

---

## Best Practices

### 1. Environment Variables

Always use environment variables for API keys:
```bash
export OPENAI_API_KEY="sk-..."
export XAI_API_KEY="xai-..."
```

### 2. Error Handling

Always handle errors gracefully:
```typescript
try {
  const result = await orchestrator.invokeAgent(agent, prompt);
} catch (error) {
  if (error.code === AgentErrorCode.RATE_LIMIT_EXCEEDED) {
    // Wait and retry
  } else if (error.code === AgentErrorCode.PII_DETECTED) {
    // Handle PII in input
  } else {
    // Log and fail gracefully
  }
}
```

### 3. Metrics Monitoring

Track CLASSic metrics for quality assurance:
```typescript
const result = await orchestrator.invokeAgent(agent, prompt);

if (result.metrics.cost.estimatedCost > 0.10) {
  logger.warn('High cost invocation', { cost: result.metrics.cost });
}

if (result.metrics.accuracy.taskSuccessRate < 0.8) {
  logger.warn('Low accuracy', { accuracy: result.metrics.accuracy });
}
```

### 4. Caching Results

Cache expensive agent invocations:
```typescript
const cache = new Map<string, AgentResult>();

async function invokeWithCache(agent: AgentType, prompt: string) {
  const key = `${agent}:${prompt}`;
  
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  
  const result = await orchestrator.invokeAgent(agent, prompt);
  cache.set(key, result);
  return result;
}
```
