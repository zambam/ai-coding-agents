import pino from "pino";
export function createTestLogger() {
    const logs = [];
    const stream = {
        write: (chunk) => {
            try {
                const parsed = JSON.parse(chunk);
                const levelLabel = pino.levels.labels[parsed.level] || "unknown";
                logs.push({
                    ...parsed,
                    levelLabel,
                });
            }
            catch {
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
        getByLevel: (level) => logs.filter(l => l.levelLabel === level),
        getByMessage: (msg) => logs.filter(l => l.msg?.includes(msg)),
        getByRunId: (runId) => logs.filter(l => l.runId === runId),
    };
}
//# sourceMappingURL=test-utils.js.map