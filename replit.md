# AI Coding Agents Platform

An npm package providing AI-powered coding guidance agents with built-in reliability mechanisms and dual-LLM second opinion via Grok.

## Overview

This project implements four specialized AI coding agents:
- **The Architect** - Designs robust, scalable system blueprints
- **The Mechanic** - Diagnoses and repairs code issues
- **The Code Ninja** - Executes fast, precise implementations
- **The Philosopher** - Evaluates decisions and identifies opportunities

## Project Architecture

```
├── client/src/
│   ├── components/       # Shared UI components (Navbar, Footer, etc.)
│   ├── pages/            # Route pages (home, playground, docs)
│   └── lib/              # Query client and utilities
├── server/
│   ├── agents/           # AI agent implementation
│   │   ├── personas/     # Individual agent classes
│   │   ├── grok-client.ts      # xAI Grok integration for second opinions
│   │   ├── prompt-engine.ts    # CoT, self-consistency, reflection
│   │   ├── evaluator.ts        # CLASSic metrics
│   │   ├── replit-md-parser.ts # Config parsing
│   │   └── orchestrator.ts     # Multi-agent coordination
│   └── routes.ts         # API endpoints
├── shared/
│   └── schema.ts         # TypeScript types and constants
├── docs/
│   ├── PROPOSAL.md       # Technical proposal document
│   ├── QA_SYSTEM_PROPOSAL.md  # QA system and review protocol
│   ├── IMPLEMENTATION_PLAN.md # Root cause analysis and fixes
│   └── QA_SECURITY_PRIVACY_PROPOSAL.md  # Security, privacy, logging proposal
└── templates/
    └── replit.md.template # Reference config for consuming projects
```

## Key Technologies

- **Frontend**: React, TanStack Query, Tailwind CSS, Shadcn UI
- **Backend**: Express, TypeScript
- **AI**: OpenAI GPT-4o + xAI Grok (dual-LLM)
- **Reliability**: Chain-of-Thought, Self-Consistency, CLASSic Metrics

## Agent Configuration

consistency.mode: fast
validationLevel: medium
enableSelfCritique: true
enablePhilosopher: false
enableGrokSecondOpinion: true

## Code Standards

- TypeScript strict mode
- No implicit any types
- Functional components with hooks
- TanStack Query for data fetching
- Follow design_guidelines.md for UI
- No fake/placeholder data in production paths

## API Endpoints

- `POST /api/agents/invoke` - Invoke a specific agent
- `POST /api/agents/invoke/stream` - SSE streaming invocation with real-time reasoning
- `POST /api/agents/pipeline` - Run full orchestrated pipeline
- `GET /api/agents/config` - Get default configuration
- `GET /api/health` - Health check

## Development

Run with `npm run dev`. The server starts on port 5000.

## Environment Variables

- `XAI_API_KEY` - xAI API key for Grok second opinions
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (via Replit integration)

## QA Requirements

Before any commit:
1. Run `npm run check` to verify TypeScript compiles
2. Scan for fake/placeholder data patterns
3. Verify all icon imports are consistent
4. Test UI loads without console errors

## Recent Changes

- **Phase 1 Complete: Logging + Debugging Infrastructure (VERIFIED)**
  - Pino-based structured JSON logging with log levels (trace/debug/info/warn/error/fatal)
  - Error taxonomy with AgentErrorCode enum (E001-E205) for recoverable/non-recoverable errors
  - Run ID tracking ensuring single identifier across all logs in an invocation
  - Blocking validation wrapper with fake data detection, PII detection, security checks
  - PII blocking in strict mode, CLASSic threshold enforcement
  - Logger accepts custom stream for DI testing
  - 107 regression tests (5 files) with real pino payload verification
- Added Grok AI integration for dual-LLM second opinions
- Implemented SSE streaming for real-time reasoning visualization
- Added PromptEngine with CoT, self-consistency voting, and reflection
- Created Evaluator with CLASSic metrics (Cost, Latency, Accuracy, Security, Stability)
- Built interactive playground with progressive reasoning steps and Grok analysis display
- Created QA System Proposal with fake/placeholder data detection requirements
- Created NPM package structure (src/) with TypeScript exports
- Added QA, Security & Privacy Proposal with implementation roadmap
- Created Combined Implementation Plan integrating Security, Self-Learning, and GitHub Logging
- Enhanced plan with technical specs, DAG sequencing, regression gates - Mechanic & Ninja approved

## NPM Package Files

- `src/index.ts` - Main exports
- `src/types.ts` - TypeScript type definitions  
- `src/errors.ts` - Error taxonomy with AgentErrorCode enum
- `src/logger.ts` - Pino-based structured logging
- `src/validation.ts` - Validation and security enforcement
- `src/agents/` - Agent implementations and orchestration
