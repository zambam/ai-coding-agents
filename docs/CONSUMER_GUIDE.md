# Consumer Setup Guide

This guide helps you set up AI Coding Agents in your project with optimal configuration.

## Quick Setup

### 1. Install the Package

```bash
npm install @ai-coding-agents/cli
```

### 2. Set Environment Variables

Create a `.env` file (add to `.gitignore`):

```env
OPENAI_API_KEY=sk-your-openai-api-key
XAI_API_KEY=xai-your-xai-key  # Optional for Grok
```

### 3. Add to package.json

```json
{
  "scripts": {
    "ai:scan": "ai-agents scan ./src --ext .ts,.tsx,.js,.jsx",
    "ai:scan:strict": "ai-agents scan ./src --strict",
    "ai:architect": "ai-agents invoke architect",
    "ai:mechanic": "ai-agents invoke mechanic",
    "ai:ninja": "ai-agents invoke ninja"
  }
}
```

### 4. Basic Usage

```bash
# Scan for code quality issues
npm run ai:scan

# Get architecture advice
npm run ai:architect "Design a REST API for user management"

# Debug an issue
npm run ai:mechanic "Why is my auth middleware not working?"
```

---

## Configuration File

Create `ai-agents.config.js` in your project root:

```javascript
module.exports = {
  // Consistency mode: 'fast' | 'balanced' | 'thorough'
  consistencyMode: 'balanced',
  
  // Number of samples for self-consistency voting
  consistencySamples: 3,
  
  // Minimum agreement threshold (0-1)
  consistencyThreshold: 0.7,
  
  // Validation level: 'low' | 'medium' | 'high' | 'strict'
  validationLevel: 'medium',
  
  // Enable Chain-of-Thought reflection
  enableSelfCritique: true,
  
  // Include Philosopher in pipeline
  enablePhilosopher: false,
  
  // Enable Grok second opinions
  enableGrokSecondOpinion: true,
  
  // Enable self-learning features
  enableLearning: false,
  
  // CLASSic metric thresholds
  thresholds: {
    maxCost: 0.10,           // Max cost per invocation ($)
    maxLatencyMs: 30000,     // Max latency (ms)
    minAccuracy: 0.8,        // Minimum accuracy (0-1)
    maxSecurityScore: 0.2,   // Max security risk (0-1)
    minStability: 0.7,       // Minimum stability (0-1)
  },
  
  // Scanner configuration
  scanner: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    ignore: ['node_modules', 'dist', 'build', '__tests__'],
    strict: false,
  },
};
```

---

## Package.json Configuration

For NPM package publishing, add these fields:

```json
{
  "name": "your-package",
  "version": "1.0.0",
  "dependencies": {
    "@ai-coding-agents/cli": "^1.0.0"
  },
  "scripts": {
    "precommit": "ai-agents scan ./src --strict",
    "prepublish": "ai-agents scan ./src --strict"
  }
}
```

---

## TypeScript Configuration

For full TypeScript support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "target": "ES2020"
  }
}
```

Import types:

```typescript
import type {
  AgentType,
  AgentConfig,
  AgentResponse,
  AgentResult,
  CLASSicMetrics,
} from '@ai-coding-agents/cli';
```

---

## Recommended Project Structure

```
your-project/
├── src/
│   ├── index.ts
│   └── ...
├── ai-agents.config.js      # AI agents configuration
├── .env                     # API keys (gitignored)
├── .github/
│   └── workflows/
│       └── ai-qa.yml        # GitHub Actions workflow
├── package.json
└── tsconfig.json
```

---

## Common Configurations

### Development (Fast Feedback)

```javascript
module.exports = {
  consistencyMode: 'fast',
  consistencySamples: 1,
  validationLevel: 'low',
  enableSelfCritique: false,
  enablePhilosopher: false,
  enableGrokSecondOpinion: false,
};
```

### Production (High Reliability)

```javascript
module.exports = {
  consistencyMode: 'thorough',
  consistencySamples: 5,
  consistencyThreshold: 0.8,
  validationLevel: 'strict',
  enableSelfCritique: true,
  enablePhilosopher: true,
  enableGrokSecondOpinion: true,
  enableLearning: true,
};
```

### CI/CD (Balanced)

```javascript
module.exports = {
  consistencyMode: 'balanced',
  consistencySamples: 3,
  validationLevel: 'medium',
  enableSelfCritique: true,
  enableGrokSecondOpinion: true,
  scanner: {
    strict: true,
    extensions: ['.ts', '.tsx'],
  },
};
```

---

## Environment-Specific Configuration

Use environment variables to switch configurations:

```javascript
const isDev = process.env.NODE_ENV === 'development';
const isCI = process.env.CI === 'true';

module.exports = {
  consistencyMode: isDev ? 'fast' : 'balanced',
  validationLevel: isCI ? 'strict' : 'medium',
  enablePhilosopher: !isDev,
  enableGrokSecondOpinion: !isDev,
  enableLearning: !isDev && !isCI,
};
```

---

## Logging Configuration

Set logging via environment variables:

```env
# Log levels: trace, debug, info, warn, error, fatal
AI_AGENTS_LOG_LEVEL=info

# Output to file
AI_AGENTS_LOG_FILE=./logs/ai-agents.log

# HTTP log shipping
AI_AGENTS_LOG_HTTP=https://your-logging-service.com/logs
```

Or programmatically:

```typescript
import { createLogger } from '@ai-coding-agents/cli';

const logger = createLogger({
  level: 'debug',
  runId: 'my-session-123',
});
```

---

## Troubleshooting

### Missing API Key

```
Error: Missing required environment variables: OPENAI_API_KEY
```

**Solution:** Set the `OPENAI_API_KEY` environment variable.

### Rate Limiting

```
Error: Rate limit exceeded (E102)
```

**Solution:** 
1. Wait and retry with exponential backoff
2. Reduce `consistencySamples` to lower API calls
3. Use `consistencyMode: 'fast'` during development

### High Latency

```
Warning: Latency exceeds threshold (45000ms > 30000ms)
```

**Solution:**
1. Increase `maxLatencyMs` threshold
2. Use `consistencyMode: 'fast'`
3. Disable `enablePhilosopher` and `enableGrokSecondOpinion`

### PII Detected

```
Error: PII detected in input (E002)
```

**Solution:**
1. Remove personal information from prompts
2. Lower `validationLevel` if appropriate
3. Use placeholder tokens instead of real data

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Use .gitignore** - Add `.env` and log files
3. **Enable validation** - Use `validationLevel: 'high'` in production
4. **Review scanner results** - Address all security warnings
5. **Rotate keys regularly** - Update API keys periodically
