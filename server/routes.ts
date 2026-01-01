import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Orchestrator } from "./agents";
import type { AgentType, AgentConfig, ConsistencyMode, ValidationLevel, ReasoningStep } from "@shared/schema";

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
    const defaultConfig: AgentConfig = {
      consistencyMode: "fast" as ConsistencyMode,
      validationLevel: "medium" as ValidationLevel,
      enableSelfCritique: true,
      enablePhilosopher: false,
      maxTokens: 4096,
      temperature: 0.7,
    };

    res.json({
      defaultConfig,
      consistencyModes: ["none", "fast", "robust"],
      validationLevels: ["low", "medium", "high", "strict"],
    });
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
