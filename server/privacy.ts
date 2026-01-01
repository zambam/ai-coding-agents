import type { Request, Response, NextFunction } from "express";
import { logger } from "../src/logger";
import { sanitizePayload, checkPIIPatterns } from "./security";

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

const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  defaultRetentionDays: 90,
  strictPIIMode: true,
  requireExplicitConsent: false,
  allowedDataExportFormats: ["json", "csv"],
};

const consentStore = new Map<string, ConsentRecord>();

export function setConsent(userId: string, consent: Partial<Omit<ConsentRecord, "userId" | "consentedAt" | "updatedAt">>): ConsentRecord {
  const existing = consentStore.get(userId);
  const now = new Date();
  
  const record: ConsentRecord = {
    userId,
    dataProcessing: consent.dataProcessing ?? existing?.dataProcessing ?? false,
    analytics: consent.analytics ?? existing?.analytics ?? false,
    thirdPartySharing: consent.thirdPartySharing ?? existing?.thirdPartySharing ?? false,
    consentedAt: existing?.consentedAt ?? now,
    updatedAt: now,
  };
  
  consentStore.set(userId, record);
  logger.info("Consent updated", { userId, consent: record });
  return record;
}

export function getConsent(userId: string): ConsentRecord | undefined {
  return consentStore.get(userId);
}

export function hasConsent(userId: string, type: keyof Pick<ConsentRecord, "dataProcessing" | "analytics" | "thirdPartySharing">): boolean {
  const record = consentStore.get(userId);
  return record?.[type] ?? false;
}

export function revokeConsent(userId: string): void {
  consentStore.delete(userId);
  logger.info("Consent revoked", { userId });
}

export function redactPII(text: string): string {
  const piiPatterns = [
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
    { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: "[SSN_REDACTED]" },
    { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE_REDACTED]" },
    { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: "[CARD_REDACTED]" },
    { pattern: /\b(?:password|pwd|passwd)\s*[:=]\s*\S+/gi, replacement: "[PASSWORD_REDACTED]" },
    { pattern: /\b(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*\S+/gi, replacement: "[API_KEY_REDACTED]" },
    { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi, replacement: "[BEARER_TOKEN_REDACTED]" },
    { pattern: /\b(?:sk-|pk-)[A-Za-z0-9]{32,}/g, replacement: "[API_KEY_REDACTED]" },
  ];

  let result = text;
  for (const { pattern, replacement } of piiPatterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function createPIIRedactionMiddleware(config: Partial<PrivacyConfig> = {}) {
  const privacyConfig = { ...DEFAULT_PRIVACY_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!privacyConfig.strictPIIMode) {
      return next();
    }

    if (req.body && typeof req.body === "object") {
      const fieldsToCheck = ["prompt", "content", "message", "input", "query", "text", "comment"];
      
      for (const field of fieldsToCheck) {
        if (typeof req.body[field] === "string") {
          const piiCheck = checkPIIPatterns(req.body[field]);
          if (piiCheck.detected) {
            req.body[field] = redactPII(req.body[field]);
            logger.info("PII redacted from request", { field, patternsDetected: piiCheck.patterns.length });
          }
        }
      }
    }

    next();
  };
}

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

export function createGDPRRouter(storage: {
  getRunOutcomesByAgent: (agentType: string, limit: number) => Promise<unknown[]>;
  getFeedbackByRunId: (runId: string) => Promise<unknown>;
  cleanupOldOutcomes: (days: number) => Promise<number>;
  cleanupExpiredMemories: () => Promise<number>;
}) {
  const router = require("express").Router();

  router.get("/consent/:userId", (req: Request, res: Response) => {
    const consent = getConsent(req.params.userId);
    if (!consent) {
      return res.status(404).json({ error: "No consent record found" });
    }
    res.json(consent);
  });

  router.post("/consent/:userId", (req: Request, res: Response) => {
    const { dataProcessing, analytics, thirdPartySharing } = req.body;
    const consent = setConsent(req.params.userId, { dataProcessing, analytics, thirdPartySharing });
    res.json(consent);
  });

  router.delete("/consent/:userId", (req: Request, res: Response) => {
    revokeConsent(req.params.userId);
    res.json({ message: "Consent revoked successfully" });
  });

  router.get("/export/:userId", async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) || "json";
      if (!["json", "csv"].includes(format)) {
        return res.status(400).json({ error: "Invalid export format" });
      }

      const consent = getConsent(req.params.userId);

      const exportData: UserDataExport = {
        userId: req.params.userId,
        exportedAt: new Date(),
        format,
        consent: consent || null,
        data: {
          outcomes: [],
          feedback: [],
        },
      };

      res.setHeader("Content-Type", format === "json" ? "application/json" : "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="user-data-${req.params.userId}.${format}"`);

      if (format === "json") {
        res.json(sanitizePayload(exportData as unknown as Record<string, unknown>));
      } else {
        res.send("userId,exportedAt,format\n" + `${exportData.userId},${exportData.exportedAt.toISOString()},${exportData.format}`);
      }
    } catch (error) {
      logger.error("Error exporting user data", error);
      res.status(500).json({ error: "Failed to export user data" });
    }
  });

  router.delete("/data/:userId", async (req: Request, res: Response) => {
    try {
      revokeConsent(req.params.userId);
      
      logger.info("User data deletion requested", { userId: req.params.userId });

      res.json({ 
        message: "Data deletion initiated",
        userId: req.params.userId,
        status: "processing",
      });
    } catch (error) {
      logger.error("Error deleting user data", error);
      res.status(500).json({ error: "Failed to delete user data" });
    }
  });

  router.post("/retention/cleanup", async (req: Request, res: Response) => {
    try {
      const { retentionDays = DEFAULT_PRIVACY_CONFIG.defaultRetentionDays } = req.body;

      const outcomesDeleted = await storage.cleanupOldOutcomes(retentionDays);
      const memoriesDeleted = await storage.cleanupExpiredMemories();

      logger.info("Retention cleanup completed", { outcomesDeleted, memoriesDeleted, retentionDays });

      res.json({
        message: "Retention cleanup completed",
        outcomesDeleted,
        memoriesDeleted,
        retentionDays,
      });
    } catch (error) {
      logger.error("Error during retention cleanup", error);
      res.status(500).json({ error: "Failed to run retention cleanup" });
    }
  });

  router.get("/retention/policy", (_req: Request, res: Response) => {
    res.json({
      defaultRetentionDays: DEFAULT_PRIVACY_CONFIG.defaultRetentionDays,
      strictPIIMode: DEFAULT_PRIVACY_CONFIG.strictPIIMode,
      allowedExportFormats: DEFAULT_PRIVACY_CONFIG.allowedDataExportFormats,
    });
  });

  return router;
}
