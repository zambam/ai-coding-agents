import type { 
  ProjectGuidelines, 
  InsertProjectGuidelines, 
  AgentReport, 
  FailurePattern,
  FailureCategory 
} from "@shared/schema";
import type { IAgentMonitor } from "../storage";
import { MONITOR_CONFIG, CATEGORY_DESCRIPTIONS, CATEGORY_SEVERITY_DEFAULTS } from "./config";

export interface GeneratorConfig {
  minObservations: number;
  confidenceThreshold: number;
  maxRulesPerCategory: number;
  includeExamples: boolean;
  includeMetrics: boolean;
  ruleCreationThreshold: number;
}

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  minObservations: MONITOR_CONFIG.minObservationsForGuidelines,
  confidenceThreshold: 0.5,
  maxRulesPerCategory: 5,
  includeExamples: true,
  includeMetrics: true,
  ruleCreationThreshold: MONITOR_CONFIG.ruleCreationThreshold,
};

export interface GeneratedRule {
  id: string;
  rule: string;
  category: FailureCategory;
  confidence: number;
  occurrences: number;
  examples?: string[];
}

export interface GenerationResult {
  guidelines: ProjectGuidelines;
  rules: GeneratedRule[];
  categoryCoverage: Record<FailureCategory, number>;
}

export class GuidelinesGenerator {
  private storage: IAgentMonitor;
  private config: GeneratorConfig;

  constructor(storage: IAgentMonitor, config: Partial<GeneratorConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  }

  async generateGuidelines(projectId: string): Promise<GenerationResult> {
    const reports = await this.storage.getAgentReportsWithFailures(projectId);
    const patterns = await this.storage.getFailurePatternsByProject(projectId);
    const globalPatterns = await this.storage.getGlobalPatterns();

    const existingGuidelines = await this.storage.getProjectGuidelines(projectId);
    const crossProjectEnabled = existingGuidelines?.crossProjectLearning ?? false;

    const allPatterns = crossProjectEnabled 
      ? [...patterns, ...globalPatterns]
      : patterns;

    const rules = this.generateRules(allPatterns, reports);
    const markdown = this.formatMarkdown(rules, reports.length);
    const categoryCoverage = this.calculateCategoryCoverage(rules);

    const guidelinesData: InsertProjectGuidelines = {
      projectId,
      rulesMarkdown: markdown,
      ruleCount: rules.length,
      confidence: this.calculateOverallConfidence(rules),
      observationCount: reports.length,
      enabledCategories: Object.keys(categoryCoverage).filter(
        cat => categoryCoverage[cat as FailureCategory] > 0
      ),
      crossProjectLearning: crossProjectEnabled,
    };

    let guidelines: ProjectGuidelines;
    if (existingGuidelines) {
      const updated = await this.storage.updateProjectGuidelines(projectId, guidelinesData);
      guidelines = updated!;
    } else {
      guidelines = await this.storage.createProjectGuidelines(guidelinesData);
    }

    return { guidelines, rules, categoryCoverage };
  }

  private generateRules(patterns: FailurePattern[], reports: AgentReport[]): GeneratedRule[] {
    const rules: GeneratedRule[] = [];

    const qualifyingPatterns = patterns.filter(
      p => p.occurrences >= this.config.ruleCreationThreshold
    );

    const byCategory = new Map<FailureCategory, FailurePattern[]>();
    for (const pattern of qualifyingPatterns) {
      const existing = byCategory.get(pattern.category) || [];
      existing.push(pattern);
      byCategory.set(pattern.category, existing);
    }

    for (const [category, categoryPatterns] of Array.from(byCategory.entries())) {
      const sorted = categoryPatterns
        .sort((a: FailurePattern, b: FailurePattern) => b.occurrences - a.occurrences)
        .slice(0, this.config.maxRulesPerCategory);

      for (const pattern of sorted) {
        const rule = pattern.suggestedRule || this.generateRuleFromPattern(pattern);
        
        rules.push({
          id: pattern.id,
          rule,
          category,
          confidence: pattern.confidence ?? 0.5,
          occurrences: pattern.occurrences,
          examples: this.config.includeExamples ? pattern.exampleCodes?.slice(0, 2) : undefined,
        });
      }
    }

    return rules.sort((a, b) => {
      const severityA = CATEGORY_SEVERITY_DEFAULTS[a.category];
      const severityB = CATEGORY_SEVERITY_DEFAULTS[b.category];
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[severityA] - severityOrder[severityB];
      if (severityDiff !== 0) return severityDiff;
      return b.occurrences - a.occurrences;
    });
  }

  private generateRuleFromPattern(pattern: FailurePattern): string {
    const description = CATEGORY_DESCRIPTIONS[pattern.category];
    
    const ruleTemplates: Record<FailureCategory, (p: FailurePattern) => string> = {
      security_gap: (p) => `Avoid security vulnerabilities: ${p.pattern}. Always validate inputs and sanitize outputs.`,
      logic_error: (p) => `Check for logic issues: ${p.pattern}. Review conditional logic and loop bounds carefully.`,
      context_blindness: (p) => `Follow project patterns: ${p.pattern}. Check existing code before implementing similar features.`,
      outdated_api: (p) => `Use modern APIs: ${p.pattern}. Replace deprecated methods with current alternatives.`,
      missing_edge_case: (p) => `Handle edge cases: ${p.pattern}. Always check for null, undefined, and empty values.`,
      poor_readability: (p) => `Improve code clarity: ${p.pattern}. Use descriptive names and add comments for complex logic.`,
      broke_existing: (p) => `Preserve existing functionality: ${p.pattern}. Run tests before committing changes.`,
      hallucinated_code: (p) => `Verify API existence: ${p.pattern}. Check documentation before using unfamiliar methods.`,
    };

    return ruleTemplates[pattern.category](pattern);
  }

  private formatMarkdown(rules: GeneratedRule[], observationCount: number): string {
    const lines: string[] = [
      "# AGENT_RULES.md",
      "",
      `> Auto-generated guidelines based on ${observationCount} observations`,
      `> Last updated: ${new Date().toISOString()}`,
      "",
    ];

    if (rules.length === 0) {
      lines.push("No rules generated yet. Continue using AI agents to build up pattern data.");
      return lines.join("\n");
    }

    const byCategory = new Map<FailureCategory, GeneratedRule[]>();
    for (const rule of rules) {
      const existing = byCategory.get(rule.category) || [];
      existing.push(rule);
      byCategory.set(rule.category, existing);
    }

    const severityOrder: FailureCategory[] = [
      "security_gap",
      "hallucinated_code",
      "broke_existing",
      "logic_error",
      "missing_edge_case",
      "context_blindness",
      "outdated_api",
      "poor_readability",
    ];

    for (const category of severityOrder) {
      const categoryRules = byCategory.get(category);
      if (!categoryRules || categoryRules.length === 0) continue;

      const severity = CATEGORY_SEVERITY_DEFAULTS[category];
      const severityIcon = { critical: "!!!", high: "!!", medium: "!", low: "" }[severity];
      
      lines.push(`## ${severityIcon} ${this.formatCategoryName(category)}`);
      lines.push("");
      lines.push(`*${CATEGORY_DESCRIPTIONS[category]}*`);
      lines.push("");

      for (const rule of categoryRules) {
        lines.push(`- ${rule.rule}`);
        if (this.config.includeMetrics) {
          lines.push(`  - Occurrences: ${rule.occurrences} | Confidence: ${(rule.confidence * 100).toFixed(0)}%`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  private formatCategoryName(category: FailureCategory): string {
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private calculateCategoryCoverage(rules: GeneratedRule[]): Record<FailureCategory, number> {
    const coverage: Record<FailureCategory, number> = {
      security_gap: 0,
      logic_error: 0,
      context_blindness: 0,
      outdated_api: 0,
      missing_edge_case: 0,
      poor_readability: 0,
      broke_existing: 0,
      hallucinated_code: 0,
    };

    for (const rule of rules) {
      coverage[rule.category]++;
    }

    return coverage;
  }

  private calculateOverallConfidence(rules: GeneratedRule[]): number {
    if (rules.length === 0) return 0;
    const total = rules.reduce((sum, r) => sum + r.confidence, 0);
    return total / rules.length;
  }

  getConfig(): GeneratorConfig {
    return { ...this.config };
  }
}
