# NPM Package Setup Guide

This document explains how to properly publish the AI Coding Agents package to NPM or install it from GitHub.

## The Problem

This repository serves dual purposes:
1. **Replit App** - A full-stack demo/development environment (client/, server/, shared/)
2. **NPM Package** - A distributable library for client projects (src/)

When installing directly from GitHub without proper configuration, npm pulls the entire repository including the Replit app scaffolding.

## Solution: Proper Package Configuration

### Step 1: Update package.json

Add the following fields to the root `package.json`:

```json
{
  "name": "@ai-coding-agents/cli",
  "version": "1.0.0",
  "description": "AI-powered coding agents with dual-LLM reasoning (OpenAI + Grok) and ML learning",
  "keywords": ["ai", "agents", "coding", "openai", "grok", "llm", "code-review"],
  
  "main": "./dist/index.js",
  "module": "./dist/index.js", 
  "types": "./dist/index.d.ts",
  
  "bin": {
    "ai-agents": "./dist/cli.js"
  },
  
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./agents": {
      "import": "./dist/agents/index.js",
      "types": "./dist/agents/index.d.ts"
    },
    "./scanner": {
      "import": "./dist/scanner.js",
      "types": "./dist/scanner.d.ts"
    }
  },
  
  "files": [
    "dist",
    "templates",
    "README.npm.md"
  ],
  
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/ai-coding-agents"
  }
}
```

### Step 2: Add Build Scripts

Add these scripts to package.json:

```json
{
  "scripts": {
    "build:package": "tsc -p tsconfig.package.json",
    "prepublishOnly": "npm run build:package"
  }
}
```

### Step 3: Verify .npmignore

The `.npmignore` file has been created to exclude:
- `client/` - React frontend app
- `server/` - Express backend app
- `shared/` - Shared types for the app
- `docs/` - Documentation
- `scripts/` - Development scripts
- Test files (`*.test.ts`)
- Configuration files (vite, tailwind, drizzle, etc.)

### Step 4: Build and Publish

```bash
# Build the package
npm run build:package

# Verify what will be published
npm pack --dry-run

# Publish to NPM
npm publish --access public

# Or for scoped packages
npm publish --access public --scope=@ai-coding-agents
```

## Alternative: Use Publish Script

A publish script is provided that copies `package.npm.json` to `package.json` before publishing:

```bash
# Run the publish script
npx tsx scripts/publish-package.ts
```

## Installing from GitHub

After proper setup, install from GitHub:

```bash
# Install from main branch
npm install github:YOUR_USERNAME/ai-coding-agents

# Install from specific tag
npm install github:YOUR_USERNAME/ai-coding-agents#v1.0.0
```

## Verifying the Package

After building, check the dist/ folder contains:

```
dist/
├── index.js          # Main entry point
├── index.d.ts        # TypeScript declarations
├── cli.js            # CLI entry point
├── scanner.js        # QA scanner
├── agents/
│   ├── index.js      # Agent exports
│   └── ...
└── ...
```

## Client Project Usage

In your client project:

```json
{
  "dependencies": {
    "@ai-coding-agents/cli": "github:YOUR_USERNAME/ai-coding-agents#v1.0.0"
  }
}
```

Then create `.ai-agents.json`:

```json
{
  "hubUrl": "https://ai-coding-agents-hub.replit.app",
  "projectId": "github.com/your-org/your-project",
  "autoReport": true
}
```

## Minimal Dependencies

The NPM package should only include these runtime dependencies:

- `openai` - For AI agent invocations
- `pino` - For logging
- `zod` - For validation
- `zod-validation-error` - For error formatting

All other dependencies (React, Express, Radix, etc.) are for the Replit app only and should NOT be in the published package.

### Separating Dependencies

Move app-only dependencies to a separate section or use a monorepo structure:

```json
{
  "dependencies": {
    "openai": "^6.15.0",
    "pino": "^10.1.0",
    "zod": "^3.25.76",
    "zod-validation-error": "^3.5.4"
  },
  "peerDependencies": {
    "openai": "^4.0.0 || ^6.0.0"
  }
}
```

## Troubleshooting

### "Not an NPM package"
- Ensure `package.json` has `main` and `exports` fields
- Verify `dist/` folder exists after build
- Check `.npmignore` excludes app directories

### "Too many dependencies"
- The published package should only have ~4 runtime dependencies
- All React/Express/UI dependencies are for the Replit app, not the library

### "Missing types"
- Ensure `tsconfig.package.json` has `declaration: true`
- Run `npm run build:package` before publishing
