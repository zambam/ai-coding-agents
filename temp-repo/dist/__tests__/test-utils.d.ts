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
    validations?: {
        passed: number;
        failed: number;
    };
    metrics?: Record<string, unknown>;
    [key: string]: unknown;
}
export declare function createTestLogger(): {
    logger: pino.Logger<never, boolean>;
    logs: CapturedLog[];
    clear: () => void;
    getByLevel: (level: string) => CapturedLog[];
    getByMessage: (msg: string) => CapturedLog[];
    getByRunId: (runId: string) => CapturedLog[];
};
//# sourceMappingURL=test-utils.d.ts.map