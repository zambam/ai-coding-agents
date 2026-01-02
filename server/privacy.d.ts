import type { Request, Response, NextFunction } from "express";
export interface ConsentRecord {
    userId: string;
    dataProcessing: boolean;
    analytics: boolean;
    thirdPartySharing: boolean;
    consentedAt: Date;
    updatedAt: Date;
}
export interface PrivacyConfig {
    defaultRetentionDays: number;
    strictPIIMode: boolean;
    requireExplicitConsent: boolean;
    allowedDataExportFormats: string[];
}
export declare function setConsent(userId: string, consent: Partial<Omit<ConsentRecord, "userId" | "consentedAt" | "updatedAt">>): ConsentRecord;
export declare function getConsent(userId: string): ConsentRecord | undefined;
export declare function hasConsent(userId: string, type: keyof Pick<ConsentRecord, "dataProcessing" | "analytics" | "thirdPartySharing">): boolean;
export declare function revokeConsent(userId: string): void;
export declare function redactPII(text: string): string;
export declare function createPIIRedactionMiddleware(config?: Partial<PrivacyConfig>): (req: Request, res: Response, next: NextFunction) => void;
export interface UserDataExport {
    userId: string;
    exportedAt: Date;
    format: string;
    consent: ConsentRecord | null;
    data: {
        outcomes: unknown[];
        feedback: unknown[];
    };
}
export declare function createGDPRRouter(storage: {
    getRunOutcomesByAgent: (agentType: string, limit: number) => Promise<unknown[]>;
    getFeedbackByRunId: (runId: string) => Promise<unknown>;
    cleanupOldOutcomes: (days: number) => Promise<number>;
    cleanupExpiredMemories: () => Promise<number>;
}): any;
//# sourceMappingURL=privacy.d.ts.map