/**
 * Express Router Factory for AI Agent Reporting
 * 
 * Provides a pre-built Express router that host projects can mount
 * to enable agent reporting, analytics, and guidelines endpoints.
 * 
 * Usage:
 * ```typescript
 * import express from 'express';
 * import { createAgentRouter } from 'ai-coding-agents/express';
 * import { myStorage } from './storage';
 * 
 * const app = express();
 * app.use('/api/agents', createAgentRouter(myStorage));
 * ```
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Storage interface that host projects must implement
 */
export interface IAgentStorage {
  createAgentReport(report: AgentReportInput): Promise<AgentReport>;
  getAgentReports(projectId?: string, limit?: number): Promise<AgentReport[]>;
  getAgentAnalytics(projectId?: string): Promise<AgentAnalytics>;
  
  ingestAgentLog?(log: AgentLogInput): Promise<{ id: number }>;
  getAgentLogs?(options: LogQueryOptions): Promise<AgentLog[]>;
  getAgentLogStats?(): Promise<LogStats>;
  
  getProjectGuidelines?(projectId: string): Promise<ProjectGuidelines | null>;
  generateGuidelines?(projectId: string): Promise<ProjectGuidelines>;
}

export interface AgentReportInput {
  projectId: string;
  externalAgent: string;
  action: string;
  codeGenerated?: string;
  codeAccepted?: boolean;
  humanCorrection?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentReport extends AgentReportInput {
  id: number;
  reportId: string;
  detectedFailure: boolean;
  failureCategory?: string;
  failureSeverity?: string;
  createdAt: Date;
}

export interface AgentAnalytics {
  totalReports: number;
  acceptanceRate: number;
  failuresByCategory: Record<string, number>;
  failuresBySeverity: Record<string, number>;
  topPatterns: Array<{ pattern: string; count: number }>;
}

export interface AgentLogInput {
  runId: string;
  level: string;
  message: string;
  service?: string;
  agentType?: string;
  action?: string;
  outcome?: string;
  errorCode?: string;
  promptHash?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface AgentLog extends AgentLogInput {
  id: number;
  receivedAt: Date;
}

export interface LogQueryOptions {
  runId?: string;
  level?: string;
  agentType?: string;
  since?: Date;
  limit?: number;
}

export interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byAgent: Record<string, number>;
  errorCount: number;
  recentRuns: Array<{ runId: string; logCount: number; hasErrors: boolean }>;
}

export interface ProjectGuidelines {
  projectId: string;
  rulesMarkdown: string;
  confidence: number;
  generatedAt: Date;
}

/**
 * Failure detection utilities
 */
export function detectFailure(report: AgentReportInput): boolean {
  if (report.codeAccepted === false) return true;
  if (report.humanCorrection && report.humanCorrection.length > 50) return true;
  return false;
}

export function categorizeFailure(report: AgentReportInput): { category: string; severity: string } | null {
  if (!detectFailure(report)) return null;
  
  if (!report.humanCorrection) {
    return { category: 'rejection', severity: 'medium' };
  }
  
  const len = report.humanCorrection.length;
  if (len > 200) return { category: 'major_rewrite', severity: 'high' };
  if (len > 50) return { category: 'significant_changes', severity: 'medium' };
  return { category: 'minor_correction', severity: 'low' };
}

/**
 * Create an Express router with all agent reporting endpoints
 */
export function createAgentRouter(storage: IAgentStorage): Router {
  const router = Router();
  
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  router.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      service: 'ai-coding-agents',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /external/report',
        'GET /monitor/analytics',
        'GET /reports',
        'GET /guidelines/:projectId',
        'POST /guidelines/generate',
        'POST /logs/ingest',
        'POST /logs/batch',
        'GET /logs',
        'GET /logs/stats'
      ]
    });
  });

  router.post('/external/report', async (req: Request, res: Response) => {
    try {
      const { projectId, externalAgent, action, codeGenerated, codeAccepted, humanCorrection, metadata } = req.body;
      
      if (!projectId || !externalAgent || !action) {
        res.status(400).json({ error: 'Missing required fields: projectId, externalAgent, action' });
        return;
      }
      
      const reportInput: AgentReportInput = {
        projectId,
        externalAgent,
        action,
        codeGenerated,
        codeAccepted,
        humanCorrection,
        metadata
      };
      
      const failure = categorizeFailure(reportInput);
      const report = await storage.createAgentReport({
        ...reportInput,
      });
      
      res.json({
        reportId: report.reportId,
        detectedFailure: report.detectedFailure,
        failureCategory: report.failureCategory,
        failureSeverity: report.failureSeverity
      });
    } catch (error) {
      console.error('[AgentRouter] Report error:', error);
      res.status(500).json({ error: 'Failed to create report' });
    }
  });

  router.get('/monitor/analytics', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const analytics = await storage.getAgentAnalytics(projectId);
      
      const healthScore = calculateHealthScore(analytics);
      
      res.json({
        projectId: projectId || null,
        analytics,
        healthScore
      });
    } catch (error) {
      console.error('[AgentRouter] Analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const reports = await storage.getAgentReports(projectId, limit);
      res.json({ reports });
    } catch (error) {
      console.error('[AgentRouter] Reports error:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  router.get('/guidelines/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      
      if (!storage.getProjectGuidelines) {
        res.status(501).json({ error: 'Guidelines not implemented in storage' });
        return;
      }
      
      const guidelines = await storage.getProjectGuidelines(projectId);
      
      if (!guidelines) {
        res.status(404).json({ error: 'No guidelines found for project', projectId });
        return;
      }
      
      res.json(guidelines);
    } catch (error) {
      console.error('[AgentRouter] Guidelines error:', error);
      res.status(500).json({ error: 'Failed to get guidelines' });
    }
  });

  router.post('/guidelines/generate', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      
      if (!projectId) {
        res.status(400).json({ error: 'Missing projectId' });
        return;
      }
      
      if (!storage.generateGuidelines) {
        res.status(501).json({ error: 'Guidelines generation not implemented in storage' });
        return;
      }
      
      const guidelines = await storage.generateGuidelines(projectId);
      res.json(guidelines);
    } catch (error) {
      console.error('[AgentRouter] Generate guidelines error:', error);
      res.status(500).json({ error: 'Failed to generate guidelines' });
    }
  });

  router.post('/logs/ingest', async (req: Request, res: Response) => {
    try {
      if (!storage.ingestAgentLog) {
        res.status(501).json({ error: 'Log ingestion not implemented in storage' });
        return;
      }
      
      const log = req.body as AgentLogInput;
      
      if (!log.runId || !log.level || !log.message) {
        res.status(400).json({ error: 'Missing required fields: runId, level, message' });
        return;
      }
      
      const result = await storage.ingestAgentLog(log);
      res.json({ ingested: true, id: result.id });
    } catch (error) {
      console.error('[AgentRouter] Log ingest error:', error);
      res.status(500).json({ error: 'Failed to ingest log' });
    }
  });

  router.post('/logs/batch', async (req: Request, res: Response) => {
    try {
      if (!storage.ingestAgentLog) {
        res.status(501).json({ error: 'Log ingestion not implemented in storage' });
        return;
      }
      
      const { logs } = req.body as { logs: AgentLogInput[] };
      
      if (!Array.isArray(logs)) {
        res.status(400).json({ error: 'logs must be an array' });
        return;
      }
      
      let ingested = 0;
      for (const log of logs) {
        if (log.runId && log.level && log.message) {
          await storage.ingestAgentLog(log);
          ingested++;
        }
      }
      
      res.json({ ingested });
    } catch (error) {
      console.error('[AgentRouter] Batch ingest error:', error);
      res.status(500).json({ error: 'Failed to ingest logs' });
    }
  });

  router.get('/logs', async (req: Request, res: Response) => {
    try {
      if (!storage.getAgentLogs) {
        res.status(501).json({ error: 'Log querying not implemented in storage' });
        return;
      }
      
      const options: LogQueryOptions = {
        runId: req.query.runId as string,
        level: req.query.level as string,
        agentType: req.query.agentType as string,
        since: req.query.since ? new Date(req.query.since as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };
      
      const logs = await storage.getAgentLogs(options);
      res.json({ logs });
    } catch (error) {
      console.error('[AgentRouter] Logs query error:', error);
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  router.get('/logs/stats', async (req: Request, res: Response) => {
    try {
      if (!storage.getAgentLogStats) {
        res.status(501).json({ error: 'Log stats not implemented in storage' });
        return;
      }
      
      const stats = await storage.getAgentLogStats();
      res.json({ stats });
    } catch (error) {
      console.error('[AgentRouter] Log stats error:', error);
      res.status(500).json({ error: 'Failed to get log stats' });
    }
  });

  return router;
}

function calculateHealthScore(analytics: AgentAnalytics): number {
  if (analytics.totalReports === 0) return 100;
  
  const acceptanceWeight = 0.6;
  const severityWeight = 0.4;
  
  const acceptanceScore = analytics.acceptanceRate * 100;
  
  const highSeverity = analytics.failuresBySeverity['high'] || 0;
  const mediumSeverity = analytics.failuresBySeverity['medium'] || 0;
  const lowSeverity = analytics.failuresBySeverity['low'] || 0;
  const totalFailures = highSeverity + mediumSeverity + lowSeverity;
  
  let severityScore = 100;
  if (totalFailures > 0) {
    const weightedFailures = (highSeverity * 3 + mediumSeverity * 2 + lowSeverity * 1) / (totalFailures * 3);
    severityScore = (1 - weightedFailures) * 100;
  }
  
  return Math.round(acceptanceScore * acceptanceWeight + severityScore * severityWeight);
}

export default createAgentRouter;
