import type { 
  MonitorAnalytics as MonitorAnalyticsData, 
  FailureCategory, 
  FailureSeverity, 
  ExternalAgentType,
  AgentReport 
} from "@shared/schema";
import type { IAgentMonitor } from "../storage";
import { SEVERITY_WEIGHTS } from "./config";

export interface AnalyticsQuery {
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  agents?: ExternalAgentType[];
  categories?: FailureCategory[];
}

export interface TrendData {
  period: string;
  count: number;
  failureRate: number;
  topCategory?: FailureCategory;
}

export interface AgentComparison {
  agent: ExternalAgentType;
  totalReports: number;
  failureCount: number;
  failureRate: number;
  avgSeverity: number;
  topCategories: FailureCategory[];
}

export interface ExportData {
  format: "json" | "csv";
  content: string;
  filename: string;
}

export class AnalyticsService {
  private storage: IAgentMonitor;

  constructor(storage: IAgentMonitor) {
    this.storage = storage;
  }

  async getAnalytics(projectId?: string): Promise<MonitorAnalyticsData> {
    return this.storage.getMonitorAnalytics(projectId);
  }

  async getTrends(projectId: string, days: number = 30): Promise<TrendData[]> {
    const reports = await this.storage.getAgentReportsByProject(projectId, 1000);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredReports = reports.filter(r => r.createdAt >= cutoffDate);
    const byDate = new Map<string, AgentReport[]>();

    for (const report of filteredReports) {
      const dateKey = report.createdAt.toISOString().split("T")[0];
      const existing = byDate.get(dateKey) || [];
      existing.push(report);
      byDate.set(dateKey, existing);
    }

    const trends: TrendData[] = [];
    const sortedDates = Array.from(byDate.keys()).sort();

    for (const date of sortedDates) {
      const dateReports = byDate.get(date)!;
      const failures = dateReports.filter(r => r.failureCategory);
      const failureRate = dateReports.length > 0 ? failures.length / dateReports.length : 0;

      const categoryCounts = new Map<FailureCategory, number>();
      for (const report of failures) {
        if (report.failureCategory) {
          categoryCounts.set(
            report.failureCategory,
            (categoryCounts.get(report.failureCategory) || 0) + 1
          );
        }
      }

      let topCategory: FailureCategory | undefined;
      let maxCount = 0;
      for (const [cat, count] of Array.from(categoryCounts.entries())) {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      }

      trends.push({
        period: date,
        count: dateReports.length,
        failureRate,
        topCategory,
      });
    }

    return trends;
  }

  async compareAgents(projectId?: string): Promise<AgentComparison[]> {
    const analytics = await this.storage.getMonitorAnalytics(projectId);
    const comparisons: AgentComparison[] = [];

    const agents: ExternalAgentType[] = [
      "replit_agent", "cursor", "copilot", "claude_code", 
      "windsurf", "aider", "continue", "cody", "unknown"
    ];

    for (const agent of agents) {
      const failureCount = analytics.failuresByAgent[agent];
      if (failureCount === 0) continue;

      const topCategories = Object.entries(analytics.failuresByCategory)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat as FailureCategory);

      const severitySum = Object.entries(analytics.failuresBySeverity)
        .reduce((sum, [sev, count]) => sum + SEVERITY_WEIGHTS[sev as FailureSeverity] * count, 0);
      const avgSeverity = analytics.totalReports > 0 ? severitySum / analytics.totalReports : 0;

      comparisons.push({
        agent,
        totalReports: analytics.totalReports,
        failureCount,
        failureRate: analytics.totalReports > 0 ? failureCount / analytics.totalReports : 0,
        avgSeverity,
        topCategories,
      });
    }

    return comparisons.sort((a, b) => b.failureRate - a.failureRate);
  }

  async exportData(projectId: string, format: "json" | "csv"): Promise<ExportData> {
    const reports = await this.storage.getAgentReportsByProject(projectId, 10000);
    const analytics = await this.storage.getMonitorAnalytics(projectId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "json") {
      const content = JSON.stringify({ reports, analytics }, null, 2);
      return {
        format: "json",
        content,
        filename: `agent-monitor-${projectId}-${timestamp}.json`,
      };
    }

    const headers = [
      "id", "projectId", "externalAgent", "action", "codeAccepted",
      "failureCategory", "failureSeverity", "filePath", "language", "createdAt"
    ];

    const rows = reports.map(r => [
      r.id,
      r.projectId,
      r.externalAgent,
      r.action,
      r.codeAccepted ?? "",
      r.failureCategory ?? "",
      r.failureSeverity ?? "",
      r.filePath ?? "",
      r.language ?? "",
      r.createdAt.toISOString(),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const content = [headers.join(","), ...rows].join("\n");
    return {
      format: "csv",
      content,
      filename: `agent-monitor-${projectId}-${timestamp}.csv`,
    };
  }

  calculateHealthScore(analytics: MonitorAnalyticsData): number {
    if (analytics.totalReports === 0) return 100;

    const totalFailures = Object.values(analytics.failuresByCategory).reduce((a, b) => a + b, 0);
    const failureRate = totalFailures / analytics.totalReports;

    const severityScore = 
      (analytics.failuresBySeverity.critical * 1.0 +
       analytics.failuresBySeverity.high * 0.75 +
       analytics.failuresBySeverity.medium * 0.5 +
       analytics.failuresBySeverity.low * 0.25) / 
      Math.max(totalFailures, 1);

    const baseScore = (1 - failureRate) * 100;
    const severityPenalty = severityScore * 20;

    return Math.max(0, Math.min(100, baseScore - severityPenalty));
  }
}
