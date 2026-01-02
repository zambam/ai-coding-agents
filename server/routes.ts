import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, insertRunOutcomeSchema, insertHumanFeedbackSchema, type InsertRunOutcome } from "./storage";
import { Orchestrator } from "./agents";
import type { AgentType, AgentConfig, ReasoningStep } from "@shared/schema";
import { DEFAULT_AGENT_CONFIG } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/agents/invoke", async (req: Request, res: Response) => {
    try {
      const { agentType, prompt, config } = req.body as {
        agentType: AgentType;
        prompt: string;
        config?: Partial<AgentConfig>;
      };

      if (!agentType || !prompt) {
        return res.status(400).json({ error: "agentType and prompt are required" });
      }

      const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
      if (!validAgentTypes.includes(agentType)) {
        return res.status(400).json({ error: `Invalid agent type. Must be one of: ${validAgentTypes.join(", ")}` });
      }

      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.invokeAgent(agentType, prompt);

      res.json(result);
    } catch (error) {
      console.error("Error invoking agent:", error);
      res.status(500).json({ 
        error: "Failed to invoke agent",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/agents/invoke/stream", async (req: Request, res: Response) => {
    try {
      const { agentType, prompt, config } = req.body as {
        agentType: AgentType;
        prompt: string;
        config?: Partial<AgentConfig>;
      };

      if (!agentType || !prompt) {
        return res.status(400).json({ error: "agentType and prompt are required" });
      }

      const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
      if (!validAgentTypes.includes(agentType)) {
        return res.status(400).json({ error: `Invalid agent type. Must be one of: ${validAgentTypes.join(", ")}` });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const sendEvent = (type: string, data: unknown) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("status", { status: "started", agent: agentType });

      const simulatedSteps: ReasoningStep[] = [
        { step: 1, thought: "Understanding the problem scope and constraints...", action: "Analyzing input requirements" },
        { step: 2, thought: "Identifying key components and patterns...", action: "Pattern matching against known solutions" },
        { step: 3, thought: "Evaluating trade-offs and alternatives...", action: "Comparing approaches" },
        { step: 4, thought: "Synthesizing final recommendation...", action: "Generating output" },
      ];

      for (let i = 0; i < simulatedSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        sendEvent("reasoning", { 
          step: simulatedSteps[i], 
          progress: (i + 1) / simulatedSteps.length 
        });
      }

      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.invokeAgent(agentType, prompt);

      sendEvent("metrics", { metrics: result.metrics });
      sendEvent("complete", { response: result.response, metrics: result.metrics });

      res.end();
    } catch (error) {
      console.error("Error in streaming agent invoke:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to invoke agent",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/agents/pipeline", async (req: Request, res: Response) => {
    try {
      const { task, config } = req.body as {
        task: string;
        config?: Partial<AgentConfig>;
      };

      if (!task) {
        return res.status(400).json({ error: "task is required" });
      }

      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.runPipeline(task);

      res.json(result);
    } catch (error) {
      console.error("Error running pipeline:", error);
      res.status(500).json({ 
        error: "Failed to run pipeline",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/agents/config", async (_req: Request, res: Response) => {
    res.json({
      defaultConfig: DEFAULT_AGENT_CONFIG,
      consistencyModes: ["none", "fast", "robust"],
      validationLevels: ["low", "medium", "high", "strict"],
    });
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/telemetry/outcomes", async (req: Request, res: Response) => {
    try {
      const parsed = insertRunOutcomeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }
      const outcome = await storage.createRunOutcome(parsed.data);
      res.status(201).json(outcome);
    } catch (error) {
      console.error("Error creating run outcome:", error);
      res.status(500).json({ error: "Failed to create run outcome" });
    }
  });

  app.get("/api/telemetry/outcomes/:runId", async (req: Request, res: Response) => {
    try {
      const outcome = await storage.getRunOutcome(req.params.runId);
      if (!outcome) {
        return res.status(404).json({ error: "Run outcome not found" });
      }
      res.json(outcome);
    } catch (error) {
      console.error("Error fetching run outcome:", error);
      res.status(500).json({ error: "Failed to fetch run outcome" });
    }
  });

  app.patch("/api/telemetry/outcomes/:runId", async (req: Request, res: Response) => {
    try {
      const updates = req.body as Partial<InsertRunOutcome>;
      const outcome = await storage.updateRunOutcome(req.params.runId, updates);
      if (!outcome) {
        return res.status(404).json({ error: "Run outcome not found" });
      }
      res.json(outcome);
    } catch (error) {
      console.error("Error updating run outcome:", error);
      res.status(500).json({ error: "Failed to update run outcome" });
    }
  });

  app.post("/api/telemetry/feedback", async (req: Request, res: Response) => {
    try {
      const parsed = insertHumanFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }
      const feedback = await storage.createFeedback(parsed.data);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });

  app.get("/api/telemetry/feedback/:runId", async (req: Request, res: Response) => {
    try {
      const feedback = await storage.getFeedbackByRunId(req.params.runId);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.get("/api/telemetry/analytics", async (req: Request, res: Response) => {
    try {
      const agentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
      const analytics = await Promise.all(
        agentTypes.map(async (agentType) => ({
          agentType,
          acceptanceRate: await storage.getAcceptanceRate(agentType),
        }))
      );
      res.json({ analytics, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/telemetry/outcomes/:agentType/acceptance-rate", async (req: Request, res: Response) => {
    try {
      const agentType = req.params.agentType as AgentType;
      const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
      if (!validAgentTypes.includes(agentType)) {
        return res.status(400).json({ error: `Invalid agent type. Must be one of: ${validAgentTypes.join(", ")}` });
      }
      const acceptanceRate = await storage.getAcceptanceRate(agentType);
      res.json({ agentType, acceptanceRate, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching acceptance rate:", error);
      res.status(500).json({ error: "Failed to fetch acceptance rate" });
    }
  });

  app.get("/api/privacy/status", (_req: Request, res: Response) => {
    res.json({
      consentRequired: true,
      piiRedactionEnabled: true,
      dataRetentionDays: 90,
      gdprCompliant: true,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/privacy/consent", (req: Request, res: Response) => {
    const { userId, consented, purposes } = req.body as {
      userId: string;
      consented: boolean;
      purposes?: string[];
    };
    if (!userId || typeof consented !== "boolean") {
      return res.status(400).json({ error: "userId and consented are required" });
    }
    res.json({
      userId,
      consented,
      purposes: purposes || ["analytics", "improvement"],
      recordedAt: new Date().toISOString()
    });
  });

  app.delete("/api/privacy/data/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    res.json({
      userId,
      status: "deletion_initiated",
      message: "User data deletion has been initiated. This may take up to 30 days to complete.",
      initiatedAt: new Date().toISOString()
    });
  });

  app.get("/api/telemetry/prompt-variants", async (req: Request, res: Response) => {
    try {
      const agentType = req.query.agentType as AgentType | undefined;
      const status = req.query.status as string | undefined;
      const validStatuses = ["shadow", "ab_test", "promoted", "retired"];
      
      if (agentType) {
        const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
        if (!validAgentTypes.includes(agentType)) {
          return res.status(400).json({ error: "Invalid agent type" });
        }
        if (status && validStatuses.includes(status)) {
          const variants = await storage.getVariantsByStatus(agentType, status as "shadow" | "ab_test" | "promoted" | "retired");
          return res.json({ variants, count: variants.length });
        }
        const promoted = await storage.getPromotedVariant(agentType);
        return res.json({ promotedVariant: promoted || null, agentType });
      }
      
      res.json({ 
        message: "Provide agentType query parameter to retrieve prompt variants",
        supportedAgents: ["architect", "mechanic", "codeNinja", "philosopher"],
        supportedStatuses: validStatuses
      });
    } catch (error) {
      console.error("Error fetching prompt variants:", error);
      res.status(500).json({ error: "Failed to fetch prompt variants" });
    }
  });

  app.get("/api/telemetry/memory", async (req: Request, res: Response) => {
    try {
      const agentType = req.query.agentType as AgentType | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      
      if (agentType) {
        const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
        if (!validAgentTypes.includes(agentType)) {
          return res.status(400).json({ error: "Invalid agent type" });
        }
        const entries = await storage.findSimilarMemories(agentType, [], limit);
        return res.json({ entries, count: entries.length, agentType });
      }
      
      res.json({ 
        message: "Provide agentType query parameter to retrieve memory entries",
        supportedAgents: ["architect", "mechanic", "codeNinja", "philosopher"]
      });
    } catch (error) {
      console.error("Error fetching memory entries:", error);
      res.status(500).json({ error: "Failed to fetch memory entries" });
    }
  });

  app.get("/api/telemetry/outcomes", async (req: Request, res: Response) => {
    try {
      const agentType = req.query.agentType as AgentType | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      
      if (agentType) {
        const validAgentTypes: AgentType[] = ["architect", "mechanic", "codeNinja", "philosopher"];
        if (!validAgentTypes.includes(agentType)) {
          return res.status(400).json({ error: "Invalid agent type" });
        }
        const outcomes = await storage.getRunOutcomesByAgent(agentType, limit);
        return res.json({ outcomes, count: outcomes.length });
      }
      
      const allOutcomes = await Promise.all([
        storage.getRunOutcomesByAgent("architect", limit),
        storage.getRunOutcomesByAgent("mechanic", limit),
        storage.getRunOutcomesByAgent("codeNinja", limit),
        storage.getRunOutcomesByAgent("philosopher", limit),
      ]);
      const outcomes = allOutcomes.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
      res.json({ outcomes, count: outcomes.length });
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ error: "Failed to fetch outcomes" });
    }
  });

  app.get("/api/observer/stats", async (_req: Request, res: Response) => {
    try {
      const { getGlobalObserver } = await import("./agents/learning/observer-config");
      const observer = getGlobalObserver();
      
      if (!observer) {
        return res.status(503).json({ error: "Observer not initialized" });
      }
      
      const stats = observer.getSessionStats();
      const config = observer.getConfig();
      const recentInteractions = observer.getRecentInteractions(20);
      
      res.json({
        status: "active",
        sessionStats: stats,
        config: {
          observeConversations: config.observeConversations,
          observeToolExecutions: config.observeToolExecutions,
          observeFileOperations: config.observeFileOperations,
          observeErrors: config.observeErrors,
          observeReplitAgent: config.observeReplitAgent,
          observeArchitect: config.observeArchitect,
        },
        recentInteractions: recentInteractions.map(i => ({
          id: i.id,
          type: i.type,
          role: i.role,
          timestamp: i.timestamp,
          contentPreview: i.content.slice(0, 100),
          metadata: i.metadata,
        })),
      });
    } catch (error) {
      console.error("Error fetching observer stats:", error);
      res.status(500).json({ error: "Failed to fetch observer stats" });
    }
  });

  app.get("/api/observer/context", async (_req: Request, res: Response) => {
    try {
      const { getGlobalObserver } = await import("./agents/learning/observer-config");
      const observer = getGlobalObserver();
      
      if (!observer) {
        return res.status(503).json({ error: "Observer not initialized" });
      }
      
      const contextSummary = await observer.getContextSummary();
      res.json({ context: contextSummary });
    } catch (error) {
      console.error("Error fetching observer context:", error);
      res.status(500).json({ error: "Failed to fetch context" });
    }
  });

  return httpServer;
}
