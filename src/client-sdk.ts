/**
 * Client SDK for AI Agent Monitor
 * 
 * Enables client projects to:
 * - Automatically report agent interactions to the central hub
 * - Sync AGENT_RULES.md guidelines
 * - Get analytics for their project
 * 
 * @example
 * ```typescript
 * import { createMonitorClient } from '@ai-coding-agents/cli';
 * 
 * const client = createMonitorClient({
 *   projectId: 'my-project',
 *   hubUrl: 'https://your-hub.replit.app'
 * });
 * 
 * // Report an agent interaction
 * await client.report({
 *   agent: 'cursor',
 *   action: 'code_generated',
 *   codeGenerated: 'function hello() { return "world"; }',
 *   codeAccepted: true
 * });
 * 
 * // Get project guidelines
 * const rules = await client.getGuidelines();
 * ```
 */

import { z } from "zod";

export type ExternalAgentType = 
  | 'replit_agent' 
  | 'cursor' 
  | 'copilot' 
  | 'claude_code' 
  | 'windsurf' 
  | 'aider' 
  | 'continue' 
  | 'cody' 
  | 'unknown';

export interface ClientConfig {
  projectId: string;
  hubUrl?: string;
  autoReport?: boolean;
  autoSyncRules?: boolean;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export interface ReportEvent {
  agent: ExternalAgentType;
  action: string;
  codeGenerated?: string;
  codeAccepted?: boolean;
  humanCorrection?: string;
  errorMessage?: string;
  context?: Record<string, unknown>;
}

export interface ReportResult {
  success: boolean;
  reportId?: string;
  detectedCategories?: string[];
  message?: string;
  error?: string;
}

export interface Guidelines {
  projectId: string;
  rules: string;
  ruleCount: number;
  confidence: number;
  observationCount: number;
  lastUpdated?: string;
}

export interface AnalyticsResult {
  projectId: string;
  totalReports: number;
  byCategory: Record<string, number>;
  byAgent: Record<string, number>;
  healthScore: number;
  trends?: Array<{
    period: string;
    count: number;
  }>;
}

const DEFAULT_HUB_URL = 'http://localhost:5000';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

const configSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  hubUrl: z.string().url().optional(),
  autoReport: z.boolean().optional(),
  autoSyncRules: z.boolean().optional(),
  retryAttempts: z.number().min(0).max(10).optional(),
  retryDelayMs: z.number().min(100).max(60000).optional(),
  timeout: z.number().min(1000).max(120000).optional(),
});

const reportEventSchema = z.object({
  agent: z.enum(['replit_agent', 'cursor', 'copilot', 'claude_code', 'windsurf', 'aider', 'continue', 'cody', 'unknown']),
  action: z.string().min(1),
  codeGenerated: z.string().optional(),
  codeAccepted: z.boolean().optional(),
  humanCorrection: z.string().optional(),
  errorMessage: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

const log = {
  info: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.AI_AGENTS_DEBUG === 'true') console.log(`[AgentMonitor] ${msg}`, data || '');
  },
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.AI_AGENTS_DEBUG === 'true') console.debug(`[AgentMonitor] ${msg}`, data || '');
  },
  error: (msg: string, data?: Record<string, unknown>) => {
    console.error(`[AgentMonitor] ${msg}`, data || '');
  },
};

/**
 * AI Agent Monitor Client
 * 
 * Connects client projects to the central ML hub for:
 * - Reporting agent interactions (success, failure, corrections)
 * - Syncing project-specific guidelines
 * - Accessing analytics
 */
export class AgentMonitorClient {
  private config: Required<Pick<ClientConfig, 'projectId' | 'hubUrl' | 'retryAttempts' | 'retryDelayMs' | 'timeout'>> & ClientConfig;

  constructor(config: ClientConfig) {
    const validated = configSchema.parse(config);
    
    this.config = {
      ...validated,
      hubUrl: validated.hubUrl || process.env.AI_AGENTS_API_URL || DEFAULT_HUB_URL,
      retryAttempts: validated.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS,
      retryDelayMs: validated.retryDelayMs ?? DEFAULT_RETRY_DELAY,
      timeout: validated.timeout ?? DEFAULT_TIMEOUT,
    };

    log.info('AgentMonitorClient initialized', { projectId: this.config.projectId, hubUrl: this.config.hubUrl });
  }

  /**
   * Report an agent interaction to the central hub
   */
  async report(event: ReportEvent): Promise<ReportResult> {
    const validated = reportEventSchema.parse(event);
    
    const payload = {
      projectId: this.config.projectId,
      externalAgent: validated.agent,
      action: validated.action,
      codeGenerated: validated.codeGenerated,
      codeAccepted: validated.codeAccepted,
      humanCorrection: validated.humanCorrection,
      errorMessage: validated.errorMessage,
      context: validated.context,
      timestamp: new Date().toISOString(),
    };

    log.debug('Submitting report', { event: validated });

    try {
      const response = await this.fetchWithRetry(
        `${this.config.hubUrl}/api/agents/external/report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Report submission failed', { status: response.status, error: errorText });
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json() as { id?: string; detectedCategories?: string[]; message?: string };
      log.info('Report submitted successfully', { reportId: result.id });
      
      return {
        success: true,
        reportId: result.id,
        detectedCategories: result.detectedCategories,
        message: result.message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Report submission error', { error: message });
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get project-specific guidelines (AGENT_RULES.md content)
   */
  async getGuidelines(): Promise<Guidelines | null> {
    log.debug('Fetching guidelines');

    try {
      const response = await this.fetchWithRetry(
        `${this.config.hubUrl}/api/agents/guidelines/${encodeURIComponent(this.config.projectId)}`,
        { method: 'GET' }
      );

      if (response.status === 404) {
        log.info('No guidelines found for project');
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as { 
        projectId: string;
        rulesMarkdown: string;
        ruleCount: number;
        confidence: number;
        observationCount: number;
        updatedAt?: string;
      };
      
      return {
        projectId: data.projectId,
        rules: data.rulesMarkdown,
        ruleCount: data.ruleCount,
        confidence: data.confidence,
        observationCount: data.observationCount,
        lastUpdated: data.updatedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to fetch guidelines', { error: message });
      throw new Error(`Failed to fetch guidelines: ${message}`);
    }
  }

  /**
   * Sync AGENT_RULES.md to a local file
   */
  async syncRules(outputPath: string = 'AGENT_RULES.md'): Promise<boolean> {
    const guidelines = await this.getGuidelines();
    
    if (!guidelines) {
      log.info('No guidelines to sync');
      return false;
    }

    try {
      const fs = await import('fs').then(m => m.promises);
      await fs.writeFile(outputPath, guidelines.rules, 'utf-8');
      log.info('Rules synced successfully', { path: outputPath, ruleCount: guidelines.ruleCount });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to write rules file', { error: message });
      throw new Error(`Failed to write rules file: ${message}`);
    }
  }

  /**
   * Get analytics for this project
   */
  async getAnalytics(): Promise<AnalyticsResult> {
    log.debug('Fetching analytics');

    try {
      const response = await this.fetchWithRetry(
        `${this.config.hubUrl}/api/agents/monitor/analytics?projectId=${encodeURIComponent(this.config.projectId)}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        totalReports: number;
        byCategory: Record<string, number>;
        byAgent: Record<string, number>;
        healthScore: number;
        trends?: Array<{ period: string; count: number }>;
      };
      
      return {
        projectId: this.config.projectId,
        totalReports: data.totalReports,
        byCategory: data.byCategory,
        byAgent: data.byAgent,
        healthScore: data.healthScore,
        trends: data.trends,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to fetch analytics', { error: message });
      throw new Error(`Failed to fetch analytics: ${message}`);
    }
  }

  /**
   * Force regenerate guidelines for this project
   */
  async regenerateGuidelines(): Promise<Guidelines | null> {
    log.debug('Requesting guidelines regeneration');

    try {
      const response = await this.fetchWithRetry(
        `${this.config.hubUrl}/api/agents/guidelines/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: this.config.projectId }),
        }
      );

      if (response.status === 404) {
        log.info('Not enough data to generate guidelines');
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        projectId: string;
        rulesMarkdown: string;
        ruleCount: number;
        confidence: number;
        observationCount: number;
      };
      
      return {
        projectId: data.projectId,
        rules: data.rulesMarkdown,
        ruleCount: data.ruleCount,
        confidence: data.confidence,
        observationCount: data.observationCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to regenerate guidelines', { error: message });
      throw new Error(`Failed to regenerate guidelines: ${message}`);
    }
  }

  /**
   * Check if the hub is reachable
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.hubUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch with automatic retry and exponential backoff
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.status >= 500 && attempt < this.config.retryAttempts) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          log.debug('Retrying request', { attempt: attempt + 1, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }
}

/**
 * Create an AgentMonitorClient instance
 * 
 * @example
 * ```typescript
 * const client = createMonitorClient({
 *   projectId: 'my-project',
 *   hubUrl: 'https://your-hub.replit.app'
 * });
 * ```
 */
export function createMonitorClient(config: ClientConfig): AgentMonitorClient {
  return new AgentMonitorClient(config);
}

/**
 * Load configuration from .ai-agents.json or environment
 */
export async function loadConfig(configPath: string = '.ai-agents.json'): Promise<ClientConfig | null> {
  try {
    const fs = await import('fs').then(m => m.promises);
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<ClientConfig>;
    
    return {
      projectId: parsed.projectId || process.env.AI_AGENTS_PROJECT_ID || '',
      hubUrl: parsed.hubUrl || process.env.AI_AGENTS_API_URL,
      autoReport: parsed.autoReport,
      autoSyncRules: parsed.autoSyncRules,
    };
  } catch {
    if (process.env.AI_AGENTS_PROJECT_ID) {
      return {
        projectId: process.env.AI_AGENTS_PROJECT_ID,
        hubUrl: process.env.AI_AGENTS_API_URL,
      };
    }
    return null;
  }
}

/**
 * Auto-configured client that loads from .ai-agents.json or environment
 */
export async function createAutoClient(): Promise<AgentMonitorClient | null> {
  const config = await loadConfig();
  if (!config || !config.projectId) {
    return null;
  }
  return createMonitorClient(config);
}
