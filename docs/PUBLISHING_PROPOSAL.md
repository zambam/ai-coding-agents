# Publishing Proposal: GitHub + NPM Package

**Status:** PENDING USER APPROVAL  
**Date:** January 1, 2026

---

## Overview

This proposal outlines two approaches to make the AI Coding Agents service available to your other Replit projects:

1. **Option A: NPM Package** - Publish to npm registry, import as dependency
2. **Option B: API Service** - Deploy as a service, call via HTTP

---

## Part 1: Push to GitHub

### Method: Replit Git Pane

Replit has a built-in Git pane for connecting to GitHub:

1. **Open Git Pane** in the left sidebar
2. **Connect to GitHub** (authenticate with your GitHub account)
3. **Create/Link Repository** 
4. **Commit & Push** your changes

Alternatively, I can help set up the GitHub connector integration which provides a more seamless connection.

### Repository Structure (Recommended)

```
ai-coding-agents/
├── src/                    # Source files for npm package
│   ├── agents/             # Agent classes
│   ├── index.ts            # Main export
│   └── types.ts            # Type definitions
├── dist/                   # Compiled output
├── package.json            # NPM package config
├── tsconfig.json           # TypeScript config
└── README.md               # Documentation
```

---

## Part 2: NPM Package Configuration

### Option A: Publish to NPM Registry

**Pros:**
- Standard npm workflow (`npm install ai-coding-agents`)
- Version control and semantic versioning
- Works anywhere (not just Replit)

**Cons:**
- Requires npm account
- Package is public (or requires paid npm org for private)
- Need to publish on each update

**Package.json Changes Required:**

```json
{
  "name": "@yourname/ai-coding-agents",
  "version": "1.0.0",
  "description": "AI-powered coding agents with dual-LLM reasoning",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./agents": {
      "import": "./dist/agents/index.js",
      "types": "./dist/agents/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build:package": "tsc -p tsconfig.package.json",
    "prepublishOnly": "npm run build:package"
  },
  "keywords": ["ai", "agents", "coding", "openai", "grok"],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/ai-coding-agents"
  },
  "peerDependencies": {
    "openai": "^4.0.0"
  }
}
```

**What Would Be Exported:**

```typescript
// src/index.ts - Main export file
export { Orchestrator } from './agents/orchestrator';
export { Architect, Mechanic, CodeNinja, Philosopher } from './agents/personas';
export { PromptEngine } from './agents/prompt-engine';
export { Evaluator } from './agents/evaluator';
export { getGrokSecondOpinion } from './agents/grok-client';

// Types
export type {
  AgentConfig,
  AgentResponse,
  AgentType,
  CLASSicMetrics,
  GrokSecondOpinion,
  ReasoningStep,
} from './types';

// Constants
export { DEFAULT_AGENT_CONFIG, STRICT_AGENT_CONFIG, AGENT_PERSONAS } from './constants';
```

**Usage in Other Project:**

```typescript
import { Orchestrator, STRICT_AGENT_CONFIG } from '@yourname/ai-coding-agents';

const orchestrator = new Orchestrator(STRICT_AGENT_CONFIG);
const result = await orchestrator.runPipeline("Build a login form");
```

---

### Option B: API Service (Recommended for Replit)

**Pros:**
- No npm publishing needed
- Updates are instant (just redeploy)
- Other projects just call the API
- Secrets (API keys) stay in one place
- Can use Replit deployment

**Cons:**
- Requires network calls
- Need to handle API key authentication between projects

**How It Works:**

```
┌─────────────────────┐         HTTP          ┌──────────────────────┐
│  Your Other Replit  │ ───────────────────▶  │  AI Agents Service   │
│      Project        │                        │  (This Project)      │
│                     │ ◀───────────────────  │  Deployed on Replit  │
└─────────────────────┘        JSON            └──────────────────────┘
```

**API Endpoints Already Available:**

```bash
# Invoke a specific agent
POST /api/agents/invoke
{
  "agentType": "architect",
  "prompt": "Design a user authentication system",
  "config": { "validationLevel": "high" }
}

# Invoke with streaming (real-time reasoning)
POST /api/agents/invoke/stream

# Run full pipeline (all 4 agents)
POST /api/agents/pipeline
{
  "task": "Build a login form with validation",
  "config": { "enablePhilosopher": true }
}

# Get default config
GET /api/agents/config
```

**Client SDK for Other Projects:**

I would create a simple client that other projects can copy:

```typescript
// ai-agents-client.ts
const AI_AGENTS_URL = process.env.AI_AGENTS_URL || 'https://your-project.replit.app';

export async function invokeAgent(
  agentType: 'architect' | 'mechanic' | 'codeNinja' | 'philosopher',
  prompt: string,
  config?: Partial<AgentConfig>
) {
  const response = await fetch(`${AI_AGENTS_URL}/api/agents/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentType, prompt, config }),
  });
  return response.json();
}

export async function runPipeline(task: string, config?: Partial<AgentConfig>) {
  const response = await fetch(`${AI_AGENTS_URL}/api/agents/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, config }),
  });
  return response.json();
}
```

---

## Part 3: Recommendation

### For Your Use Case: **Option B (API Service)**

**Reasons:**
1. **Simpler** - No npm publishing workflow
2. **Centralized** - API keys (OpenAI, xAI) stay in one place
3. **Instant Updates** - Changes to agents are immediately available
4. **Replit-Native** - Uses Replit deployment, easy to manage

### Implementation Steps

1. **Push to GitHub** (for backup/version control)
2. **Deploy this project** on Replit (publish as web service)
3. **Create client SDK** file for other projects to copy
4. **Set environment variable** in other projects pointing to deployed URL

---

## Part 4: Implementation Plan

### Phase 1: Push to GitHub
| Task | Effort |
|------|--------|
| Connect Replit to GitHub via Git pane | 5 min |
| Create repository `ai-coding-agents` | 2 min |
| Push current code | 1 min |

### Phase 2: Prepare for Deployment
| Task | Effort |
|------|--------|
| Add API authentication (optional - API key header) | 1 hour |
| Add rate limiting (optional) | 30 min |
| Update health check endpoint | 10 min |

### Phase 3: Deploy on Replit
| Task | Effort |
|------|--------|
| Publish project as web service | 5 min |
| Verify endpoints work in production | 10 min |

### Phase 4: Create Client SDK
| Task | Effort |
|------|--------|
| Create `ai-agents-client.ts` template | 30 min |
| Add TypeScript types | 30 min |
| Document usage | 30 min |

---

## Part 5: Security Considerations

### If Using API Service Approach

1. **API Key Authentication** - Add a header check to protect endpoints
   ```typescript
   // Middleware to check API key
   app.use('/api/agents', (req, res, next) => {
     const apiKey = req.headers['x-api-key'];
     if (apiKey !== process.env.SERVICE_API_KEY) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   });
   ```

2. **CORS Configuration** - Allow only your other Replit projects
   ```typescript
   app.use(cors({
     origin: ['https://your-other-project.replit.app']
   }));
   ```

3. **Rate Limiting** - Prevent abuse
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 60 * 1000, // 1 minute
     max: 30 // 30 requests per minute
   });
   
   app.use('/api/agents', limiter);
   ```

---

## Approval Request

**Please confirm your preferred approach:**

- [ ] **Option A: NPM Package** - Publish to npm registry
- [ ] **Option B: API Service** - Deploy as Replit service (Recommended)

**If Option B (API Service):**
- [ ] Add API key authentication
- [ ] Add rate limiting
- [ ] Add CORS restrictions

**Additional:**
- [ ] Set up GitHub connection now

---

*Once approved, I can help you push to GitHub and prepare the project for deployment.*
