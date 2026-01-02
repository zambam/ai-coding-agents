import type { IAgentMonitor, AgentReport, FailurePattern, ProjectGuidelines } from "../storage";
import type { ExternalAgentType, FailureCategory, FailureSeverity } from "@shared/schema";
import { OutcomeLearner, type LearningSignal } from "../agents/learning/outcome-learner";
import { MemoryManager } from "../agents/learning/memory-manager";

export interface MonitorLearningSignal {
  projectId: string;
  externalAgent: ExternalAgentType;
  signalType: "positive" | "negative" | "neutral";
  strength: number;
  insights: string[];
  suggestedRules: string[];
  dataPoints: number;
  categoryBreakdown: Record<FailureCategory, number>;
}

export interface CrossProjectInsight {
  pattern: string;
  category: FailureCategory;
  globalOccurrences: number;
  projectOccurrences: number;
  suggestedRule: string;
  confidence: number;
}

export interface MonitorLearningConfig {
  minDataPoints: number;
  lookbackDays: number;
  crossProjectThreshold: number;
  patternConfidenceThreshold: number;
}

const DEFAULT_CONFIG: MonitorLearningConfig = {
  minDataPoints: 10,
  lookbackDays: 60,
  crossProjectThreshold: 5,
  patternConfidenceThreshold: 0.6,
};

export class MonitorLearningIntegration {
  private storage: IAgentMonitor;
  private config: MonitorLearningConfig;

  constructor(storage: IAgentMonitor, config: Partial<MonitorLearningConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async analyzeExternalAgentPerformance(
    projectId: string,
    externalAgent: ExternalAgentType
  ): Promise<MonitorLearningSignal> {
    const reports = await this.storage.getAgentReportsByProject(projectId);
    const agentReports = reports.filter(r => r.externalAgent === externalAgent);

    if (agentReports.length < this.config.minDataPoints) {
      return {
        projectId,
        externalAgent,
        signalType: "neutral",
        strength: 0,
        insights: ["Insufficient data for analysis"],
        suggestedRules: [],
        dataPoints: agentReports.length,
        categoryBreakdown: {} as Record<FailureCategory, number>,
      };
    }

    const failureReports = agentReports.filter(r => r.failureCategory !== null);
    const failureRate = failureReports.length / agentReports.length;
    const categoryBreakdown = this.computeCategoryBreakdown(failureReports);

    const insights: string[] = [];
    const suggestedRules: string[] = [];

    if (failureRate >= 0.5) {
      insights.push(`High failure rate: ${(failureRate * 100).toFixed(1)}% of interactions have issues`);
    } else if (failureRate >= 0.2) {
      insights.push(`Moderate failure rate: ${(failureRate * 100).toFixed(1)}%`);
    } else {
      insights.push(`Low failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [category, count] of topCategories) {
      if (count >= 3) {
        insights.push(`Recurring ${category} issues: ${count} occurrences`);
        suggestedRules.push(this.categoryToRule(category as FailureCategory, count));
      }
    }

    const signalType = failureRate >= 0.4 ? "negative" : failureRate >= 0.15 ? "neutral" : "positive";
    const strength = failureRate;

    return {
      projectId,
      externalAgent,
      signalType,
      strength,
      insights,
      suggestedRules,
      dataPoints: agentReports.length,
      categoryBreakdown,
    };
  }

  async getCrossProjectInsights(
    category?: FailureCategory
  ): Promise<CrossProjectInsight[]> {
    const patterns = category
      ? await this.storage.getFailurePatternsByCategory(category)
      : await this.storage.getGlobalPatterns();

    const insights: CrossProjectInsight[] = [];

    for (const pattern of patterns) {
      const patternConfidence = pattern.confidence ?? 0;
      if (pattern.occurrences >= this.config.crossProjectThreshold &&
          patternConfidence >= this.config.patternConfidenceThreshold) {
        insights.push({
          pattern: pattern.pattern,
          category: pattern.category,
          globalOccurrences: pattern.occurrences,
          projectOccurrences: pattern.isGlobal ? 0 : pattern.occurrences,
          suggestedRule: pattern.suggestedRule || this.categoryToRule(pattern.category, pattern.occurrences),
          confidence: patternConfidence,
        });
      }
    }

    return insights.sort((a, b) => b.globalOccurrences - a.globalOccurrences);
  }

  async enrichProjectGuidelines(
    projectId: string,
    optInCrossProject: boolean = false
  ): Promise<{
    projectInsights: MonitorLearningSignal[];
    crossProjectRules: CrossProjectInsight[];
  }> {
    const reports = await this.storage.getAgentReportsByProject(projectId);
    const agentSet = new Set(reports.map(r => r.externalAgent));
    const externalAgents = Array.from(agentSet);

    const projectInsights = await Promise.all(
      externalAgents.map(agent => this.analyzeExternalAgentPerformance(projectId, agent))
    );

    let crossProjectRules: CrossProjectInsight[] = [];
    if (optInCrossProject) {
      const allCrossProject = await this.getCrossProjectInsights();
      crossProjectRules = allCrossProject.filter(r => 
        r.confidence >= this.config.patternConfidenceThreshold
      );
    }

    return {
      projectInsights,
      crossProjectRules,
    };
  }

  async computeAgentComparison(
    projectId: string
  ): Promise<Record<ExternalAgentType, { failureRate: number; topIssue: FailureCategory | null }>> {
    const reports = await this.storage.getAgentReportsByProject(projectId);
    const comparison: Record<string, { failureRate: number; topIssue: FailureCategory | null }> = {};

    const agentGroups = new Map<ExternalAgentType, AgentReport[]>();
    for (const report of reports) {
      const existing = agentGroups.get(report.externalAgent) || [];
      existing.push(report);
      agentGroups.set(report.externalAgent, existing);
    }

    const agentEntries = Array.from(agentGroups.entries());
    for (const [agent, agentReports] of agentEntries) {
      const failures = agentReports.filter((r: AgentReport) => r.failureCategory !== null);
      const failureRate = agentReports.length > 0 ? failures.length / agentReports.length : 0;

      const categoryBreakdown = this.computeCategoryBreakdown(failures);
      const topCategory = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])[0];

      comparison[agent] = {
        failureRate,
        topIssue: topCategory ? topCategory[0] as FailureCategory : null,
      };
    }

    return comparison as Record<ExternalAgentType, { failureRate: number; topIssue: FailureCategory | null }>;
  }

  async recordLearningOutcome(
    projectId: string,
    guidelinesId: string,
    effectivenessScore: number,
    feedback?: string
  ): Promise<void> {
    const guidelines = await this.storage.getProjectGuidelines(projectId);
    if (guidelines && guidelines.id === guidelinesId) {
      const newConfidence = (guidelines.confidence * 0.7) + (effectivenessScore * 0.3);
      await this.storage.updateProjectGuidelines(projectId, {
        confidence: newConfidence,
        observationCount: guidelines.observationCount + 1,
      });
    }
  }

  private computeCategoryBreakdown(reports: AgentReport[]): Record<FailureCategory, number> {
    const breakdown: Record<string, number> = {};
    
    for (const report of reports) {
      if (report.failureCategory) {
        breakdown[report.failureCategory] = (breakdown[report.failureCategory] || 0) + 1;
      }
    }

    return breakdown as Record<FailureCategory, number>;
  }

  private categoryToRule(category: FailureCategory, occurrences: number): string {
    const ruleTemplates: Record<FailureCategory, string> = {
      security_gap: `Review generated code for security vulnerabilities. ${occurrences} security issues detected.`,
      logic_error: `Verify logical correctness before accepting generated code. ${occurrences} logic errors found.`,
      context_blindness: `Ensure the agent has access to relevant project context. ${occurrences} context issues detected.`,
      outdated_api: `Check API versions and deprecation warnings. ${occurrences} outdated API usages found.`,
      missing_edge_case: `Add edge case handling for generated code. ${occurrences} missing edge cases detected.`,
      poor_readability: `Request cleaner, more readable code structure. ${occurrences} readability issues found.`,
      broke_existing: `Run regression tests after accepting generated changes. ${occurrences} breaking changes detected.`,
      hallucinated_code: `Verify function and module existence. ${occurrences} hallucinated references detected.`,
    };

    return ruleTemplates[category] || `Address ${category} issues (${occurrences} occurrences)`;
  }
}

export { OutcomeLearner, MemoryManager };
