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

- **NPM Package Build System Fixed (12/12 Sandbox Tests Passing)**
  - Fixed TypeScript incremental build by adding `incremental: false` to tsconfig.package.json
  - Added `.js` extensions to all ESM imports across 20+ files in src/
  - Added pino-pretty as runtime dependency
  - Configured express/drizzle-orm as optional peer dependencies with peerDependenciesMeta
  - Removed express-router and drizzle-schema exports from main index.ts (use subpath imports)
  - Fixed verify command to use ESM dynamic import instead of CommonJS require
  - Removed "require" exports from package.json (ESM-only package)
  - Sandbox tests verify: build, pack, install, CLI commands, config files, export resolution
  - **Note**: Package is ESM-only; consumers must use `import` syntax, not `require()`

- **AI Agent Monitor Implementation COMPLETE (Phases 1-5)**
  - **Phase 1**: Database schema added (agentReports, projectGuidelines, failurePatterns tables) in shared/schema.ts
    - 8 failure categories: security_gap, logic_error, context_blindness, outdated_api, missing_edge_case, poor_readability, broke_existing, hallucinated_code
    - 9 external agent types: replit_agent, cursor, copilot, claude_code, windsurf, aider, continue, cody, unknown
    - IAgentMonitor interface and full MemStorage implementation in server/storage.ts
  - **Phase 2**: Core modules implemented in server/monitor/
    - ReportProcessor: Handles incoming reports with auto-detection via FailureDetector
    - FailureDetector: Analyzes code/errors/diffs with pattern matching for 8 categories
    - GuidelinesGenerator: Creates AGENT_RULES.md with confidence scoring
    - AnalyticsService: Provides metrics, trends, exports (CSV/JSON)
  - **Phase 3**: 7 API endpoints added in server/routes.ts
    - POST /api/agents/external/report - Receive external agent reports
    - GET /api/agents/guidelines/:projectId - Get project guidelines
    - POST /api/agents/guidelines/generate - Force regenerate guidelines
    - GET /api/agents/monitor/analytics - Get failure analytics
    - GET /api/agents/monitor/analytics/export - Export CSV/JSON
    - GET /api/agents/monitor/trends - Get failure trends
    - GET /api/agents/monitor/patterns - Get failure patterns
  - **Phase 4**: MonitorLearningIntegration for ML system integration
    - Bridges monitor system with OutcomeLearner/MemoryManager
    - Cross-project insights with opt-in learning
    - Agent comparison and effectiveness tracking
  - **Phase 5**: 57 monitor tests added (341 total tests passing)
  - **Configuration**: No API auth, 60-day retention, opt-in cross-project learning, 5-min debounce, 3+ failure threshold

- **GitHub Integration Added**
  - PR review: Analyze pull requests with Architect, Mechanic, and Code Ninja agents
  - Issue analysis: Classify issues, root cause analysis, suggest solutions
  - API routes: POST /api/github/pr/review, POST /api/github/issue/analyze
  - CLI: scripts/github-review.ts for command-line PR/issue review
  - Can post analysis comments directly to GitHub

- **Agent Behavior Optimization Proposal v2.1 APPROVED**
  - 3-Pass Optimized Workflow with 8 AI calls (down from 10+)
  - Pass 1: Foundation (Philosopher → Architect → Mechanic) - 3 calls
  - Pass 2: Refinement (Architect → Mechanic + 15% trigger Philosopher) - 2 calls
  - Pass 3: Final (Architect → Joint Validation → Code Ninja) - 3 calls
  - Auto-merge simple conflicts, escalate contradictions to Philosopher
  - Adjacent opportunities stored in ML system + documented in output
  - Document: docs/AGENT_BEHAVIOR_OPTIMIZATION_PROPOSAL.md

- **Cross-Project Observer Configured**
  - ProjectObserver class for tracking Replit agent and Architect interactions
  - Auto-loads chat history, logs, and docs for context awareness
  - Integrated with ML learning hub (OutcomeLearner, MemoryManager)
  - Configurable observation: observeReplitAgent, observeArchitect, loadDocs, loadLogs
  - Context refresh with project phase detection, pending tasks, key files

- **Phase 5 Complete: Documentation & Publishing Prep**
  - Comprehensive NPM README (docs/NPM_README.md) with usage examples
  - Full API Reference (docs/API_REFERENCE.md) documenting all exports
  - Consumer Setup Guide (docs/CONSUMER_GUIDE.md) with configuration options
  - Integration Guide (docs/INTEGRATION_GUIDE.md) for GitHub Actions, GitLab CI, pre-commit hooks
  - 284 regression tests passing (12 test files)

- **Phase 4 Complete: Consumer Tooling**
  - CLI entry point (src/cli.ts) with invoke and scan commands
  - FakeDataScanner for QA automation detecting fake data, placeholder text, security issues, PII
  - GitHub Actions workflow template (templates/github-action.yml)
  - 284 regression tests passing (12 test files): +24 scanner tests

- **Phase 3 Complete: Self-Learning Infrastructure (VERIFIED)**
  - PromptOptimizer service for A/B testing prompt variants with traffic allocation and statistical significance testing
  - OutcomeLearner for analyzing telemetry data and generating improvement signals
  - MemoryManager for RAG-style context retrieval using bag-of-words embeddings and cosine similarity search
  - Learning components integrated into Orchestrator (invokeWithLearning, recordOutcome, getLearningInsights, evaluateAndOptimize)
  - BaseAgent.invokeWithSystemPrompt() enables prompt variant delivery via system prompt override
  - 260 regression tests passing (11 test files): +20 learning tests
  - Learning loop complete: selectPromptVariant → invokeWithSystemPrompt → recordOutcome → evaluateAndOptimize → promoteWinner

- **Phase 2 Complete: Data Telemetry + Security Infrastructure (VERIFIED)**
  - Database schemas (RunOutcome, HumanFeedback, PromptVariant, MemoryEntry) in shared/schema.ts
  - Storage layer with IDataTelemetry interface and MemStorage CRUD operations
  - Telemetry API routes with shared schema validation (insertRunOutcomeSchema, insertHumanFeedbackSchema)
  - Logger factory with env var resolution (AI_AGENTS_*) and file/HTTP destinations
  - Security middleware with deep checks, unicode normalization, bounded rate limiting
  - Privacy controls with consent management, PII redaction, GDPR routes
  - 240 regression tests passing (10 test files): security (63), telemetry-storage (37), telemetry-api (19), logger-factory (25), privacy (21), validation (55+), logger-payload (20)
  - Note: API tests verify route logic and Zod schemas; full E2E middleware integration tests deferred to Phase 3

- **Phase 1 Complete: Logging + Debugging Infrastructure (VERIFIED)**
  - Pino-based structured JSON logging with log levels (trace/debug/info/warn/error/fatal)
  - Error taxonomy with AgentErrorCode enum (E001-E205) for recoverable/non-recoverable errors
  - Run ID tracking ensuring single identifier across all logs in an invocation
  - Blocking validation wrapper with fake data detection, PII detection, security checks
  - PII blocking in strict mode, CLASSic threshold enforcement
  - Logger accepts custom stream for DI testing
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
- `src/cli.ts` - CLI entry point for command-line usage
- `src/scanner.ts` - Fake data scanner for QA automation

## CLI Commands

- `ai-agents invoke <agent> <prompt>` - Invoke an AI agent (architect, mechanic, ninja, philosopher)
- `ai-agents scan <path>` - Scan code for fake/placeholder data, security issues, PII
- `ai-agents report <projectId>` - Submit an external agent report
- `ai-agents generate-rules <projectId>` - Generate AGENT_RULES.md for a project
- `ai-agents analytics [projectId]` - View failure analytics
- `ai-agents help` - Show help message

Options:
- `--strict` - Use strict configuration for invoke, or fail on warnings for scan
- `--ext <extensions>` - File extensions to scan (comma-separated)
- `--agent <type>` - External agent type (replit_agent, cursor, copilot, claude_code, etc.)
- `--output <file>` - Output file path for generate-rules
- `--json` - Output analytics as JSON

## Workflow Scripts

Multi-agent workflow scripts for development and testing:

```bash
# Interactive mode - menu-driven agent selection
npx tsx scripts/run-workflow.ts interactive

# 3-Pass optimized workflow (8 AI calls) - RECOMMENDED
npx tsx scripts/run-workflow.ts three-pass "Design a rate limiter for API endpoints"

# Quick review - Architect + Mechanic (2 agents)
npx tsx scripts/run-workflow.ts quick-review "Design a REST API"

# Quick implement - Code Ninja + Mechanic (2 agents)  
npx tsx scripts/run-workflow.ts quick-implement "Create email validation"

# Full pipeline - All 4 agents
npx tsx scripts/run-workflow.ts pipeline "Build auth system"

# Multi-step review - Iterative refinement (3+ steps)
npx tsx scripts/run-workflow.ts multi-step "Design microservices"

# Diagnose - Debug an error with Mechanic
npx tsx scripts/run-workflow.ts diagnose "TypeError in auth.js"
```

Individual scripts:
- `scripts/three-pass.ts` - 3-Pass optimized workflow (8 calls) [NEW]
- `scripts/quick-review.ts` - Architect + Mechanic
- `scripts/quick-implement.ts` - Code Ninja + Mechanic
- `scripts/full-pipeline.ts` - All 4 agents
- `scripts/multi-step.ts` - Iterative refinement
- `scripts/diagnose.ts` - Error debugging
- `scripts/code-review.ts` - Review a file
- `scripts/single-agent.ts` - Run one agent
