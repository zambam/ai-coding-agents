import { z } from "zod";
import type { AgentReport, InsertAgentReport, FailureCategory, FailureSeverity, ExternalAgentType } from "@shared/schema";
import { EXTERNAL_AGENT_TYPES, FAILURE_CATEGORIES, FAILURE_SEVERITIES, insertAgentReportSchema } from "@shared/schema";
import type { IAgentMonitor } from "../storage";
import { MONITOR_CONFIG, CATEGORY_SEVERITY_DEFAULTS } from "./config";
import { FailureDetector } from "./failure-detector";

export const externalReportSchema = z.object({
  projectId: z.string().min(1),
  externalAgent: z.enum(EXTERNAL_AGENT_TYPES as unknown as [string, ...string[]]),
  sessionId: z.string().optional(),
  action: z.string().min(1),
  codeGenerated: z.string().optional(),
  codeAccepted: z.boolean().optional(),
  humanCorrection: z.string().optional(),
  errorMessage: z.string().optional(),
  filePath: z.string().optional(),
  language: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

export type ExternalReport = z.infer<typeof externalReportSchema>;

export interface ProcessorConfig {
  autoDetectFailures: boolean;
  autoUpdateGuidelines: boolean;
  criticalAlertThreshold: number;
  guidelinesUpdateInterval: number;
  ruleCreationThreshold: number;
  retentionDays: number;
  crossProjectLearning: boolean;
}

const DEFAULT_PROCESSOR_CONFIG: ProcessorConfig = {
  autoDetectFailures: true,
  autoUpdateGuidelines: true,
  criticalAlertThreshold: 3,
  guidelinesUpdateInterval: 300,
  ruleCreationThreshold: MONITOR_CONFIG.ruleCreationThreshold,
  retentionDays: MONITOR_CONFIG.retentionDays,
  crossProjectLearning: MONITOR_CONFIG.crossProjectLearningEnabled,
};

export interface ProcessedReport {
  report: AgentReport;
  detectedFailure: boolean;
  failureCategory?: FailureCategory;
  failureSeverity?: FailureSeverity;
  patternMatched?: string;
}

export class ReportProcessor {
  private storage: IAgentMonitor;
  private config: ProcessorConfig;
  private failureDetector: FailureDetector;
  private guidelinesUpdateTimers: Map<string, NodeJS.Timeout>;

  constructor(storage: IAgentMonitor, config: Partial<ProcessorConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config };
    this.failureDetector = new FailureDetector();
    this.guidelinesUpdateTimers = new Map();
  }

  async processReport(externalReport: ExternalReport): Promise<ProcessedReport> {
    const validated = externalReportSchema.parse(externalReport);
    
    let failureCategory: FailureCategory | undefined;
    let failureSeverity: FailureSeverity | undefined;
    let patternMatched: string | undefined;

    if (this.config.autoDetectFailures) {
      const detection = this.failureDetector.detectFailure({
        codeGenerated: validated.codeGenerated,
        humanCorrection: validated.humanCorrection,
        errorMessage: validated.errorMessage,
        codeAccepted: validated.codeAccepted,
      });

      if (detection.detected && detection.category) {
        failureCategory = detection.category;
        failureSeverity = detection.severity ?? CATEGORY_SEVERITY_DEFAULTS[detection.category];
        patternMatched = detection.matchedPattern;
      }
    }

    const insertData: InsertAgentReport = {
      projectId: validated.projectId,
      externalAgent: validated.externalAgent as ExternalAgentType,
      sessionId: validated.sessionId,
      action: validated.action,
      codeGenerated: validated.codeGenerated,
      codeAccepted: validated.codeAccepted,
      humanCorrection: validated.humanCorrection,
      errorMessage: validated.errorMessage,
      failureCategory,
      failureSeverity,
      filePath: validated.filePath,
      language: validated.language,
      context: validated.context,
    };

    const report = await this.storage.createAgentReport(insertData);

    if (failureCategory && patternMatched) {
      await this.updateFailurePattern(validated.projectId, failureCategory, patternMatched, validated.codeGenerated, validated.humanCorrection);
    }

    if (this.config.autoUpdateGuidelines && failureCategory) {
      this.scheduleGuidelinesUpdate(validated.projectId);
    }

    return {
      report,
      detectedFailure: !!failureCategory,
      failureCategory,
      failureSeverity,
      patternMatched,
    };
  }

  private async updateFailurePattern(
    projectId: string,
    category: FailureCategory,
    pattern: string,
    codeExample?: string,
    correction?: string
  ): Promise<void> {
    const existingPatterns = await this.storage.getFailurePatternsByProject(projectId);
    const existing = existingPatterns.find(p => p.pattern === pattern && p.category === category);

    if (existing) {
      const updates: { occurrences: number; exampleCodes?: string[]; exampleCorrections?: string[] } = {
        occurrences: existing.occurrences + 1,
      };

      if (codeExample && existing.exampleCodes && existing.exampleCodes.length < 5) {
        updates.exampleCodes = [...existing.exampleCodes, codeExample];
      }
      if (correction && existing.exampleCorrections && existing.exampleCorrections.length < 5) {
        updates.exampleCorrections = [...existing.exampleCorrections, correction];
      }

      await this.storage.updateFailurePattern(existing.id, updates);
    } else {
      await this.storage.createFailurePattern({
        projectId,
        category,
        pattern,
        occurrences: 1,
        exampleCodes: codeExample ? [codeExample] : undefined,
        exampleCorrections: correction ? [correction] : undefined,
        confidence: 0.5,
        isGlobal: false,
      });
    }
  }

  private scheduleGuidelinesUpdate(projectId: string): void {
    const existingTimer = this.guidelinesUpdateTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.guidelinesUpdateTimers.delete(projectId);
    }, MONITOR_CONFIG.guidelinesUpdateDebounceMs);

    this.guidelinesUpdateTimers.set(projectId, timer);
  }

  async cleanupOldData(): Promise<{ reportsDeleted: number }> {
    const reportsDeleted = await this.storage.cleanupOldReports(this.config.retentionDays);
    return { reportsDeleted };
  }

  getConfig(): ProcessorConfig {
    return { ...this.config };
  }
}
