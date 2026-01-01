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
  insertRunOutcomeSchema,
  insertHumanFeedbackSchema,
  insertPromptVariantSchema,
  insertMemoryEntrySchema,
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

export { 
  insertRunOutcomeSchema, 
  insertHumanFeedbackSchema, 
  insertPromptVariantSchema, 
  insertMemoryEntrySchema 
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

export class MemStorage implements IStorage, IDataTelemetry {
  private users: Map<string, User>;
  private runOutcomes: Map<string, RunOutcome>;
  private humanFeedbackStore: Map<string, HumanFeedback>;
  private promptVariants: Map<string, PromptVariant>;
  private memoryEntries: Map<string, MemoryEntry>;

  constructor() {
    this.users = new Map();
    this.runOutcomes = new Map();
    this.humanFeedbackStore = new Map();
    this.promptVariants = new Map();
    this.memoryEntries = new Map();
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
