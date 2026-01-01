# Logging & Debugging for GitHub Consumers

## Proposal Summary

Enable GitHub/npm consumers to integrate the AI Coding Agents logging infrastructure with minimal setup while providing powerful debugging capabilities for production use.

## Current State

Phase 1 is complete with:
- Pino-based structured JSON logging
- Run ID tracking across agent invocations
- Error taxonomy (AgentErrorCode E001-E205)
- Validation with fake data detection, PII blocking, security checks
- 107 regression tests with real payload verification

## Proposed Consumer API

### 1. Simple Factory Pattern

```typescript
import { createAgentLogger, AgentLogger } from 'ai-coding-agents';

// Default configuration (stdout, info level, redaction enabled)
const logger = createAgentLogger();

// Custom configuration
const logger = createAgentLogger({
  level: 'debug',
  destination: 'file',       // stdout | file | http
  filePath: './logs/agents.log',
  prettyPrint: true,         // Human-readable format
  redactPrompts: true,       // PII protection (default: true)
  redactPatterns: [/api_key/i, /password/i]
});
```

### 2. Environment Variable Overrides

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `AI_AGENTS_LOG_LEVEL` | trace/debug/info/warn/error/fatal | info | Log verbosity |
| `AI_AGENTS_DEBUG` | true/false/1/0 | false | Enable debug mode with verbose output |
| `AI_AGENTS_LOG_DEST` | stdout/file/http | stdout | Log destination |
| `AI_AGENTS_LOG_FILE` | path | ./agent.log | File path when dest=file |
| `AI_AGENTS_PRETTY` | true/false | false | Pretty print for development |
| `AI_AGENTS_REDACT` | true/false | true | Enable PII redaction |

### 3. Programmatic Configuration

```typescript
import { setLoggerConfig } from 'ai-coding-agents';

// Override at runtime
setLoggerConfig({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  prettyPrint: process.env.NODE_ENV !== 'production'
});
```

### 4. Debug Toolkit Module

```typescript
import { DebugToolkit } from 'ai-coding-agents';

const debug = new DebugToolkit(logger);

// Capture diagnostics from last run
const diagnostics = debug.captureLastRun();
// { runId, duration, agentType, validationSummary, securityEvents, metrics }

// Get validation summary
const validationReport = debug.getValidationSummary(runId);

// Export run bundle for support tickets
const bundle = debug.exportRunBundle(runId);
// JSON file with logs, config, sanitized prompts
```

### 5. CLI Diagnostics Command

```bash
# Check configuration and connectivity
npx ai-agents diagnostics

# Output:
# AI Coding Agents Diagnostics
# ----------------------------
# Log Level: info
# Destination: stdout
# Redaction: enabled
# OpenAI API: connected
# Grok API: connected
# Last Run: abc123 (2.3s, success)
```

### 6. Express Diagnostic Endpoint (Optional)

```typescript
import express from 'express';
import { createDiagnosticsRouter } from 'ai-coding-agents';

const app = express();

// Adds GET /diagnostics/health, /diagnostics/config, /diagnostics/last-run
app.use('/diagnostics', createDiagnosticsRouter({
  requireAuth: true,
  authToken: process.env.DIAGNOSTICS_TOKEN
}));
```

## Implementation Plan

### Task 1: Logger Configuration API (2-3 hours)
- [ ] Add `LoggerConfig` type with all options
- [ ] Implement `createAgentLogger(config?)` factory
- [ ] Add environment variable resolution with precedence
- [ ] Implement `setLoggerConfig()` runtime override
- [ ] Add destination handlers (stdout, file, http)
- [ ] Add pretty print formatter option

### Task 2: Debug Toolkit (2-3 hours)
- [ ] Create `DebugToolkit` class
- [ ] Implement run history buffer (last N runs)
- [ ] Add `captureLastRun()` with full diagnostics
- [ ] Add `getValidationSummary(runId)`
- [ ] Add `exportRunBundle(runId)` for support
- [ ] Implement sanitization for exported bundles

### Task 3: CLI Command (1-2 hours)
- [ ] Add bin entry to package.json
- [ ] Create `cli/diagnostics.ts` command
- [ ] Implement health checks (API connectivity)
- [ ] Display configuration summary
- [ ] Show last run status

### Task 4: Express Router (1-2 hours)
- [ ] Create `createDiagnosticsRouter(options)`
- [ ] Add `/health` endpoint
- [ ] Add `/config` endpoint (redacted)
- [ ] Add `/last-run` endpoint
- [ ] Add optional auth middleware

### Task 5: Documentation (1-2 hours)
- [ ] Update README.md with quick-start
- [ ] Add configuration table
- [ ] Add debugging cookbook
- [ ] Add security guidance for log redaction
- [ ] Add troubleshooting section

### Task 6: Tests (1-2 hours)
- [ ] Test env variable resolution
- [ ] Test file destination logging
- [ ] Test DebugToolkit capture/export
- [ ] Test CLI command output
- [ ] Test router endpoints

## Exported API Surface

```typescript
// src/index.ts additions
export { createAgentLogger } from './logger';
export { setLoggerConfig, getLoggerConfig } from './config';
export { DebugToolkit } from './debug-toolkit';
export { createDiagnosticsRouter } from './diagnostics-router';
export type { LoggerConfig, DiagnosticsOptions } from './types';
```

## Security Considerations

1. **PII Redaction**: Enabled by default, must be explicitly disabled
2. **Prompt Sanitization**: User prompts redacted in exported bundles
3. **API Key Protection**: Never logged, even in debug mode
4. **Auth on Diagnostics**: Optional but recommended for HTTP endpoints
5. **Log Rotation**: Recommend logrotate for file destinations

## Estimated Effort

| Component | Time | Priority |
|-----------|------|----------|
| Logger Configuration API | 2-3h | High |
| Debug Toolkit | 2-3h | High |
| CLI Command | 1-2h | Medium |
| Express Router | 1-2h | Medium |
| Documentation | 1-2h | High |
| Tests | 1-2h | High |
| **Total** | **10-14h** | |

## Success Criteria

1. GitHub user can install package and get structured logs with zero config
2. Environment variables allow configuration without code changes
3. Debug mode provides actionable diagnostics for troubleshooting
4. Exported bundles are safe to share (no PII, no secrets)
5. Documentation enables self-service setup

## Next Steps

1. Review and approve this proposal
2. Implement Task 1 (Logger Configuration API) first
3. Add tests as each component is built
4. Update documentation incrementally
5. Release as minor version bump (non-breaking)
