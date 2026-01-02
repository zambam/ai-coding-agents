import { 
  type User, 
  type InsertUser,
  type AgentType,
  type PromptStatus,
  type StoredCLASSicMetrics,
  type PromptMetrics,
  type OutcomeStatus,
  type RunOutcome as SchemaRunOutcome,
  type InsertRunOutcome as SchemaInsertRunOutcome,
  type HumanFeedback as SchemaHumanFeedback,
  type InsertHumanFeedback as SchemaInsertHumanFeedback,
  type PromptVariant as SchemaPromptVariant,
  type InsertPromptVariant as SchemaInsertPromptVariant,
  type MemoryEntry as SchemaMemoryEntry,
  type InsertMemoryEntry as SchemaInsertMemoryEntry,
  type AgentReport as SchemaAgentReport,
  type InsertAgentReport as SchemaInsertAgentReport,
  type ProjectGuidelines as SchemaProjectGuidelines,
  type InsertProjectGuidelines as SchemaInsertProjectGuidelines,
  type FailurePattern as SchemaFailurePattern,
  type InsertFailurePattern as SchemaInsertFailurePattern,
  type ExternalAgentType,
  type FailureCategory,
  type FailureSeverity,
  type MonitorAnalytics,
  insertRunOutcomeSchema,
  insertHumanFeedbackSchema,
  insertPromptVariantSchema,
  insertMemoryEntrySchema,
  insertAgentReportSchema,
  insertProjectGuidelinesSchema,
  insertFailurePatternSchema,
} from "@shared/schema";
import { randomUUID } from "crypto";

export type RunOutcome = SchemaRunOutcome;
export type InsertRunOutcome = SchemaInsertRunOutcome;
export type HumanFeedback = SchemaHumanFeedback;
export type InsertHumanFeedback = SchemaInsertHumanFeedback;
export type PromptVariant = SchemaPromptVariant;
export type InsertPromptVariant = SchemaInsertPromptVariant;
export type MemoryEntry = SchemaMemoryEntry;
export type InsertMemoryEntry = SchemaInsertMemoryEntry;
export type AgentReport = SchemaAgentReport;
export type InsertAgentReport = SchemaInsertAgentReport;
export type ProjectGuidelines = SchemaProjectGuidelines;
export type InsertProjectGuidelines = SchemaInsertProjectGuidelines;
export type FailurePattern = SchemaFailurePattern;
export type InsertFailurePattern = SchemaInsertFailurePattern;

export { 
  insertRunOutcomeSchema, 
  insertHumanFeedbackSchema, 
  insertPromptVariantSchema, 
  insertMemoryEntrySchema,
  insertAgentReportSchema,
  insertProjectGuidelinesSchema,
  insertFailurePatternSchema,
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export interface IDataTelemetry {
  createRunOutcome(outcome: InsertRunOutcome): Promise<RunOutcome>;
  getRunOutcome(runId: string): Promise<RunOutcome | undefined>;
  getRunOutcomesByAgent(agentType: AgentType, limit?: number): Promise<RunOutcome[]>;
  updateRunOutcome(runId: string, updates: Partial<InsertRunOutcome>): Promise<RunOutcome | undefined>;
  getAcceptanceRate(agentType: AgentType): Promise<number>;
  cleanupOldOutcomes(retentionDays: number): Promise<number>;

  createFeedback(feedback: InsertHumanFeedback): Promise<HumanFeedback>;
  getFeedbackByRunId(runId: string): Promise<HumanFeedback | undefined>;
  getFeedbackByTags(tags: string[], limit?: number): Promise<HumanFeedback[]>;

  createPromptVariant(variant: InsertPromptVariant): Promise<PromptVariant>;
  getPromptVariant(id: string): Promise<PromptVariant | undefined>;
  getPromotedVariant(agentType: AgentType): Promise<PromptVariant | undefined>;
  getVariantsByStatus(agentType: AgentType, status: PromptStatus): Promise<PromptVariant[]>;
  updatePromptVariant(id: string, updates: Partial<InsertPromptVariant>): Promise<PromptVariant | undefined>;
  getNextVersionNumber(agentType: AgentType): Promise<number>;

  createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry>;
  getMemoryEntry(id: string): Promise<MemoryEntry | undefined>;
  findSimilarMemories(agentType: AgentType, embedding: number[], limit?: number): Promise<MemoryEntry[]>;
  incrementAccessCount(id: string): Promise<void>;
  cleanupExpiredMemories(): Promise<number>;
}

export interface IAgentMonitor {
  createAgentReport(report: InsertAgentReport): Promise<AgentReport>;
  getAgentReport(id: string): Promise<AgentReport | undefined>;
  getAgentReportsByProject(projectId: string, limit?: number): Promise<AgentReport[]>;
  getAgentReportsByCategory(category: FailureCategory, limit?: number): Promise<AgentReport[]>;
  getAgentReportsWithFailures(projectId: string): Promise<AgentReport[]>;
  cleanupOldReports(retentionDays: number): Promise<number>;

  createProjectGuidelines(guidelines: InsertProjectGuidelines): Promise<ProjectGuidelines>;
  getProjectGuidelines(projectId: string): Promise<ProjectGuidelines | undefined>;
  updateProjectGuidelines(projectId: string, updates: Partial<InsertProjectGuidelines>): Promise<ProjectGuidelines | undefined>;

  createFailurePattern(pattern: InsertFailurePattern): Promise<FailurePattern>;
  getFailurePattern(id: string): Promise<FailurePattern | undefined>;
  getFailurePatternsByProject(projectId: string): Promise<FailurePattern[]>;
  getFailurePatternsByCategory(category: FailureCategory): Promise<FailurePattern[]>;
  getGlobalPatterns(): Promise<FailurePattern[]>;
  incrementPatternOccurrence(id: string): Promise<FailurePattern | undefined>;
  updateFailurePattern(id: string, updates: Partial<InsertFailurePattern>): Promise<FailurePattern | undefined>;

  getMonitorAnalytics(projectId?: string): Promise<MonitorAnalytics>;
}

export class MemStorage implements IStorage, IDataTelemetry, IAgentMonitor {
  private users: Map<string, User>;
  private runOutcomes: Map<string, RunOutcome>;
  private humanFeedbackStore: Map<string, HumanFeedback>;
  private promptVariants: Map<string, PromptVariant>;
  private memoryEntries: Map<string, MemoryEntry>;
  private agentReports: Map<string, AgentReport>;
  private projectGuidelinesStore: Map<string, ProjectGuidelines>;
  private failurePatternsStore: Map<string, FailurePattern>;

  constructor() {
    this.users = new Map();
    this.runOutcomes = new Map();
    this.humanFeedbackStore = new Map();
    this.promptVariants = new Map();
    this.memoryEntries = new Map();
    this.agentReports = new Map();
    this.projectGuidelinesStore = new Map();
    this.failurePatternsStore = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRunOutcome(outcome: InsertRunOutcome): Promise<RunOutcome> {
    const id = randomUUID();
    const runOutcome: RunOutcome = {
      id,
      runId: outcome.runId,
      agentType: outcome.agentType as AgentType,
      outcomeStatus: outcome.outcomeStatus as RunOutcome["outcomeStatus"],
      editDistance: outcome.editDistance ?? null,
      timeToDecision: outcome.timeToDecision ?? null,
      grokAgreed: outcome.grokAgreed ?? null,
      classicMetrics: outcome.classicMetrics ?? null,
      promptVersion: outcome.promptVersion ?? null,
      createdAt: new Date(),
    };
    this.runOutcomes.set(outcome.runId, runOutcome);
    return runOutcome;
  }

  async getRunOutcome(runId: string): Promise<RunOutcome | undefined> {
    return this.runOutcomes.get(runId);
  }

  async getRunOutcomesByAgent(agentType: AgentType, limit = 100): Promise<RunOutcome[]> {
    const outcomes: RunOutcome[] = [];
    this.runOutcomes.forEach((o) => {
      if (o.agentType === agentType) {
        outcomes.push(o);
      }
    });
    return outcomes
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateRunOutcome(runId: string, updates: Partial<InsertRunOutcome>): Promise<RunOutcome | undefined> {
    const existing = this.runOutcomes.get(runId);
    if (!existing) return undefined;
    const updated: RunOutcome = {
      ...existing,
      editDistance: updates.editDistance !== undefined ? updates.editDistance ?? null : existing.editDistance,
      timeToDecision: updates.timeToDecision !== undefined ? updates.timeToDecision ?? null : existing.timeToDecision,
      grokAgreed: updates.grokAgreed !== undefined ? updates.grokAgreed ?? null : existing.grokAgreed,
      classicMetrics: updates.classicMetrics !== undefined ? updates.classicMetrics ?? null : existing.classicMetrics,
      promptVersion: updates.promptVersion !== undefined ? updates.promptVersion ?? null : existing.promptVersion,
      outcomeStatus: (updates.outcomeStatus ?? existing.outcomeStatus) as RunOutcome["outcomeStatus"],
      agentType: (updates.agentType ?? existing.agentType) as AgentType,
      runId: updates.runId ?? existing.runId,
    };
    this.runOutcomes.set(runId, updated);
    return updated;
  }

  async getAcceptanceRate(agentType: AgentType): Promise<number> {
    const outcomes: RunOutcome[] = [];
    this.runOutcomes.forEach((o) => {
      if (o.agentType === agentType) {
        outcomes.push(o);
      }
    });
    if (outcomes.length === 0) return 0;
    const accepted = outcomes.filter((o) => o.outcomeStatus === "accepted").length;
    return accepted / outcomes.length;
  }

  async cleanupOldOutcomes(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    let deleted = 0;
    const toDelete: string[] = [];
    this.runOutcomes.forEach((outcome, runId) => {
      if (outcome.createdAt < cutoff) {
        toDelete.push(runId);
      }
    });
    for (const runId of toDelete) {
      this.runOutcomes.delete(runId);
      deleted++;
    }
    return deleted;
  }

  async createFeedback(feedback: InsertHumanFeedback): Promise<HumanFeedback> {
    const id = randomUUID();
    const humanFeedback: HumanFeedback = {
      id,
      runId: feedback.runId,
      rating: feedback.rating ?? null,
      tags: feedback.tags ?? null,
      comment: feedback.comment ?? null,
      submittedAt: new Date(),
    };
    this.humanFeedbackStore.set(id, humanFeedback);
    return humanFeedback;
  }

  async getFeedbackByRunId(runId: string): Promise<HumanFeedback | undefined> {
    let found: HumanFeedback | undefined;
    this.humanFeedbackStore.forEach((f) => {
      if (f.runId === runId) {
        found = f;
      }
    });
    return found;
  }

  async getFeedbackByTags(tags: string[], limit = 100): Promise<HumanFeedback[]> {
    const results: HumanFeedback[] = [];
    this.humanFeedbackStore.forEach((f) => {
      if (f.tags?.some((t) => tags.includes(t))) {
        results.push(f);
      }
    });
    return results.slice(0, limit);
  }

  async createPromptVariant(variant: InsertPromptVariant): Promise<PromptVariant> {
    const id = randomUUID();
    const promptVariant: PromptVariant = {
      id,
      agentType: variant.agentType as AgentType,
      version: variant.version,
      promptText: variant.promptText,
      status: variant.status as PromptVariant["status"],
      trafficPercent: variant.trafficPercent ?? null,
      metrics: variant.metrics ?? null,
      createdAt: new Date(),
      promotedAt: variant.promotedAt ?? null,
      retiredAt: variant.retiredAt ?? null,
    };
    this.promptVariants.set(id, promptVariant);
    return promptVariant;
  }

  async getPromptVariant(id: string): Promise<PromptVariant | undefined> {
    return this.promptVariants.get(id);
  }

  async getPromotedVariant(agentType: AgentType): Promise<PromptVariant | undefined> {
    let found: PromptVariant | undefined;
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType && v.status === "promoted") {
        found = v;
      }
    });
    return found;
  }

  async getVariantsByStatus(agentType: AgentType, status: PromptStatus): Promise<PromptVariant[]> {
    const results: PromptVariant[] = [];
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType && v.status === status) {
        results.push(v);
      }
    });
    return results;
  }

  async updatePromptVariant(id: string, updates: Partial<InsertPromptVariant>): Promise<PromptVariant | undefined> {
    const existing = this.promptVariants.get(id);
    if (!existing) return undefined;
    const updated: PromptVariant = {
      ...existing,
      agentType: (updates.agentType ?? existing.agentType) as AgentType,
      version: updates.version ?? existing.version,
      promptText: updates.promptText ?? existing.promptText,
      status: (updates.status ?? existing.status) as PromptVariant["status"],
      trafficPercent: updates.trafficPercent !== undefined ? updates.trafficPercent ?? null : existing.trafficPercent,
      metrics: updates.metrics !== undefined ? updates.metrics ?? null : existing.metrics,
      promotedAt: updates.promotedAt !== undefined ? updates.promotedAt ?? null : existing.promotedAt,
      retiredAt: updates.retiredAt !== undefined ? updates.retiredAt ?? null : existing.retiredAt,
    };
    this.promptVariants.set(id, updated);
    return updated;
  }

  async getNextVersionNumber(agentType: AgentType): Promise<number> {
    const variants: PromptVariant[] = [];
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType) {
        variants.push(v);
      }
    });
    if (variants.length === 0) return 1;
    return Math.max(...variants.map((v) => v.version)) + 1;
  }

  async createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry> {
    const id = randomUUID();
    const memoryEntry: MemoryEntry = {
      id,
      agentType: entry.agentType as AgentType,
      taskDescription: entry.taskDescription,
      taskEmbedding: entry.taskEmbedding ?? null,
      response: entry.response,
      qualityScore: entry.qualityScore,
      accessCount: 0,
      createdAt: new Date(),
      expiresAt: entry.expiresAt,
    };
    this.memoryEntries.set(id, memoryEntry);
    return memoryEntry;
  }

  async getMemoryEntry(id: string): Promise<MemoryEntry | undefined> {
    return this.memoryEntries.get(id);
  }

  async findSimilarMemories(agentType: AgentType, embedding: number[], limit = 5): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];
    this.memoryEntries.forEach((e) => {
      if (e.agentType === agentType && e.expiresAt > new Date()) {
        entries.push(e);
      }
    });
    
    if (entries.length === 0 || embedding.length === 0) return [];

    const scored = entries
      .filter((e) => e.taskEmbedding && e.taskEmbedding.length === embedding.length)
      .map((e) => {
        const similarity = cosineSimilarity(embedding, e.taskEmbedding!);
        return { entry: e, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored.map((s) => s.entry);
  }

  async incrementAccessCount(id: string): Promise<void> {
    const entry = this.memoryEntries.get(id);
    if (entry) {
      entry.accessCount = (entry.accessCount || 0) + 1;
      this.memoryEntries.set(id, entry);
    }
  }

  async cleanupExpiredMemories(): Promise<number> {
    const now = new Date();
    let deleted = 0;
    const toDelete: string[] = [];
    this.memoryEntries.forEach((entry, id) => {
      if (entry.expiresAt < now) {
        toDelete.push(id);
      }
    });
    for (const id of toDelete) {
      this.memoryEntries.delete(id);
      deleted++;
    }
    return deleted;
  }

  async createAgentReport(report: InsertAgentReport): Promise<AgentReport> {
    const id = randomUUID();
    const agentReport: AgentReport = {
      id,
      projectId: report.projectId,
      externalAgent: report.externalAgent as ExternalAgentType,
      sessionId: report.sessionId ?? null,
      action: report.action,
      codeGenerated: report.codeGenerated ?? null,
      codeAccepted: report.codeAccepted ?? null,
      humanCorrection: report.humanCorrection ?? null,
      errorMessage: report.errorMessage ?? null,
      failureCategory: (report.failureCategory as FailureCategory) ?? null,
      failureSeverity: (report.failureSeverity as FailureSeverity) ?? null,
      filePath: report.filePath ?? null,
      language: report.language ?? null,
      context: report.context ?? null,
      createdAt: new Date(),
    };
    this.agentReports.set(id, agentReport);
    return agentReport;
  }

  async getAgentReport(id: string): Promise<AgentReport | undefined> {
    return this.agentReports.get(id);
  }

  async getAgentReportsByProject(projectId: string, limit = 100): Promise<AgentReport[]> {
    const reports: AgentReport[] = [];
    this.agentReports.forEach((r) => {
      if (r.projectId === projectId) {
        reports.push(r);
      }
    });
    return reports
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getAgentReportsByCategory(category: FailureCategory, limit = 100): Promise<AgentReport[]> {
    const reports: AgentReport[] = [];
    this.agentReports.forEach((r) => {
      if (r.failureCategory === category) {
        reports.push(r);
      }
    });
    return reports
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getAgentReportsWithFailures(projectId: string): Promise<AgentReport[]> {
    const reports: AgentReport[] = [];
    this.agentReports.forEach((r) => {
      if (r.projectId === projectId && r.failureCategory) {
        reports.push(r);
      }
    });
    return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cleanupOldReports(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    let deleted = 0;
    const toDelete: string[] = [];
    this.agentReports.forEach((report, id) => {
      if (report.createdAt < cutoff) {
        toDelete.push(id);
      }
    });
    for (const id of toDelete) {
      this.agentReports.delete(id);
      deleted++;
    }
    return deleted;
  }

  async createProjectGuidelines(guidelines: InsertProjectGuidelines): Promise<ProjectGuidelines> {
    const id = randomUUID();
    const now = new Date();
    const projectGuidelines: ProjectGuidelines = {
      id,
      projectId: guidelines.projectId,
      rulesMarkdown: guidelines.rulesMarkdown,
      ruleCount: guidelines.ruleCount,
      confidence: guidelines.confidence,
      observationCount: guidelines.observationCount,
      enabledCategories: guidelines.enabledCategories ?? null,
      crossProjectLearning: guidelines.crossProjectLearning ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.projectGuidelinesStore.set(guidelines.projectId, projectGuidelines);
    return projectGuidelines;
  }

  async getProjectGuidelines(projectId: string): Promise<ProjectGuidelines | undefined> {
    return this.projectGuidelinesStore.get(projectId);
  }

  async updateProjectGuidelines(projectId: string, updates: Partial<InsertProjectGuidelines>): Promise<ProjectGuidelines | undefined> {
    const existing = this.projectGuidelinesStore.get(projectId);
    if (!existing) return undefined;
    const updated: ProjectGuidelines = {
      ...existing,
      rulesMarkdown: updates.rulesMarkdown ?? existing.rulesMarkdown,
      ruleCount: updates.ruleCount ?? existing.ruleCount,
      confidence: updates.confidence ?? existing.confidence,
      observationCount: updates.observationCount ?? existing.observationCount,
      enabledCategories: updates.enabledCategories !== undefined ? updates.enabledCategories ?? null : existing.enabledCategories,
      crossProjectLearning: updates.crossProjectLearning ?? existing.crossProjectLearning,
      updatedAt: new Date(),
    };
    this.projectGuidelinesStore.set(projectId, updated);
    return updated;
  }

  async createFailurePattern(pattern: InsertFailurePattern): Promise<FailurePattern> {
    const id = randomUUID();
    const now = new Date();
    const failurePattern: FailurePattern = {
      id,
      projectId: pattern.projectId ?? null,
      category: pattern.category as FailureCategory,
      pattern: pattern.pattern,
      occurrences: pattern.occurrences ?? 1,
      exampleCodes: pattern.exampleCodes ?? null,
      exampleCorrections: pattern.exampleCorrections ?? null,
      suggestedRule: pattern.suggestedRule ?? null,
      confidence: pattern.confidence ?? null,
      isGlobal: pattern.isGlobal ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.failurePatternsStore.set(id, failurePattern);
    return failurePattern;
  }

  async getFailurePattern(id: string): Promise<FailurePattern | undefined> {
    return this.failurePatternsStore.get(id);
  }

  async getFailurePatternsByProject(projectId: string): Promise<FailurePattern[]> {
    const patterns: FailurePattern[] = [];
    this.failurePatternsStore.forEach((p) => {
      if (p.projectId === projectId) {
        patterns.push(p);
      }
    });
    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  async getFailurePatternsByCategory(category: FailureCategory): Promise<FailurePattern[]> {
    const patterns: FailurePattern[] = [];
    this.failurePatternsStore.forEach((p) => {
      if (p.category === category) {
        patterns.push(p);
      }
    });
    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  async getGlobalPatterns(): Promise<FailurePattern[]> {
    const patterns: FailurePattern[] = [];
    this.failurePatternsStore.forEach((p) => {
      if (p.isGlobal) {
        patterns.push(p);
      }
    });
    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  async incrementPatternOccurrence(id: string): Promise<FailurePattern | undefined> {
    const existing = this.failurePatternsStore.get(id);
    if (!existing) return undefined;
    const updated: FailurePattern = {
      ...existing,
      occurrences: existing.occurrences + 1,
      updatedAt: new Date(),
    };
    this.failurePatternsStore.set(id, updated);
    return updated;
  }

  async updateFailurePattern(id: string, updates: Partial<InsertFailurePattern>): Promise<FailurePattern | undefined> {
    const existing = this.failurePatternsStore.get(id);
    if (!existing) return undefined;
    const updated: FailurePattern = {
      ...existing,
      projectId: updates.projectId !== undefined ? updates.projectId ?? null : existing.projectId,
      category: (updates.category ?? existing.category) as FailureCategory,
      pattern: updates.pattern ?? existing.pattern,
      occurrences: updates.occurrences ?? existing.occurrences,
      exampleCodes: updates.exampleCodes !== undefined ? updates.exampleCodes ?? null : existing.exampleCodes,
      exampleCorrections: updates.exampleCorrections !== undefined ? updates.exampleCorrections ?? null : existing.exampleCorrections,
      suggestedRule: updates.suggestedRule !== undefined ? updates.suggestedRule ?? null : existing.suggestedRule,
      confidence: updates.confidence !== undefined ? updates.confidence ?? null : existing.confidence,
      isGlobal: updates.isGlobal ?? existing.isGlobal,
      updatedAt: new Date(),
    };
    this.failurePatternsStore.set(id, updated);
    return updated;
  }

  async getMonitorAnalytics(projectId?: string): Promise<MonitorAnalytics> {
    const reports: AgentReport[] = [];
    this.agentReports.forEach((r) => {
      if (!projectId || r.projectId === projectId) {
        reports.push(r);
      }
    });

    const failuresByCategory: Record<FailureCategory, number> = {
      security_gap: 0,
      logic_error: 0,
      context_blindness: 0,
      outdated_api: 0,
      missing_edge_case: 0,
      poor_readability: 0,
      broke_existing: 0,
      hallucinated_code: 0,
    };

    const failuresByAgent: Record<ExternalAgentType, number> = {
      replit_agent: 0,
      cursor: 0,
      copilot: 0,
      claude_code: 0,
      windsurf: 0,
      aider: 0,
      continue: 0,
      cody: 0,
      unknown: 0,
    };

    const failuresBySeverity: Record<FailureSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const dateCounts: Record<string, number> = {};

    reports.forEach((r) => {
      if (r.failureCategory) {
        failuresByCategory[r.failureCategory]++;
        failuresByAgent[r.externalAgent]++;
        if (r.failureSeverity) {
          failuresBySeverity[r.failureSeverity]++;
        }
      }
      const dateKey = r.createdAt.toISOString().split("T")[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    const patterns: FailurePattern[] = [];
    this.failurePatternsStore.forEach((p) => {
      if (!projectId || p.projectId === projectId || p.isGlobal) {
        patterns.push(p);
      }
    });

    const topPatterns = patterns
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map((p) => ({
        pattern: p.pattern,
        occurrences: p.occurrences,
        category: p.category,
      }));

    const recentTrend = Object.entries(dateCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    return {
      totalReports: reports.length,
      failuresByCategory,
      failuresByAgent,
      failuresBySeverity,
      topPatterns,
      recentTrend,
    };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const storage = new MemStorage();
