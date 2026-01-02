import type { Request, Response, NextFunction } from "express";
import type { SecurityEvent } from "../src/types";
export interface SecurityCheckResult {
    safe: boolean;
    events: SecurityEvent[];
}
export declare function checkPromptInjection(input: string): {
    detected: boolean;
    patterns: string[];
};
export declare function checkUnsafeCode(input: string): {
    detected: boolean;
    patterns: string[];
};
export declare function checkPIIPatterns(input: string): {
    detected: boolean;
    patterns: string[];
};
export declare function sanitizePayload<T extends Record<string, unknown>>(payload: T, options?: {
    redactPII?: boolean;
    maxDepth?: number;
}): T;
export declare function runSecurityChecks(input: string, options?: {
    blockOnDetection?: boolean;
}): SecurityCheckResult;
export interface SecurityMiddlewareOptions {
    blockPromptInjection: boolean;
    blockUnsafeCode: boolean;
    logSecurityEvents: boolean;
    checkFields: string[];
}
export declare function createSecurityMiddleware(options?: Partial<SecurityMiddlewareOptions>): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function runDeepSecurityChecks(input: unknown, options?: {
    blockOnDetection?: boolean;
}): SecurityCheckResult;
export declare function rateLimitMiddleware(options?: {
    windowMs?: number;
    maxRequests?: number;
    maxIps?: number;
}): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=security.d.ts.map