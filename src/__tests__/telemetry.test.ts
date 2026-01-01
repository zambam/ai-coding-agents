import { describe, it, expect, beforeEach } from "vitest";

type AgentType = "architect" | "mechanic" | "codeNinja" | "philosopher";
type PromptStatus = "shadow" | "ab_test" | "promoted" | "retired";
type OutcomeStatus = "accepted" | "rejected" | "edited" | "ignored";

interface StoredCLASSicMetrics {
  cost: number;
  latency: number;
  accuracy: number;
  security: number;
  stability: number;
}

interface InsertRunOutcome {
  runId: string;
  agentType: AgentType;
  outcomeStatus: OutcomeStatus;
  editDistance?: number | null;
  timeToDecision?: number | null;
  grokAgreed?: boolean | null;
  classicMetrics?: StoredCLASSicMetrics | null;
  promptVersion?: string | null;
}

interface RunOutcome extends InsertRunOutcome {
  id: string;
  createdAt: Date;
}

interface InsertHumanFeedback {
  runId: string;
  rating?: number | null;
  tags?: string[] | null;
  comment?: string | null;
}

interface HumanFeedback extends InsertHumanFeedback {
  id: string;
  submittedAt: Date;
}

interface InsertPromptVariant {
  agentType: AgentType;
  version: number;
  promptText: string;
  status: PromptStatus;
  trafficPercent?: number | null;
  metrics?: unknown;
  promotedAt?: Date | null;
  retiredAt?: Date | null;
}

interface PromptVariant extends InsertPromptVariant {
  id: string;
  createdAt: Date;
}

interface InsertMemoryEntry {
  agentType: AgentType;
  taskDescription: string;
  taskEmbedding?: number[] | null;
  response: string;
  qualityScore: number;
  expiresAt: Date;
}

interface MemoryEntry extends InsertMemoryEntry {
  id: string;
  accessCount: number | null;
  createdAt: Date;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class TestMemStorage {
  private runOutcomes = new Map<string, RunOutcome>();
  private humanFeedbackStore = new Map<string, HumanFeedback>();
  private promptVariants = new Map<string, PromptVariant>();
  private memoryEntries = new Map<string, MemoryEntry>();

  async createRunOutcome(outcome: InsertRunOutcome): Promise<RunOutcome> {
    const id = crypto.randomUUID();
    const runOutcome: RunOutcome = {
      id,
      runId: outcome.runId,
      agentType: outcome.agentType,
      outcomeStatus: outcome.outcomeStatus,
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
      if (o.agentType === agentType) outcomes.push(o);
    });
    return outcomes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async updateRunOutcome(runId: string, updates: Partial<InsertRunOutcome>): Promise<RunOutcome | undefined> {
    const existing = this.runOutcomes.get(runId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.runOutcomes.set(runId, updated);
    return updated;
  }

  async getAcceptanceRate(agentType: AgentType): Promise<number> {
    const outcomes: RunOutcome[] = [];
    this.runOutcomes.forEach((o) => {
      if (o.agentType === agentType) outcomes.push(o);
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
      if (outcome.createdAt < cutoff) toDelete.push(runId);
    });
    for (const runId of toDelete) {
      this.runOutcomes.delete(runId);
      deleted++;
    }
    return deleted;
  }

  async createFeedback(feedback: InsertHumanFeedback): Promise<HumanFeedback> {
    const id = crypto.randomUUID();
    const hf: HumanFeedback = {
      id,
      runId: feedback.runId,
      rating: feedback.rating ?? null,
      tags: feedback.tags ?? null,
      comment: feedback.comment ?? null,
      submittedAt: new Date(),
    };
    this.humanFeedbackStore.set(id, hf);
    return hf;
  }

  async getFeedbackByRunId(runId: string): Promise<HumanFeedback | undefined> {
    let found: HumanFeedback | undefined;
    this.humanFeedbackStore.forEach((f) => {
      if (f.runId === runId) found = f;
    });
    return found;
  }

  async getFeedbackByTags(tags: string[], limit = 100): Promise<HumanFeedback[]> {
    const results: HumanFeedback[] = [];
    this.humanFeedbackStore.forEach((f) => {
      if (f.tags?.some((t) => tags.includes(t))) results.push(f);
    });
    return results.slice(0, limit);
  }

  async createPromptVariant(variant: InsertPromptVariant): Promise<PromptVariant> {
    const id = crypto.randomUUID();
    const pv: PromptVariant = {
      id,
      agentType: variant.agentType,
      version: variant.version,
      promptText: variant.promptText,
      status: variant.status,
      trafficPercent: variant.trafficPercent ?? null,
      metrics: variant.metrics ?? null,
      createdAt: new Date(),
      promotedAt: variant.promotedAt ?? null,
      retiredAt: variant.retiredAt ?? null,
    };
    this.promptVariants.set(id, pv);
    return pv;
  }

  async getPromptVariant(id: string): Promise<PromptVariant | undefined> {
    return this.promptVariants.get(id);
  }

  async getPromotedVariant(agentType: AgentType): Promise<PromptVariant | undefined> {
    let found: PromptVariant | undefined;
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType && v.status === "promoted") found = v;
    });
    return found;
  }

  async getVariantsByStatus(agentType: AgentType, status: PromptStatus): Promise<PromptVariant[]> {
    const results: PromptVariant[] = [];
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType && v.status === status) results.push(v);
    });
    return results;
  }

  async updatePromptVariant(id: string, updates: Partial<InsertPromptVariant>): Promise<PromptVariant | undefined> {
    const existing = this.promptVariants.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.promptVariants.set(id, updated as PromptVariant);
    return updated as PromptVariant;
  }

  async getNextVersionNumber(agentType: AgentType): Promise<number> {
    const variants: PromptVariant[] = [];
    this.promptVariants.forEach((v) => {
      if (v.agentType === agentType) variants.push(v);
    });
    if (variants.length === 0) return 1;
    return Math.max(...variants.map((v) => v.version)) + 1;
  }

  async createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const me: MemoryEntry = {
      id,
      agentType: entry.agentType,
      taskDescription: entry.taskDescription,
      taskEmbedding: entry.taskEmbedding ?? null,
      response: entry.response,
      qualityScore: entry.qualityScore,
      accessCount: 0,
      createdAt: new Date(),
      expiresAt: entry.expiresAt,
    };
    this.memoryEntries.set(id, me);
    return me;
  }

  async getMemoryEntry(id: string): Promise<MemoryEntry | undefined> {
    return this.memoryEntries.get(id);
  }

  async incrementAccessCount(id: string): Promise<void> {
    const entry = this.memoryEntries.get(id);
    if (entry) {
      entry.accessCount = (entry.accessCount || 0) + 1;
      this.memoryEntries.set(id, entry);
    }
  }

  async findSimilarMemories(agentType: AgentType, embedding: number[], limit = 5): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];
    this.memoryEntries.forEach((e) => {
      if (e.agentType === agentType && e.expiresAt > new Date()) entries.push(e);
    });
    if (entries.length === 0 || embedding.length === 0) return [];
    const scored = entries
      .filter((e) => e.taskEmbedding && e.taskEmbedding.length === embedding.length)
      .map((e) => ({ entry: e, similarity: cosineSimilarity(embedding, e.taskEmbedding!) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    return scored.map((s) => s.entry);
  }

  async cleanupExpiredMemories(): Promise<number> {
    const now = new Date();
    let deleted = 0;
    const toDelete: string[] = [];
    this.memoryEntries.forEach((entry, id) => {
      if (entry.expiresAt < now) toDelete.push(id);
    });
    for (const id of toDelete) {
      this.memoryEntries.delete(id);
      deleted++;
    }
    return deleted;
  }
}

const MemStorage = TestMemStorage;

describe("Telemetry Storage", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe("Run Outcomes", () => {
    const sampleOutcome: InsertRunOutcome = {
      runId: "run-123",
      agentType: "architect",
      outcomeStatus: "accepted",
      editDistance: 5,
      timeToDecision: 1500,
      grokAgreed: true,
      classicMetrics: {
        cost: 0.05,
        latency: 1200,
        accuracy: 0.95,
        security: 1.0,
        stability: 0.98,
      },
      promptVersion: "v1.0",
    };

    it("creates a run outcome", async () => {
      const outcome = await storage.createRunOutcome(sampleOutcome);

      expect(outcome.id).toBeDefined();
      expect(outcome.runId).toBe("run-123");
      expect(outcome.agentType).toBe("architect");
      expect(outcome.outcomeStatus).toBe("accepted");
      expect(outcome.createdAt).toBeInstanceOf(Date);
    });

    it("gets a run outcome by runId", async () => {
      await storage.createRunOutcome(sampleOutcome);
      const outcome = await storage.getRunOutcome("run-123");

      expect(outcome).toBeDefined();
      expect(outcome?.runId).toBe("run-123");
    });

    it("returns undefined for unknown runId", async () => {
      const outcome = await storage.getRunOutcome("unknown");
      expect(outcome).toBeUndefined();
    });

    it("gets outcomes by agent type", async () => {
      await storage.createRunOutcome({ ...sampleOutcome, runId: "run-1" });
      await storage.createRunOutcome({ ...sampleOutcome, runId: "run-2", agentType: "mechanic" });
      await storage.createRunOutcome({ ...sampleOutcome, runId: "run-3" });

      const architectOutcomes = await storage.getRunOutcomesByAgent("architect");
      expect(architectOutcomes).toHaveLength(2);

      const mechanicOutcomes = await storage.getRunOutcomesByAgent("mechanic");
      expect(mechanicOutcomes).toHaveLength(1);
    });

    it("updates a run outcome", async () => {
      await storage.createRunOutcome(sampleOutcome);
      const updated = await storage.updateRunOutcome("run-123", {
        outcomeStatus: "edited",
        editDistance: 10,
      });

      expect(updated?.outcomeStatus).toBe("edited");
      expect(updated?.editDistance).toBe(10);
      expect(updated?.timeToDecision).toBe(1500);
    });

    it("returns undefined when updating unknown runId", async () => {
      const result = await storage.updateRunOutcome("unknown", { editDistance: 5 });
      expect(result).toBeUndefined();
    });

    it("calculates acceptance rate", async () => {
      await storage.createRunOutcome({ ...sampleOutcome, runId: "r1", outcomeStatus: "accepted" });
      await storage.createRunOutcome({ ...sampleOutcome, runId: "r2", outcomeStatus: "accepted" });
      await storage.createRunOutcome({ ...sampleOutcome, runId: "r3", outcomeStatus: "rejected" });
      await storage.createRunOutcome({ ...sampleOutcome, runId: "r4", outcomeStatus: "edited" });

      const rate = await storage.getAcceptanceRate("architect");
      expect(rate).toBe(0.5);
    });

    it("returns 0 acceptance rate for no outcomes", async () => {
      const rate = await storage.getAcceptanceRate("architect");
      expect(rate).toBe(0);
    });

    it("cleans up old outcomes", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      await storage.createRunOutcome(sampleOutcome);
      const outcome = await storage.getRunOutcome("run-123");
      if (outcome) {
        (outcome as { createdAt: Date }).createdAt = oldDate;
      }

      const deleted = await storage.cleanupOldOutcomes(90);
      expect(deleted).toBe(1);

      const remaining = await storage.getRunOutcome("run-123");
      expect(remaining).toBeUndefined();
    });
  });

  describe("Human Feedback", () => {
    const sampleFeedback: InsertHumanFeedback = {
      runId: "run-456",
      rating: 4,
      tags: ["helpful", "creative"],
      comment: "Great response!",
    };

    it("creates feedback", async () => {
      const feedback = await storage.createFeedback(sampleFeedback);

      expect(feedback.id).toBeDefined();
      expect(feedback.runId).toBe("run-456");
      expect(feedback.rating).toBe(4);
      expect(feedback.tags).toEqual(["helpful", "creative"]);
      expect(feedback.submittedAt).toBeInstanceOf(Date);
    });

    it("gets feedback by runId", async () => {
      await storage.createFeedback(sampleFeedback);
      const feedback = await storage.getFeedbackByRunId("run-456");

      expect(feedback).toBeDefined();
      expect(feedback?.rating).toBe(4);
    });

    it("returns undefined for unknown runId", async () => {
      const feedback = await storage.getFeedbackByRunId("unknown");
      expect(feedback).toBeUndefined();
    });

    it("gets feedback by tags", async () => {
      await storage.createFeedback({ ...sampleFeedback, runId: "r1", tags: ["helpful"] });
      await storage.createFeedback({ ...sampleFeedback, runId: "r2", tags: ["confusing"] });
      await storage.createFeedback({ ...sampleFeedback, runId: "r3", tags: ["helpful", "slow"] });

      const helpfulFeedback = await storage.getFeedbackByTags(["helpful"]);
      expect(helpfulFeedback).toHaveLength(2);

      const slowFeedback = await storage.getFeedbackByTags(["slow"]);
      expect(slowFeedback).toHaveLength(1);
    });

    it("handles null tags", async () => {
      await storage.createFeedback({ runId: "r1", rating: 3 });
      const feedback = await storage.getFeedbackByTags(["helpful"]);
      expect(feedback).toHaveLength(0);
    });
  });

  describe("Prompt Variants", () => {
    const sampleVariant: InsertPromptVariant = {
      agentType: "architect",
      version: 1,
      promptText: "You are an expert architect...",
      status: "shadow",
      trafficPercent: 10,
    };

    it("creates a prompt variant", async () => {
      const variant = await storage.createPromptVariant(sampleVariant);

      expect(variant.id).toBeDefined();
      expect(variant.agentType).toBe("architect");
      expect(variant.version).toBe(1);
      expect(variant.status).toBe("shadow");
      expect(variant.createdAt).toBeInstanceOf(Date);
    });

    it("gets a variant by id", async () => {
      const created = await storage.createPromptVariant(sampleVariant);
      const variant = await storage.getPromptVariant(created.id);

      expect(variant).toBeDefined();
      expect(variant?.promptText).toBe("You are an expert architect...");
    });

    it("gets promoted variant for agent", async () => {
      await storage.createPromptVariant({ ...sampleVariant, status: "shadow" });
      await storage.createPromptVariant({ ...sampleVariant, version: 2, status: "promoted" });

      const promoted = await storage.getPromotedVariant("architect");
      expect(promoted).toBeDefined();
      expect(promoted?.status).toBe("promoted");
      expect(promoted?.version).toBe(2);
    });

    it("returns undefined when no promoted variant exists", async () => {
      await storage.createPromptVariant(sampleVariant);
      const promoted = await storage.getPromotedVariant("architect");
      expect(promoted).toBeUndefined();
    });

    it("gets variants by status", async () => {
      await storage.createPromptVariant({ ...sampleVariant, version: 1, status: "shadow" });
      await storage.createPromptVariant({ ...sampleVariant, version: 2, status: "ab_test" });
      await storage.createPromptVariant({ ...sampleVariant, version: 3, status: "ab_test" });

      const abTestVariants = await storage.getVariantsByStatus("architect", "ab_test");
      expect(abTestVariants).toHaveLength(2);
    });

    it("updates a variant", async () => {
      const created = await storage.createPromptVariant(sampleVariant);
      const updated = await storage.updatePromptVariant(created.id, {
        status: "promoted",
        trafficPercent: 100,
      });

      expect(updated?.status).toBe("promoted");
      expect(updated?.trafficPercent).toBe(100);
    });

    it("gets next version number", async () => {
      expect(await storage.getNextVersionNumber("architect")).toBe(1);

      await storage.createPromptVariant({ ...sampleVariant, version: 1 });
      expect(await storage.getNextVersionNumber("architect")).toBe(2);

      await storage.createPromptVariant({ ...sampleVariant, version: 5 });
      expect(await storage.getNextVersionNumber("architect")).toBe(6);
    });
  });

  describe("Memory Entries", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const sampleMemory: InsertMemoryEntry = {
      agentType: "codeNinja",
      taskDescription: "Implement a sorting algorithm",
      taskEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      response: "Here is a quicksort implementation...",
      qualityScore: 0.9,
      expiresAt: futureDate,
    };

    it("creates a memory entry", async () => {
      const memory = await storage.createMemoryEntry(sampleMemory);

      expect(memory.id).toBeDefined();
      expect(memory.agentType).toBe("codeNinja");
      expect(memory.qualityScore).toBe(0.9);
      expect(memory.accessCount).toBe(0);
      expect(memory.createdAt).toBeInstanceOf(Date);
    });

    it("gets a memory entry by id", async () => {
      const created = await storage.createMemoryEntry(sampleMemory);
      const memory = await storage.getMemoryEntry(created.id);

      expect(memory).toBeDefined();
      expect(memory?.taskDescription).toBe("Implement a sorting algorithm");
    });

    it("increments access count", async () => {
      const created = await storage.createMemoryEntry(sampleMemory);
      
      await storage.incrementAccessCount(created.id);
      await storage.incrementAccessCount(created.id);
      
      const memory = await storage.getMemoryEntry(created.id);
      expect(memory?.accessCount).toBe(2);
    });

    it("finds similar memories by embedding", async () => {
      await storage.createMemoryEntry({
        ...sampleMemory,
        taskEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        taskDescription: "Task 1",
      });
      await storage.createMemoryEntry({
        ...sampleMemory,
        taskEmbedding: [0.9, 0.8, 0.7, 0.6, 0.5],
        taskDescription: "Task 2",
      });

      const similar = await storage.findSimilarMemories("codeNinja", [0.1, 0.2, 0.3, 0.4, 0.5], 5);
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].taskDescription).toBe("Task 1");
    });

    it("excludes expired memories from search", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const created = await storage.createMemoryEntry({
        ...sampleMemory,
        expiresAt: pastDate,
      });

      const similar = await storage.findSimilarMemories("codeNinja", [0.1, 0.2, 0.3, 0.4, 0.5], 5);
      expect(similar).toHaveLength(0);
    });

    it("cleans up expired memories", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await storage.createMemoryEntry({ ...sampleMemory, expiresAt: pastDate });
      await storage.createMemoryEntry(sampleMemory);

      const deleted = await storage.cleanupExpiredMemories();
      expect(deleted).toBe(1);
    });
  });
});
