import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import { insertRunOutcomeSchema, insertHumanFeedbackSchema, MemStorage } from "../../server/storage";
let app;
let testStorage;
beforeEach(() => {
    testStorage = new MemStorage();
    app = express();
    app.use(express.json());
    app.post("/api/telemetry/outcomes", async (req, res) => {
        const parsed = insertRunOutcomeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
        }
        const outcome = await testStorage.createRunOutcome(parsed.data);
        res.status(201).json(outcome);
    });
    app.get("/api/telemetry/outcomes/:runId", async (req, res) => {
        const outcome = await testStorage.getRunOutcome(req.params.runId);
        if (!outcome) {
            return res.status(404).json({ error: "Run outcome not found" });
        }
        res.json(outcome);
    });
    app.patch("/api/telemetry/outcomes/:runId", async (req, res) => {
        const outcome = await testStorage.updateRunOutcome(req.params.runId, req.body);
        if (!outcome) {
            return res.status(404).json({ error: "Run outcome not found" });
        }
        res.json(outcome);
    });
    app.post("/api/telemetry/feedback", async (req, res) => {
        const parsed = insertHumanFeedbackSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
        }
        const feedback = await testStorage.createFeedback(parsed.data);
        res.status(201).json(feedback);
    });
    app.get("/api/telemetry/feedback/:runId", async (req, res) => {
        const feedback = await testStorage.getFeedbackByRunId(req.params.runId);
        if (!feedback) {
            return res.status(404).json({ error: "Feedback not found" });
        }
        res.json(feedback);
    });
    app.get("/api/telemetry/analytics/acceptance/:agentType", async (req, res) => {
        const agentType = req.params.agentType;
        const rate = await testStorage.getAcceptanceRate(agentType);
        res.json({ agentType, acceptanceRate: rate });
    });
});
async function makeRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                server.close();
                return reject(new Error("Could not get server address"));
            }
            const port = address.port;
            const url = `http://localhost:${port}${path}`;
            const options = {
                method,
                headers: { "Content-Type": "application/json" },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            fetch(url, options)
                .then(async (res) => {
                const responseBody = await res.json().catch(() => ({}));
                server.close();
                resolve({ status: res.status, body: responseBody });
            })
                .catch((err) => {
                server.close();
                reject(err);
            });
        });
    });
}
describe("Telemetry API Integration", () => {
    describe("Run Outcomes API", () => {
        it("creates a valid run outcome via POST", async () => {
            const payload = {
                runId: "test-run-123",
                agentType: "architect",
                outcomeStatus: "accepted",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({
                runId: "test-run-123",
                agentType: "architect",
                outcomeStatus: "accepted",
            });
        });
        it("rejects invalid run outcome with missing runId", async () => {
            const payload = {
                agentType: "architect",
                outcomeStatus: "accepted",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(400);
            expect(body).toHaveProperty("error", "Invalid request body");
            expect(body).toHaveProperty("details");
        });
        it("accepts any string for agentType (text field in DB)", async () => {
            const payload = {
                runId: "test-run-456",
                agentType: "customAgent",
                outcomeStatus: "accepted",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({ agentType: "customAgent" });
        });
        it("accepts any string for outcomeStatus (text field in DB)", async () => {
            const payload = {
                runId: "test-run-789",
                agentType: "mechanic",
                outcomeStatus: "custom-status",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({ outcomeStatus: "custom-status" });
        });
        it("retrieves a run outcome via GET", async () => {
            await testStorage.createRunOutcome({
                runId: "get-test-run",
                agentType: "codeNinja",
                outcomeStatus: "rejected",
            });
            const { status, body } = await makeRequest("GET", "/api/telemetry/outcomes/get-test-run");
            expect(status).toBe(200);
            expect(body).toMatchObject({
                runId: "get-test-run",
                agentType: "codeNinja",
                outcomeStatus: "rejected",
            });
        });
        it("returns 404 for non-existent run outcome", async () => {
            const { status, body } = await makeRequest("GET", "/api/telemetry/outcomes/non-existent-run");
            expect(status).toBe(404);
            expect(body).toHaveProperty("error", "Run outcome not found");
        });
        it("updates a run outcome via PATCH", async () => {
            await testStorage.createRunOutcome({
                runId: "patch-test-run",
                agentType: "philosopher",
                outcomeStatus: "ignored",
            });
            const { status, body } = await makeRequest("PATCH", "/api/telemetry/outcomes/patch-test-run", {
                outcomeStatus: "accepted",
                grokAgreed: true,
            });
            expect(status).toBe(200);
            expect(body).toMatchObject({
                runId: "patch-test-run",
                outcomeStatus: "accepted",
                grokAgreed: true,
            });
        });
        it("returns 404 when patching non-existent outcome", async () => {
            const { status, body } = await makeRequest("PATCH", "/api/telemetry/outcomes/no-such-run", {
                outcomeStatus: "accepted",
            });
            expect(status).toBe(404);
            expect(body).toHaveProperty("error", "Run outcome not found");
        });
    });
    describe("Human Feedback API", () => {
        it("creates valid feedback via POST", async () => {
            const payload = {
                runId: "feedback-run-1",
                rating: 5,
                tags: ["helpful", "accurate"],
                comment: "Great response!",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/feedback", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({
                runId: "feedback-run-1",
                rating: 5,
                tags: ["helpful", "accurate"],
                comment: "Great response!",
            });
        });
        it("rejects feedback with missing runId", async () => {
            const payload = {
                rating: 3,
                comment: "No runId provided",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/feedback", payload);
            expect(status).toBe(400);
            expect(body).toHaveProperty("error", "Invalid request body");
        });
        it("accepts feedback with optional fields omitted", async () => {
            const payload = {
                runId: "minimal-feedback-run",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/feedback", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({ runId: "minimal-feedback-run" });
        });
        it("retrieves feedback by runId", async () => {
            await testStorage.createFeedback({
                runId: "get-feedback-run",
                rating: 4,
            });
            const { status, body } = await makeRequest("GET", "/api/telemetry/feedback/get-feedback-run");
            expect(status).toBe(200);
            expect(body).toMatchObject({
                runId: "get-feedback-run",
                rating: 4,
            });
        });
        it("returns 404 for non-existent feedback", async () => {
            const { status, body } = await makeRequest("GET", "/api/telemetry/feedback/no-such-feedback");
            expect(status).toBe(404);
            expect(body).toHaveProperty("error", "Feedback not found");
        });
    });
    describe("Analytics API", () => {
        it("returns acceptance rate for agent type", async () => {
            await testStorage.createRunOutcome({ runId: "a1", agentType: "architect", outcomeStatus: "accepted" });
            await testStorage.createRunOutcome({ runId: "a2", agentType: "architect", outcomeStatus: "accepted" });
            await testStorage.createRunOutcome({ runId: "a3", agentType: "architect", outcomeStatus: "rejected" });
            await testStorage.createRunOutcome({ runId: "a4", agentType: "architect", outcomeStatus: "accepted" });
            const { status, body } = await makeRequest("GET", "/api/telemetry/analytics/acceptance/architect");
            expect(status).toBe(200);
            expect(body).toMatchObject({ agentType: "architect" });
            expect(body.acceptanceRate).toBeCloseTo(0.75);
        });
        it("returns 0 acceptance rate for agent with no outcomes", async () => {
            const { status, body } = await makeRequest("GET", "/api/telemetry/analytics/acceptance/philosopher");
            expect(status).toBe(200);
            expect(body.acceptanceRate).toBe(0);
        });
    });
    describe("Zod Schema Validation", () => {
        it("validates classicMetrics structure in run outcome", async () => {
            const payload = {
                runId: "metrics-run",
                agentType: "mechanic",
                outcomeStatus: "accepted",
                classicMetrics: {
                    cost: 0.05,
                    latency: 1200,
                    accuracy: 0.95,
                    security: 1.0,
                    stability: 0.98,
                },
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(201);
            expect(body).toHaveProperty("classicMetrics");
            expect(body.classicMetrics.cost).toBe(0.05);
        });
        it("accepts classicMetrics as jsonb (flexible structure)", async () => {
            const payload = {
                runId: "flexible-metrics-run",
                agentType: "codeNinja",
                outcomeStatus: "accepted",
                classicMetrics: {
                    customField: "any-value",
                    nested: { data: true },
                },
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/outcomes", payload);
            expect(status).toBe(201);
            expect(body).toHaveProperty("classicMetrics");
        });
        it("accepts any integer rating for feedback (no range validation)", async () => {
            const payload = {
                runId: "rating-run",
                rating: 100,
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/feedback", payload);
            expect(status).toBe(201);
            expect(body).toMatchObject({ rating: 100 });
        });
        it("validates tags is an array for feedback", async () => {
            const payload = {
                runId: "tags-run",
                tags: "not-an-array",
            };
            const { status, body } = await makeRequest("POST", "/api/telemetry/feedback", payload);
            expect(status).toBe(400);
            expect(body).toHaveProperty("error", "Invalid request body");
        });
    });
});
//# sourceMappingURL=telemetry-api.test.js.map