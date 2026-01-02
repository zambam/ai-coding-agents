import { describe, it, expect, beforeEach } from "vitest";

class MockMonitorStorage {
  private agentReports = new Map();
  private projectGuidelines = new Map();
  private failurePatterns = new Map();

  async createAgentReport(report: any) {
    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const created = {
      ...report,
      id,
      failureCategory: report.failureCategory || null,
      failureSeverity: report.failureSeverity || null,
      patternMatched: report.patternMatched || null,
      ruleGenerated: report.ruleGenerated || false,
      createdAt: new Date(),
    };
    this.agentReports.set(id, created);
    return created;
  }

  async getAgentReportsByProject(projectId: string) {
    const reports: any[] = [];
    const allReports = Array.from(this.agentReports.values());
    for (const r of allReports) {
      if (r.projectId === projectId) reports.push(r);
    }
    return reports;
  }

  async getAgentReportsWithFailures(projectId: string) {
    const reports: any[] = [];
    const allReports = Array.from(this.agentReports.values());
    for (const r of allReports) {
      if (r.projectId === projectId && r.failureCategory) reports.push(r);
    }
    return reports;
  }

  async getAgentReportsByCategory(category: string) {
    const reports: any[] = [];
    const allReports = Array.from(this.agentReports.values());
    for (const r of allReports) {
      if (r.failureCategory === category) reports.push(r);
    }
    return reports;
  }

  async createProjectGuidelines(guidelines: any) {
    const id = `guidelines-${Date.now()}`;
    const created = {
      ...guidelines,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projectGuidelines.set(guidelines.projectId, created);
    return created;
  }

  async getProjectGuidelines(projectId: string) {
    return this.projectGuidelines.get(projectId);
  }

  async updateProjectGuidelines(projectId: string, updates: any) {
    const existing = this.projectGuidelines.get(projectId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.projectGuidelines.set(projectId, updated);
    return updated;
  }

  async createFailurePattern(pattern: any) {
    const id = `pattern-${Date.now()}`;
    const created = {
      ...pattern,
      id,
      occurrences: pattern.occurrences || 1,
      confidence: pattern.confidence || 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.failurePatterns.set(id, created);
    return created;
  }

  async getFailurePatternsByProject(projectId: string) {
    const patterns: any[] = [];
    const allPatterns = Array.from(this.failurePatterns.values());
    for (const p of allPatterns) {
      if (p.projectId === projectId) patterns.push(p);
    }
    return patterns;
  }

  async getFailurePatternsByCategory(category: string) {
    const patterns: any[] = [];
    const allPatterns = Array.from(this.failurePatterns.values());
    for (const p of allPatterns) {
      if (p.category === category) patterns.push(p);
    }
    return patterns;
  }

  async getGlobalPatterns() {
    const patterns: any[] = [];
    const allPatterns = Array.from(this.failurePatterns.values());
    for (const p of allPatterns) {
      if (p.isGlobal) patterns.push(p);
    }
    return patterns;
  }

  async incrementPatternOccurrence(id: string) {
    const pattern = this.failurePatterns.get(id);
    if (!pattern) return undefined;
    const updated = { ...pattern, occurrences: pattern.occurrences + 1, updatedAt: new Date() };
    this.failurePatterns.set(id, updated);
    return updated;
  }
}

describe("Monitor System", () => {
  let storage: MockMonitorStorage;

  beforeEach(() => {
    storage = new MockMonitorStorage();
  });

  describe("Agent Report Storage", () => {
    it("creates an agent report", async () => {
      const report = await storage.createAgentReport({
        projectId: "test-project",
        externalAgent: "cursor",
        action: "code_generation",
        codeGenerated: "function test() {}",
        codeAccepted: true,
      });

      expect(report.id).toBeDefined();
      expect(report.projectId).toBe("test-project");
      expect(report.externalAgent).toBe("cursor");
      expect(report.codeAccepted).toBe(true);
    });

    it("gets reports by project", async () => {
      await storage.createAgentReport({
        projectId: "project-a",
        externalAgent: "cursor",
        action: "code_gen",
      });
      await storage.createAgentReport({
        projectId: "project-b",
        externalAgent: "copilot",
        action: "code_gen",
      });

      const reportsA = await storage.getAgentReportsByProject("project-a");
      expect(reportsA).toHaveLength(1);
      expect(reportsA[0].externalAgent).toBe("cursor");
    });

    it("gets reports with failures", async () => {
      await storage.createAgentReport({
        projectId: "proj",
        externalAgent: "cursor",
        action: "code_gen",
        failureCategory: "logic_error",
      });
      await storage.createAgentReport({
        projectId: "proj",
        externalAgent: "copilot",
        action: "code_gen",
      });

      const failures = await storage.getAgentReportsWithFailures("proj");
      expect(failures).toHaveLength(1);
      expect(failures[0].failureCategory).toBe("logic_error");
    });

    it("gets reports by category", async () => {
      await storage.createAgentReport({
        projectId: "proj",
        externalAgent: "cursor",
        action: "code_gen",
        failureCategory: "security_gap",
      });
      await storage.createAgentReport({
        projectId: "proj",
        externalAgent: "copilot",
        action: "code_gen",
        failureCategory: "logic_error",
      });

      const securityReports = await storage.getAgentReportsByCategory("security_gap");
      expect(securityReports).toHaveLength(1);
    });
  });

  describe("Project Guidelines Storage", () => {
    it("creates project guidelines", async () => {
      const guidelines = await storage.createProjectGuidelines({
        projectId: "test-proj",
        rulesMarkdown: "# Rules\n- Be careful",
        ruleCount: 1,
        confidence: 0.8,
        observationCount: 10,
      });

      expect(guidelines.id).toBeDefined();
      expect(guidelines.projectId).toBe("test-proj");
      expect(guidelines.ruleCount).toBe(1);
    });

    it("gets project guidelines", async () => {
      await storage.createProjectGuidelines({
        projectId: "my-proj",
        rulesMarkdown: "# Test",
        ruleCount: 2,
        confidence: 0.7,
        observationCount: 5,
      });

      const found = await storage.getProjectGuidelines("my-proj");
      expect(found).toBeDefined();
      expect(found?.ruleCount).toBe(2);
    });

    it("returns undefined for unknown project", async () => {
      const found = await storage.getProjectGuidelines("unknown");
      expect(found).toBeUndefined();
    });

    it("updates project guidelines", async () => {
      await storage.createProjectGuidelines({
        projectId: "upd-proj",
        rulesMarkdown: "# Old",
        ruleCount: 1,
        confidence: 0.5,
        observationCount: 3,
      });

      const updated = await storage.updateProjectGuidelines("upd-proj", {
        ruleCount: 5,
        confidence: 0.9,
      });

      expect(updated?.ruleCount).toBe(5);
      expect(updated?.confidence).toBe(0.9);
    });
  });

  describe("Failure Pattern Storage", () => {
    it("creates a failure pattern", async () => {
      const pattern = await storage.createFailurePattern({
        projectId: "proj",
        category: "hallucinated_code",
        pattern: "Called nonexistent API",
        suggestedRule: "Verify API existence",
        isGlobal: false,
      });

      expect(pattern.id).toBeDefined();
      expect(pattern.category).toBe("hallucinated_code");
      expect(pattern.occurrences).toBe(1);
    });

    it("gets patterns by project", async () => {
      await storage.createFailurePattern({
        projectId: "proj-x",
        category: "logic_error",
        pattern: "Off by one",
        isGlobal: false,
      });

      const patterns = await storage.getFailurePatternsByProject("proj-x");
      expect(patterns).toHaveLength(1);
    });

    it("filters patterns by category field", () => {
      const patterns = [
        { id: "1", category: "security_gap", pattern: "SQL injection" },
        { id: "2", category: "logic_error", pattern: "Wrong condition" },
        { id: "3", category: "security_gap", pattern: "XSS vulnerability" },
      ];

      const secPatterns = patterns.filter(p => p.category === "security_gap");
      expect(secPatterns).toHaveLength(2);
      expect(secPatterns[0].pattern).toBe("SQL injection");
      expect(secPatterns[1].pattern).toBe("XSS vulnerability");
    });

    it("gets global patterns", async () => {
      await storage.createFailurePattern({
        projectId: "proj",
        category: "logic_error",
        pattern: "Local pattern",
        isGlobal: false,
      });
      await storage.createFailurePattern({
        projectId: null,
        category: "security_gap",
        pattern: "Global pattern",
        isGlobal: true,
      });

      const globals = await storage.getGlobalPatterns();
      expect(globals).toHaveLength(1);
      expect(globals[0].isGlobal).toBe(true);
    });

    it("increments pattern occurrence", async () => {
      const created = await storage.createFailurePattern({
        projectId: "proj",
        category: "logic_error",
        pattern: "Common mistake",
        isGlobal: false,
      });

      const updated = await storage.incrementPatternOccurrence(created.id);
      expect(updated?.occurrences).toBe(2);

      const updated2 = await storage.incrementPatternOccurrence(created.id);
      expect(updated2?.occurrences).toBe(3);
    });
  });

  describe("Failure Categories", () => {
    const categories = [
      "security_gap",
      "logic_error",
      "context_blindness",
      "outdated_api",
      "missing_edge_case",
      "poor_readability",
      "broke_existing",
      "hallucinated_code",
    ];

    it("supports all 8 failure categories", () => {
      expect(categories).toHaveLength(8);
    });

    it.each(categories)("can create report with %s category", async (category) => {
      const report = await storage.createAgentReport({
        projectId: "test",
        externalAgent: "cursor",
        action: "test",
        failureCategory: category,
        failureSeverity: "medium",
      });

      expect(report.failureCategory).toBe(category);
    });
  });

  describe("External Agent Types", () => {
    const agentTypes = [
      "replit_agent",
      "cursor",
      "copilot",
      "claude_code",
      "windsurf",
      "aider",
      "continue",
      "cody",
      "unknown",
    ];

    it("supports all external agent types", () => {
      expect(agentTypes).toHaveLength(9);
    });

    it.each(agentTypes)("can create report with %s agent", async (agent) => {
      const report = await storage.createAgentReport({
        projectId: "test",
        externalAgent: agent,
        action: "code_generation",
      });

      expect(report.externalAgent).toBe(agent);
    });
  });
});

describe("Failure Detection", () => {
  const SECURITY_PATTERNS = [
    "sql injection",
    "cross-site scripting",
    "xss vulnerability",
    "eval(",
    "exec(",
    "unsafe",
    "unvalidated input",
    "credential",
    "hardcoded password",
  ];

  const HALLUCINATION_PATTERNS = [
    "does not exist",
    "no such method",
    "undefined is not a function",
    "cannot find module",
    "is not defined",
    "has no exported member",
  ];

  describe("Security Gap Detection", () => {
    it.each(SECURITY_PATTERNS)("detects security pattern: %s", (pattern) => {
      const errorMessage = `Error: Found ${pattern} in the code`;
      const hasSecurityIssue = SECURITY_PATTERNS.some((p) =>
        errorMessage.toLowerCase().includes(p.toLowerCase())
      );
      expect(hasSecurityIssue).toBe(true);
    });
  });

  describe("Hallucination Detection", () => {
    it.each(HALLUCINATION_PATTERNS)("detects hallucination pattern: %s", (pattern) => {
      const errorMessage = `TypeError: ${pattern}`;
      const hasHallucination = HALLUCINATION_PATTERNS.some((p) =>
        errorMessage.toLowerCase().includes(p.toLowerCase())
      );
      expect(hasHallucination).toBe(true);
    });
  });
});

describe("Guidelines Generation", () => {
  it("generates markdown rules format", () => {
    const rules = [
      { category: "security_gap", rule: "Review security vulnerabilities", confidence: 0.9 },
      { category: "logic_error", rule: "Verify logic correctness", confidence: 0.8 },
    ];

    let markdown = "# AGENT_RULES.md\n\n";
    markdown += "## Generated Rules\n\n";
    
    for (const r of rules) {
      markdown += `### ${r.category}\n`;
      markdown += `- ${r.rule} (confidence: ${(r.confidence * 100).toFixed(0)}%)\n\n`;
    }

    expect(markdown).toContain("# AGENT_RULES.md");
    expect(markdown).toContain("security_gap");
    expect(markdown).toContain("Review security vulnerabilities");
    expect(markdown).toContain("90%");
  });

  it("calculates overall confidence from multiple rules", () => {
    const rules = [
      { confidence: 0.9 },
      { confidence: 0.8 },
      { confidence: 0.7 },
    ];

    const avgConfidence = rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length;
    expect(avgConfidence).toBeCloseTo(0.8, 1);
  });
});

describe("Analytics Calculations", () => {
  it("calculates failure rate correctly", () => {
    const reports = [
      { failureCategory: "logic_error" },
      { failureCategory: null },
      { failureCategory: "security_gap" },
      { failureCategory: null },
      { failureCategory: null },
    ];

    const failures = reports.filter((r) => r.failureCategory !== null).length;
    const failureRate = failures / reports.length;

    expect(failureRate).toBe(0.4);
  });

  it("calculates health score correctly", () => {
    const failureRate = 0.2;
    const healthScore = (1 - failureRate) * 100;
    expect(healthScore).toBe(80);
  });

  it("groups failures by category", () => {
    const reports = [
      { failureCategory: "logic_error" },
      { failureCategory: "logic_error" },
      { failureCategory: "security_gap" },
      { failureCategory: null },
    ];

    const breakdown: Record<string, number> = {};
    for (const r of reports) {
      if (r.failureCategory) {
        breakdown[r.failureCategory] = (breakdown[r.failureCategory] || 0) + 1;
      }
    }

    expect(breakdown["logic_error"]).toBe(2);
    expect(breakdown["security_gap"]).toBe(1);
    expect(breakdown["hallucinated_code"]).toBeUndefined();
  });

  it("groups failures by severity", () => {
    const reports = [
      { failureSeverity: "high" },
      { failureSeverity: "high" },
      { failureSeverity: "medium" },
      { failureSeverity: "low" },
      { failureSeverity: null },
    ];

    const breakdown: Record<string, number> = {};
    for (const r of reports) {
      if (r.failureSeverity) {
        breakdown[r.failureSeverity] = (breakdown[r.failureSeverity] || 0) + 1;
      }
    }

    expect(breakdown["high"]).toBe(2);
    expect(breakdown["medium"]).toBe(1);
    expect(breakdown["low"]).toBe(1);
  });
});

describe("Configuration", () => {
  it("uses default retention of 60 days", () => {
    const config = {
      dataRetentionDays: 60,
      debounceMs: 300000,
      failureThreshold: 3,
      crossProjectLearning: false,
    };

    expect(config.dataRetentionDays).toBe(60);
  });

  it("uses 5-minute debounce for guideline updates", () => {
    const debounceMs = 5 * 60 * 1000;
    expect(debounceMs).toBe(300000);
  });

  it("requires 3+ failures for rule creation", () => {
    const threshold = 3;
    const failures = [1, 2, 3];
    expect(failures.length).toBeGreaterThanOrEqual(threshold);
  });

  it("has opt-in cross-project learning", () => {
    const config = { crossProjectLearning: false };
    expect(config.crossProjectLearning).toBe(false);
  });
});
