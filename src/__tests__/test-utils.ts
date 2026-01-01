import pino from "pino";

export interface CapturedLog {
  level: number;
  levelLabel: string;
  msg: string;
  runId?: string;
  agentType?: string;
  action?: string;
  outcome?: string;
  eventType?: string;
  blocked?: boolean;
  validations?: { passed: number; failed: number };
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

export function createTestLogger() {
  const logs: CapturedLog[] = [];
  
  const stream = {
    write: (chunk: string) => {
      try {
        const parsed = JSON.parse(chunk);
        const levelLabel = pino.levels.labels[parsed.level] || "unknown";
        logs.push({
          ...parsed,
          levelLabel,
        });
      } catch {
        // Ignore non-JSON output
      }
    },
  };

  const logger = pino({
    level: "trace",
    base: { service: "ai-coding-agents-test" },
  }, stream);

  return {
    logger,
    logs,
    clear: () => { logs.length = 0; },
    getByLevel: (level: string) => logs.filter(l => l.levelLabel === level),
    getByMessage: (msg: string) => logs.filter(l => l.msg?.includes(msg)),
    getByRunId: (runId: string) => logs.filter(l => l.runId === runId),
  };
}
