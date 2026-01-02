import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../../server/storage";
describe("Telemetry Storage", () => {
    let storage;
    beforeEach(() => {
        storage = new MemStorage();
    });
    describe("Run Outcomes", () => {
        const sampleOutcome = {
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
                outcome.createdAt = oldDate;
            }
            const deleted = await storage.cleanupOldOutcomes(90);
            expect(deleted).toBe(1);
            const remaining = await storage.getRunOutcome("run-123");
            expect(remaining).toBeUndefined();
        });
    });
    describe("Human Feedback", () => {
        const sampleFeedback = {
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
        const sampleVariant = {
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
        const sampleMemory = {
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
//# sourceMappingURL=telemetry.test.js.map