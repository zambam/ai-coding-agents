# AI Coding Agents Platform

An npm package providing AI-powered coding guidance agents with built-in reliability mechanisms.

## Overview

This project implements four specialized AI coding agents:
- **The Architect** - Designs robust, scalable system blueprints
- **The Mechanic** - Diagnoses and repairs code issues
- **The Code Ninja** - Executes fast, precise implementations
- **The Philosopher** - Meta-evaluates decisions and identifies opportunities

## Project Architecture

```
├── client/src/
│   ├── components/       # Shared UI components (Navbar, Footer, etc.)
│   ├── pages/            # Route pages (home, playground, docs)
│   └── lib/              # Query client and utilities
├── server/
│   ├── agents/           # AI agent implementation
│   │   ├── personas/     # Individual agent classes
│   │   ├── prompt-engine.ts    # CoT, self-consistency, reflection
│   │   ├── evaluator.ts        # CLASSic metrics
│   │   ├── replit-md-parser.ts # Config parsing
│   │   └── orchestrator.ts     # Multi-agent coordination
│   └── routes.ts         # API endpoints
├── shared/
│   └── schema.ts         # TypeScript types and constants
└── templates/
    └── replit.md.template # Reference config for consuming projects
```

## Key Technologies

- **Frontend**: React, TanStack Query, Tailwind CSS, Shadcn UI
- **Backend**: Express, TypeScript
- **AI**: OpenAI GPT-4o via Replit AI Integrations
- **Reliability**: Chain-of-Thought, Self-Consistency, CLASSic Metrics

## Agent Configuration

consistency.mode: fast
validationLevel: medium
enableSelfCritique: true
enablePhilosopher: false

## Code Standards

- TypeScript strict mode
- No implicit any types
- Functional components with hooks
- TanStack Query for data fetching
- Follow design_guidelines.md for UI

## API Endpoints

- `POST /api/agents/invoke` - Invoke a specific agent
- `POST /api/agents/pipeline` - Run full orchestrated pipeline
- `GET /api/agents/config` - Get default configuration
- `GET /api/health` - Health check

## Development

Run with `npm run dev`. The server starts on port 5000.

## Recent Changes

- Implemented four agent personas with specialized system prompts
- Added PromptEngine with CoT, self-consistency voting, and reflection
- Created Evaluator with CLASSic metrics (Cost, Latency, Accuracy, Security, Stability)
- Built interactive playground with real-time reasoning visualization
- Added documentation page with configuration examples
