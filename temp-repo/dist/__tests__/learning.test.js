import { describe, it, expect, beforeEach } from "vitest";
import { PromptOptimizer } from "../../server/agents/learning/prompt-optimizer";
import { OutcomeLearner } from "../../server/agents/learning/outcome-learner";
import { MemoryManager } from "../../server/agents/learning/memory-manager";
import { MemStorage } from "../../server/storage";
describe("Self-Learning Infrastructure", () => {
    let storage;
    beforeEach(() => {
        storage = new MemStorage();
    });
    describe("PromptOptimizer", () => {
        let optimizer;
        beforeEach(() => {
            optimizer = new PromptOptimizer(storage);
        });
        it("returns null when no variants exist", async () => {
            const result = await optimizer.selectPromptVariant("architect");
            expect(result).toBeNull();
        });
        it("selects promoted variant when no A/B tests exist", async () => {
            await storage.createPromptVariant({
                agentType: "architect",
                version: 1,
                promptText: "You are The Architect...",
                status: "promoted",
                trafficPercent: 100,
            });
            const result = await optimizer.selectPromptVariant("architect");
            expect(result).not.toBeNull();
            expect(result?.version).toBe(1);
            expect(result?.promptText).toContain("Architect");
        });
        it("creates shadow variant with correct version", async () => {
            const v1 = await optimizer.createShadowVariant("mechanic", "Test prompt v1");
            expect(v1.version).toBe(1);
            expect(v1.status).toBe("shadow");
            const v2 = await optimizer.createShadowVariant("mechanic", "Test prompt v2");
            expect(v2.version).toBe(2);
        });
        it("promotes shadow to A/B test with traffic cap", async () => {
            const shadow = await optimizer.createShadowVariant("codeNinja", "Test prompt");
            const abTest = await optimizer.promoteToABTest(shadow.id, 70);
            expect(abTest?.status).toBe("ab_test");
            expect(abTest?.trafficPercent).toBe(50);
        });
        it("computes variant metrics from outcomes", async () => {
            const variant = await storage.createPromptVariant({
                agentType: "philosopher",
                version: 1,
                promptText: "Test",
                status: "promoted",
                trafficPercent: 100,
            });
            await storage.createRunOutcome({
                runId: "run-1",
                agentType: "philosopher",
                outcomeStatus: "accepted",
                promptVersion: variant.id,
                editDistance: 10,
                timeToDecision: 1000,
            });
            await storage.createRunOutcome({
                runId: "run-2",
                agentType: "philosopher",
                outcomeStatus: "rejected",
                promptVersion: variant.id,
                editDistance: 50,
                timeToDecision: 2000,
            });
            const outcomes = await storage.getRunOutcomesByAgent("philosopher");
            const metrics = await optimizer.computeVariantMetrics(variant.id, outcomes);
            expect(metrics.sampleSize).toBe(2);
            expect(metrics.acceptanceRate).toBe(0.5);
            expect(metrics.avgEditDistance).toBe(30);
            expect(metrics.avgLatency).toBe(1500);
        });
        it("evaluates A/B test with insufficient data", async () => {
            await storage.createPromptVariant({
                agentType: "architect",
                version: 1,
                promptText: "Control",
                status: "promoted",
                trafficPercent: 90,
            });
            await storage.createPromptVariant({
                agentType: "architect",
                version: 2,
                promptText: "Challenger",
                status: "ab_test",
                trafficPercent: 10,
            });
            const result = await optimizer.evaluateABTest("architect");
            expect(result.significant).toBe(false);
            expect(result.winner).toBeNull();
        });
        it("selects variant based on traffic weights", async () => {
            await storage.createPromptVariant({
                agentType: "mechanic",
                version: 1,
                promptText: "Promoted",
                status: "promoted",
                trafficPercent: 50,
            });
            await storage.createPromptVariant({
                agentType: "mechanic",
                version: 2,
                promptText: "AB Test",
                status: "ab_test",
                trafficPercent: 50,
            });
            const selections = [];
            for (let i = 0; i < 100; i++) {
                const result = await optimizer.selectPromptVariant("mechanic");
                selections.push(result.version);
            }
            const v1Count = selections.filter((v) => v === 1).length;
            const v2Count = selections.filter((v) => v === 2).length;
            expect(v1Count).toBeGreaterThan(20);
            expect(v2Count).toBeGreaterThan(20);
        });
    });
    describe("OutcomeLearner", () => {
        let learner;
        beforeEach(() => {
            learner = new OutcomeLearner(storage, { minDataPoints: 5 });
        });
        it("returns neutral signal with insufficient data", async () => {
            const signal = await learner.analyzeAgentPerformance("architect");
            expect(signal.signalType).toBe("neutral");
            expect(signal.strength).toBe(0);
            expect(signal.insights).toContain("Insufficient data for analysis");
        });
        it("detects positive performance signal", async () => {
            for (let i = 0; i < 10; i++) {
                await storage.createRunOutcome({
                    runId: `run-${i}`,
                    agentType: "mechanic",
                    outcomeStatus: "accepted",
                });
            }
            const signal = await learner.analyzeAgentPerformance("mechanic");
            expect(signal.signalType).toBe("positive");
            expect(signal.dataPoints).toBe(10);
        });
        it("detects negative performance signal", async () => {
            for (let i = 0; i < 10; i++) {
                await storage.createRunOutcome({
                    runId: `run-${i}`,
                    agentType: "codeNinja",
                    outcomeStatus: "rejected",
                });
            }
            const signal = await learner.analyzeAgentPerformance("codeNinja");
            expect(signal.signalType).toBe("negative");
            expect(signal.suggestedImprovements.length).toBeGreaterThan(0);
        });
        it("identifies feedback patterns", async () => {
            await storage.createRunOutcome({
                runId: "run-1",
                agentType: "philosopher",
                outcomeStatus: "rejected",
            });
            await storage.createFeedback({
                runId: "run-1",
                rating: 2,
                tags: ["too_verbose", "confusing"],
            });
            await storage.createRunOutcome({
                runId: "run-2",
                agentType: "philosopher",
                outcomeStatus: "edited",
            });
            await storage.createFeedback({
                runId: "run-2",
                rating: 3,
                tags: ["too_verbose"],
            });
            const patterns = await learner.identifyFeedbackPatterns("philosopher");
            expect(patterns.length).toBeGreaterThan(0);
            const verbosePattern = patterns.find((p) => p.pattern === "too_verbose");
            expect(verbosePattern?.frequency).toBe(2);
        });
        it("generates improvement suggestions from patterns", async () => {
            for (let i = 0; i < 5; i++) {
                await storage.createRunOutcome({
                    runId: `run-${i}`,
                    agentType: "architect",
                    outcomeStatus: "rejected",
                });
                await storage.createFeedback({
                    runId: `run-${i}`,
                    tags: ["incorrect"],
                });
            }
            const suggestions = await learner.generateImprovementSuggestions("architect");
            const hasAccuracySuggestion = suggestions.some((s) => s.includes("accuracy"));
            expect(hasAccuracySuggestion).toBe(true);
        });
        it("computes Grok agreement rate", async () => {
            await storage.createRunOutcome({
                runId: "run-1",
                agentType: "mechanic",
                outcomeStatus: "accepted",
                grokAgreed: true,
            });
            await storage.createRunOutcome({
                runId: "run-2",
                agentType: "mechanic",
                outcomeStatus: "accepted",
                grokAgreed: false,
            });
            const rate = await learner.computeGrokAgreementRate("mechanic");
            expect(rate).toBe(0.5);
        });
    });
    describe("MemoryManager", () => {
        let memoryManager;
        beforeEach(() => {
            memoryManager = new MemoryManager(storage, {
                similarityThreshold: 0.3,
                maxMemories: 5,
            });
        });
        it("stores memory with embedding", async () => {
            const memory = await memoryManager.storeMemory("architect", "Design a REST API for user management", "Here is the API design...", 0.9);
            expect(memory.id).toBeDefined();
            expect(memory.taskDescription).toBe("Design a REST API for user management");
            expect(memory.qualityScore).toBe(0.9);
            expect(memory.taskEmbedding).toBeDefined();
            expect(memory.taskEmbedding?.length).toBeGreaterThan(0);
        });
        it("retrieves similar memories", async () => {
            await memoryManager.storeMemory("mechanic", "Fix authentication bug in login flow", "The bug was caused by...", 0.85);
            await memoryManager.storeMemory("mechanic", "Resolve database connection timeout", "The timeout was due to...", 0.75);
            const results = await memoryManager.retrieveRelevantMemories("mechanic", "Fix authentication issue");
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].similarity).toBeGreaterThan(0);
        });
        it("builds context from memories", async () => {
            await memoryManager.storeMemory("codeNinja", "Implement pagination for list endpoint", "Added offset and limit parameters...", 0.9);
            const context = await memoryManager.buildContextFromMemories("codeNinja", "Implement pagination for list endpoint");
            expect(context).toContain("Example");
            expect(context).toContain("pagination");
        });
        it("returns empty context when no memories exist", async () => {
            const context = await memoryManager.buildContextFromMemories("philosopher", "Analyze code quality");
            expect(context).toBe("");
        });
        it("prunes expired memories", async () => {
            const entry = await storage.createMemoryEntry({
                agentType: "architect",
                taskDescription: "Old task",
                taskEmbedding: [0.1, 0.2],
                response: "Old response",
                qualityScore: 0.5,
                expiresAt: new Date(Date.now() - 1000),
            });
            const pruned = await memoryManager.pruneExpiredMemories();
            expect(pruned).toBe(1);
        });
        it("gets memory stats for agent", async () => {
            await memoryManager.storeMemory("architect", "Task 1", "Response 1", 0.8);
            await memoryManager.storeMemory("architect", "Task 2", "Response 2", 0.9);
            const stats = await memoryManager.getMemoryStats("architect");
            expect(stats.totalMemories).toBe(2);
            expect(stats.avgQualityScore).toBeCloseTo(0.85, 2);
        });
    });
    describe("Integration: Learning Pipeline", () => {
        it("complete learning flow: store -> analyze -> improve", async () => {
            const optimizer = new PromptOptimizer(storage);
            const learner = new OutcomeLearner(storage, { minDataPoints: 3 });
            const memoryManager = new MemoryManager(storage);
            const variant = await optimizer.createShadowVariant("architect", "You are The Architect, a system design expert...");
            await optimizer.promoteToABTest(variant.id, 100);
            for (let i = 0; i < 5; i++) {
                await storage.createRunOutcome({
                    runId: `learn-run-${i}`,
                    agentType: "architect",
                    outcomeStatus: i < 4 ? "accepted" : "rejected",
                    promptVersion: variant.id,
                });
                if (i < 4) {
                    await memoryManager.storeMemory("architect", `Design task ${i}`, `Successful design response ${i}`, 0.85 + i * 0.02);
                }
            }
            const signal = await learner.analyzeAgentPerformance("architect");
            expect(signal.signalType).toBe("positive");
            expect(signal.dataPoints).toBe(5);
            const memories = await memoryManager.retrieveRelevantMemories("architect", "Design task");
            expect(memories.length).toBeGreaterThan(0);
            const metrics = await optimizer.computeVariantMetrics(variant.id, await storage.getRunOutcomesByAgent("architect"));
            expect(metrics.acceptanceRate).toBe(0.8);
        });
    });
});
//# sourceMappingURL=learning.test.js.map