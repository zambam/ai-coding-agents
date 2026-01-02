import { Architect, Mechanic, CodeNinja, Philosopher } from "./personas";
import type { AgentConfig, AgentType } from "@shared/schema";
import { DEFAULT_AGENT_CONFIG } from "@shared/schema";
import type { AgentInvocationResult } from "./types";
import { MemoryManager } from "./learning";
import type { IDataTelemetry } from "../storage";

export interface Finding {
  id: string;
  agent: "architect" | "mechanic";
  description: string;
  impact: "high" | "medium" | "low";
  resolution?: string;
}

export interface Conflict {
  id: string;
  findingA: Finding;
  findingB: Finding;
  type: "simple" | "complex";
  resolution?: string;
  resolvedBy?: "auto" | "philosopher";
}

export interface Adjacent {
  id: string;
  description: string;
  source: "philosopher";
  pass: 1 | 2 | 3;
  storedInML: boolean;
}

export interface PassResult {
  pass: 1 | 2 | 3;
  calls: number;
  findings: Finding[];
  conflicts: Conflict[];
  adjacents: Adjacent[];
  agentOutputs: Map<string, AgentInvocationResult>;
}

export interface ThreePassConfig {
  philosopherTriggerThreshold: number;
  autoMergeSimpleConflicts: boolean;
  storeAdjacentsInML: boolean;
  documentAdjacentsInOutput: boolean;
}

const DEFAULT_THREE_PASS_CONFIG: ThreePassConfig = {
  philosopherTriggerThreshold: 0.15,
  autoMergeSimpleConflicts: true,
  storeAdjacentsInML: true,
  documentAdjacentsInOutput: true,
};

export interface WorkflowOutput {
  version: string;
  status: "complete" | "failed";
  passes: PassResult[];
  totalCalls: number;
  metaGoals: string[];
  allFindings: Finding[];
  allConflicts: Conflict[];
  allAdjacents: Adjacent[];
  finalRoadmap: string;
  ninjaExecution?: AgentInvocationResult;
  signoff: {
    pass1: { architect: boolean; mechanic: boolean; philosopher: boolean };
    pass2: { architect: boolean; mechanic: boolean; philosopher: boolean | "skipped" };
    pass3: { architect: boolean; mechanic: boolean; philosopher: boolean; codeNinja: boolean };
  };
}

export class ThreePassWorkflow {
  private config: AgentConfig;
  private workflowConfig: ThreePassConfig;
  private architect: Architect;
  private mechanic: Mechanic;
  private codeNinja: CodeNinja;
  private philosopher: Philosopher;
  private memoryManager?: MemoryManager;
  private storage?: IDataTelemetry;

  private findingCounter = 0;
  private conflictCounter = 0;
  private adjacentCounter = 0;

  constructor(
    agentConfig: Partial<AgentConfig> = {},
    workflowConfig: Partial<ThreePassConfig> = {},
    storage?: IDataTelemetry
  ) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...agentConfig };
    this.workflowConfig = { ...DEFAULT_THREE_PASS_CONFIG, ...workflowConfig };
    this.storage = storage;

    this.architect = new Architect(this.config);
    this.mechanic = new Mechanic(this.config);
    this.codeNinja = new CodeNinja(this.config);
    this.philosopher = new Philosopher(this.config);

    if (storage && this.workflowConfig.storeAdjacentsInML) {
      this.memoryManager = new MemoryManager(storage);
    }
  }

  private generateFindingId(agent: "architect" | "mechanic"): string {
    this.findingCounter++;
    const prefix = agent === "architect" ? "ARCH" : "MECH";
    return `${prefix}-${String(this.findingCounter).padStart(3, "0")}`;
  }

  private generateConflictId(): string {
    this.conflictCounter++;
    return `C-${String(this.conflictCounter).padStart(3, "0")}`;
  }

  private generateAdjacentId(): string {
    this.adjacentCounter++;
    return `ADJ-${String(this.adjacentCounter).padStart(3, "0")}`;
  }

  private parseFindings(response: string, agent: "architect" | "mechanic"): Finding[] {
    const findings: Finding[] = [];
    const lines = response.split("\n");
    
    for (const line of lines) {
      if (line.includes("finding") || line.includes("issue") || line.includes("recommendation")) {
        findings.push({
          id: this.generateFindingId(agent),
          agent,
          description: line.trim(),
          impact: this.inferImpact(line),
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: this.generateFindingId(agent),
        agent,
        description: response.substring(0, 200),
        impact: "medium",
      });
    }

    return findings;
  }

  private inferImpact(text: string): "high" | "medium" | "low" {
    const lower = text.toLowerCase();
    if (lower.includes("critical") || lower.includes("security") || lower.includes("breaking")) {
      return "high";
    }
    if (lower.includes("minor") || lower.includes("optional") || lower.includes("nice to have")) {
      return "low";
    }
    return "medium";
  }

  private parseAdjacents(response: string, pass: 1 | 2 | 3): Adjacent[] {
    const adjacents: Adjacent[] = [];
    const lines = response.split("\n");

    for (const line of lines) {
      if (line.includes("opportunity") || line.includes("adjacent") || line.includes("future")) {
        adjacents.push({
          id: this.generateAdjacentId(),
          description: line.trim(),
          source: "philosopher",
          pass,
          storedInML: false,
        });
      }
    }

    return adjacents;
  }

  private detectConflicts(archFindings: Finding[], mechFindings: Finding[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const archFinding of archFindings) {
      for (const mechFinding of mechFindings) {
        const similarity = this.textSimilarity(archFinding.description, mechFinding.description);
        
        if (similarity > 0.5) {
          const isContradictory = this.isContradictory(archFinding.description, mechFinding.description);
          
          conflicts.push({
            id: this.generateConflictId(),
            findingA: archFinding,
            findingB: mechFinding,
            type: isContradictory ? "complex" : "simple",
          });
        }
      }
    }

    return conflicts;
  }

  private textSimilarity(a: string, b: string): number {
    const wordsA = a.toLowerCase().split(/\s+/);
    const wordsB = b.toLowerCase().split(/\s+/);
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    let intersectionCount = 0;
    for (const word of wordsA) {
      if (setB.has(word)) intersectionCount++;
    }
    
    const unionSet = new Set(wordsA.concat(wordsB));
    return intersectionCount / unionSet.size;
  }

  private isContradictory(a: string, b: string): boolean {
    const contradictoryPairs = [
      ["add", "remove"],
      ["increase", "decrease"],
      ["enable", "disable"],
      ["should", "should not"],
      ["must", "must not"],
      ["do", "don't"],
    ];

    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();

    for (const [word1, word2] of contradictoryPairs) {
      if ((lowerA.includes(word1) && lowerB.includes(word2)) ||
          (lowerA.includes(word2) && lowerB.includes(word1))) {
        return true;
      }
    }

    return false;
  }

  private async resolveConflicts(conflicts: Conflict[], passResult?: PassResult): Promise<Conflict[]> {
    const resolved: Conflict[] = [];

    for (const conflict of conflicts) {
      if (conflict.type === "simple" && this.workflowConfig.autoMergeSimpleConflicts) {
        console.log(`  [Auto-merge] ${conflict.findingA.id} + ${conflict.findingB.id}`);
        conflict.resolution = this.mergeFindings(conflict.findingA, conflict.findingB);
        conflict.resolvedBy = "auto";
      } else {
        console.log(`  [Escalate] Complex conflict ${conflict.findingA.id} vs ${conflict.findingB.id} -> Philosopher`);
        const philosopherResponse = await this.philosopher.invoke(
          `Resolve this contradictory conflict:\n\n` +
          `Finding A (${conflict.findingA.id}): ${conflict.findingA.description}\n` +
          `Finding B (${conflict.findingB.id}): ${conflict.findingB.description}\n\n` +
          `Determine which recommendation is correct and explain why.`
        );
        conflict.resolution = philosopherResponse.response.recommendation;
        conflict.resolvedBy = "philosopher";
        if (passResult) {
          passResult.calls++;
        }
      }
      resolved.push(conflict);
    }

    return resolved;
  }

  private mergeFindings(a: Finding, b: Finding): string {
    const combined = `Merged finding: ${a.description}`;
    const additionalContext = b.description.replace(a.description, "").trim();
    if (additionalContext && additionalContext.length > 10) {
      return `${combined}. Additional context: ${additionalContext}`;
    }
    return combined;
  }

  private calculateChangePercentage(original: string, updated: string): number {
    const originalWords = original.toLowerCase().split(/\s+/);
    const updatedWords = updated.toLowerCase().split(/\s+/);
    
    const originalSet = new Set(originalWords);
    const updatedSet = new Set(updatedWords);
    
    let added = 0;
    let removed = 0;
    
    for (const word of updatedWords) {
      if (!originalSet.has(word)) added++;
    }
    for (const word of originalWords) {
      if (!updatedSet.has(word)) removed++;
    }
    
    const totalChanges = added + removed;
    const totalWords = Math.max(originalWords.length, updatedWords.length);
    
    return totalWords > 0 ? totalChanges / totalWords : 0;
  }

  private async storeAdjacent(adjacent: Adjacent): Promise<void> {
    if (!this.memoryManager || !this.workflowConfig.storeAdjacentsInML) {
      return;
    }

    await this.memoryManager.storeMemory(
      "philosopher",
      `Adjacent opportunity from Pass ${adjacent.pass}`,
      adjacent.description,
      0.9
    );
    adjacent.storedInML = true;
  }

  async execute(task: string): Promise<WorkflowOutput> {
    const output: WorkflowOutput = {
      version: "2.1",
      status: "complete",
      passes: [],
      totalCalls: 0,
      metaGoals: [],
      allFindings: [],
      allConflicts: [],
      allAdjacents: [],
      finalRoadmap: "",
      signoff: {
        pass1: { architect: false, mechanic: false, philosopher: false },
        pass2: { architect: false, mechanic: false, philosopher: "skipped" },
        pass3: { architect: false, mechanic: false, philosopher: false, codeNinja: false },
      },
    };

    console.log("\n=== PASS 1: FOUNDATION (3 calls) ===\n");
    const pass1 = await this.executePass1(task);
    output.passes.push(pass1);
    output.totalCalls += pass1.calls;
    output.allFindings.push(...pass1.findings);
    output.allConflicts.push(...pass1.conflicts);
    output.allAdjacents.push(...pass1.adjacents);
    output.signoff.pass1 = { architect: true, mechanic: true, philosopher: true };

    const pass1ArchOutput = pass1.agentOutputs.get("architect");
    const pass1PlanContent = pass1ArchOutput?.response.recommendation || "";

    console.log("\n=== PASS 2: REFINEMENT (2 calls + optional trigger) ===\n");
    const pass2 = await this.executePass2(task, pass1);
    output.passes.push(pass2);
    output.totalCalls += pass2.calls;
    output.allFindings.push(...pass2.findings);
    output.allConflicts.push(...pass2.conflicts);
    output.allAdjacents.push(...pass2.adjacents);

    const pass2ArchOutput = pass2.agentOutputs.get("architect");
    const pass2PlanContent = pass2ArchOutput?.response.recommendation || "";
    const changePercentage = this.calculateChangePercentage(pass1PlanContent, pass2PlanContent);
    
    if (changePercentage > this.workflowConfig.philosopherTriggerThreshold) {
      console.log(`[Philosopher Triggered] Change percentage: ${(changePercentage * 100).toFixed(1)}%`);
      output.signoff.pass2 = { architect: true, mechanic: true, philosopher: true };
    } else {
      console.log(`[Philosopher Skipped] Change percentage: ${(changePercentage * 100).toFixed(1)}% (threshold: ${this.workflowConfig.philosopherTriggerThreshold * 100}%)`);
      output.signoff.pass2 = { architect: true, mechanic: true, philosopher: "skipped" };
    }

    console.log("\n=== PASS 3: FINAL (3 calls) ===\n");
    const pass3 = await this.executePass3(task, pass2);
    output.passes.push(pass3);
    output.totalCalls += pass3.calls;
    output.allFindings.push(...pass3.findings);
    output.allAdjacents.push(...pass3.adjacents);
    output.signoff.pass3 = { architect: true, mechanic: true, philosopher: true, codeNinja: true };

    const finalArchOutput = pass3.agentOutputs.get("architect");
    output.finalRoadmap = finalArchOutput?.response.recommendation || "";
    output.ninjaExecution = pass3.agentOutputs.get("codeNinja");

    const philosopherOutput = pass1.agentOutputs.get("philosopher");
    if (philosopherOutput) {
      output.metaGoals = this.extractGoals(philosopherOutput.response.recommendation);
    }

    for (const adjacent of output.allAdjacents) {
      await this.storeAdjacent(adjacent);
    }

    console.log("\n=== SIGN-OFF COMPLETE ===");
    console.log(`Total AI Calls: ${output.totalCalls}`);
    console.log(`Findings: ${output.allFindings.length}`);
    console.log(`Conflicts Resolved: ${output.allConflicts.length}`);
    console.log(`Adjacents Captured: ${output.allAdjacents.length}`);

    return output;
  }

  private async executePass1(task: string): Promise<PassResult> {
    const result: PassResult = {
      pass: 1,
      calls: 0,
      findings: [],
      conflicts: [],
      adjacents: [],
      agentOutputs: new Map(),
    };

    console.log("[Call 1] PHILOSOPHER: Meta-Goals & Opportunities");
    const philosopherPrompt = `As Philosopher, establish meta-goals for this task:

${task}

1. Define success metrics (max 5)
2. Identify adjacent opportunities for future optimization
3. Set quality thresholds

Keep under 300 words.`;

    const philosopherResult = await this.philosopher.invoke(philosopherPrompt);
    result.agentOutputs.set("philosopher", philosopherResult);
    result.calls++;
    result.adjacents.push(...this.parseAdjacents(philosopherResult.response.recommendation, 1));

    console.log("[Call 2] ARCHITECT: READ → THINK → RESPOND");
    const architectPrompt = `As Architect, create a plan for this task:

${task}

Meta-goals from Philosopher:
${philosopherResult.response.recommendation}

Provide:
1. Findings list (ARCH-001, ARCH-002...)
2. Core components (max 3)
3. Data flow (text-based)

Keep under 500 words. No implementation details.`;

    const architectResult = await this.architect.invoke(architectPrompt);
    result.agentOutputs.set("architect", architectResult);
    result.calls++;
    const archFindings = this.parseFindings(architectResult.response.recommendation, "architect");
    result.findings.push(...archFindings);

    console.log("[Call 3] MECHANIC: Validate + Own Findings");
    const mechanicPrompt = `Validate Architect's findings for this task:

${task}

Architect's Plan:
${architectResult.response.recommendation}

Provide:
1. Validation status per finding
2. Your own findings (MECH-001...)
3. Risk assessment

Flag contradictions for Philosopher escalation.`;

    const mechanicResult = await this.mechanic.invoke(mechanicPrompt);
    result.agentOutputs.set("mechanic", mechanicResult);
    result.calls++;
    const mechFindings = this.parseFindings(mechanicResult.response.recommendation, "mechanic");
    result.findings.push(...mechFindings);

    console.log("[Joint Resolution] Auto or Escalate");
    const conflicts = this.detectConflicts(archFindings, mechFindings);
    result.conflicts = await this.resolveConflicts(conflicts, result);

    return result;
  }

  private async executePass2(task: string, pass1: PassResult): Promise<PassResult> {
    const result: PassResult = {
      pass: 2,
      calls: 0,
      findings: [],
      conflicts: [],
      adjacents: [],
      agentOutputs: new Map(),
    };

    const pass1ArchOutput = pass1.agentOutputs.get("architect");
    const pass1MechOutput = pass1.agentOutputs.get("mechanic");
    const pass1PlanContent = pass1ArchOutput?.response.recommendation || "";

    console.log("[Call 4] ARCHITECT: Update Plan from Mechanic");
    const architectPrompt = `Update your plan based on Mechanic's feedback:

Original Plan:
${pass1PlanContent}

Mechanic Feedback:
${pass1MechOutput?.response.recommendation || "No feedback"}

Resolved Conflicts:
${pass1.conflicts.map(c => `${c.id}: ${c.resolution}`).join("\n") || "None"}

Incorporate edge cases and address all issues.`;

    const architectResult = await this.architect.invoke(architectPrompt);
    result.agentOutputs.set("architect", architectResult);
    result.calls++;

    console.log("[Call 5] MECHANIC: Validate Updates");
    const mechanicPrompt = `Validate the updated plan:

Updated Plan:
${architectResult.response.recommendation}

Provide:
1. Risk analysis
2. Edge case coverage check
3. Calculate change percentage from original`;

    const mechanicResult = await this.mechanic.invoke(mechanicPrompt);
    result.agentOutputs.set("mechanic", mechanicResult);
    result.calls++;
    result.findings.push(...this.parseFindings(mechanicResult.response.recommendation, "mechanic"));

    const changePercentage = this.calculateChangePercentage(
      pass1PlanContent,
      architectResult.response.recommendation
    );

    if (changePercentage > this.workflowConfig.philosopherTriggerThreshold) {
      console.log(`[Optional Trigger] PHILOSOPHER: Alignment Check (${(changePercentage * 100).toFixed(1)}% > ${this.workflowConfig.philosopherTriggerThreshold * 100}%)`);
      
      const philosopherPrompt = `Check alignment after significant changes (${(changePercentage * 100).toFixed(1)}% changed):

Original Goals:
${pass1.agentOutputs.get("philosopher")?.response.recommendation || "N/A"}

Updated Plan:
${architectResult.response.recommendation}

1. Confirm goals still aligned
2. Spot new adjacent opportunities
3. Flag any concerns`;

      const philosopherResult = await this.philosopher.invoke(philosopherPrompt);
      result.agentOutputs.set("philosopher", philosopherResult);
      result.calls++;
      result.adjacents.push(...this.parseAdjacents(philosopherResult.response.recommendation, 2));
    }

    return result;
  }

  private async executePass3(task: string, pass2: PassResult): Promise<PassResult> {
    const result: PassResult = {
      pass: 3,
      calls: 0,
      findings: [],
      conflicts: [],
      adjacents: [],
      agentOutputs: new Map(),
    };

    const pass2ArchOutput = pass2.agentOutputs.get("architect");

    console.log("[Call 6] ARCHITECT: Final Roadmap");
    const architectPrompt = `Finalize the roadmap:

Current Plan:
${pass2ArchOutput?.response.recommendation || ""}

All Findings Addressed:
${pass2.findings.map(f => `${f.id}: ${f.description}`).join("\n") || "None pending"}

Create the final implementation roadmap.`;

    const architectResult = await this.architect.invoke(architectPrompt);
    result.agentOutputs.set("architect", architectResult);
    result.calls++;

    console.log("[Call 7] MECHANIC + PHILOSOPHER: Joint Validation (1 combined call)");
    const jointPrompt = `Joint validation of final roadmap (act as both Mechanic and Philosopher):

Final Roadmap:
${architectResult.response.recommendation}

=== MECHANIC VALIDATION ===
Verify:
- [ ] All findings addressed
- [ ] Edge cases covered
- [ ] Risk analysis complete

=== PHILOSOPHER VALIDATION ===
Confirm:
- [ ] Goals aligned with original meta-goals
- [ ] Strategic impact is positive
- [ ] Document any final ADJACENT OPPORTUNITIES for future optimization

Provide comprehensive validation covering both perspectives.`;

    const jointResult = await this.philosopher.invoke(jointPrompt);
    result.agentOutputs.set("joint", jointResult);
    result.agentOutputs.set("philosopher", jointResult);
    result.calls++;
    result.adjacents.push(...this.parseAdjacents(jointResult.response.recommendation, 3));

    console.log("[Call 8] CODE NINJA: Execute Approved Changes");
    const ninjaPrompt = `Implement approved changes from validated roadmap:

${architectResult.response.recommendation}

Rules:
1. Follow approved blueprint exactly
2. No additional features
3. No scope expansion

Execute and report completion status.`;

    const ninjaResult = await this.codeNinja.invoke(ninjaPrompt);
    result.agentOutputs.set("codeNinja", ninjaResult);
    result.calls++;

    return result;
  }

  private extractGoals(philosopherOutput: string): string[] {
    const goals: string[] = [];
    const lines = philosopherOutput.split("\n");

    for (const line of lines) {
      if (line.includes("goal") || line.includes("metric") || line.includes("target")) {
        goals.push(line.trim());
      }
    }

    return goals.length > 0 ? goals : ["Complete task successfully"];
  }

  formatOutput(output: WorkflowOutput): string {
    const sections: string[] = [];

    sections.push(`# Implementation Plan
**Version:** ${output.version}
**Date:** ${new Date().toISOString().split("T")[0]}
**Status:** ${output.status === "complete" ? "Review Complete" : "Failed"}

---`);

    sections.push(`## 1. Meta-Goals (PHILOSOPHER - Pass 1)
${output.metaGoals.map(g => `- ${g}`).join("\n")}

**Adjacent Opportunities:** ${output.allAdjacents.filter(a => a.pass === 1).length} identified
**ML Storage:** ${output.allAdjacents.filter(a => a.storedInML).length} stored

---`);

    sections.push(`## 2. Architect Findings
| ID | Description | Impact |
|----|-------------|--------|
${output.allFindings.filter(f => f.agent === "architect").map(f => `| ${f.id} | ${f.description.substring(0, 50)}... | ${f.impact} |`).join("\n")}

---`);

    sections.push(`## 3. Mechanic Validation
| ID | Description | Impact |
|----|-------------|--------|
${output.allFindings.filter(f => f.agent === "mechanic").map(f => `| ${f.id} | ${f.description.substring(0, 50)}... | ${f.impact} |`).join("\n")}

---`);

    sections.push(`## 4. Conflict Resolutions
| ID | Type | Resolution | Resolved By |
|----|------|------------|-------------|
${output.allConflicts.map(c => `| ${c.id} | ${c.type} | ${(c.resolution || "").substring(0, 30)}... | ${c.resolvedBy} |`).join("\n") || "| - | - | No conflicts | - |"}

---`);

    sections.push(`## 5. Final Roadmap
${output.finalRoadmap}

---`);

    sections.push(`## 6. Code Ninja Execution
${output.ninjaExecution?.response.recommendation || "Execution pending"}

---`);

    sections.push(`## 7. Final Adjacents (PHILOSOPHER - Pass 3)
${output.allAdjacents.filter(a => a.pass === 3).map(a => `- ${a.description}`).join("\n") || "None identified"}

---`);

    sections.push(`## 8. Sign-off Summary
| Pass | Architect | Mechanic | Philosopher | Code Ninja |
|------|-----------|----------|-------------|------------|
| 1 | ${output.signoff.pass1.architect ? "✓" : "-"} | ${output.signoff.pass1.mechanic ? "✓" : "-"} | ${output.signoff.pass1.philosopher ? "✓" : "-"} | - |
| 2 | ${output.signoff.pass2.architect ? "✓" : "-"} | ${output.signoff.pass2.mechanic ? "✓" : "-"} | ${output.signoff.pass2.philosopher === "skipped" ? "Skipped" : output.signoff.pass2.philosopher ? "✓" : "-"} | - |
| 3 | ${output.signoff.pass3.architect ? "✓" : "-"} | ${output.signoff.pass3.mechanic ? "✓" : "-"} | ${output.signoff.pass3.philosopher ? "✓" : "-"} | ${output.signoff.pass3.codeNinja ? "✓" : "-"} |

**Total AI Calls:** ${output.totalCalls}
`);

    return sections.join("\n");
  }
}
