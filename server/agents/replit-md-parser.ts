import fs from "fs";
import path from "path";
import type { ReplitMdConfig, AgentConfig, ConsistencyMode, ValidationLevel, DEFAULT_AGENT_CONFIG } from "@shared/schema";

const CONFIG_PATTERNS = {
  consistencyMode: /consistency\.mode:\s*(none|fast|robust)/i,
  validationLevel: /validationLevel:\s*(low|medium|high|strict)/i,
  enableSelfCritique: /enableSelfCritique:\s*(true|false)/i,
  enablePhilosopher: /enablePhilosopher:\s*(true|false)/i,
  maxTokens: /maxTokens:\s*(\d+)/i,
  temperature: /temperature:\s*([\d.]+)/i,
};

export class ReplitMdParser {
  private configPaths: string[];
  private cachedConfig: ReplitMdConfig | null = null;

  constructor(basePath: string = process.cwd()) {
    this.configPaths = [
      path.join(basePath, "replit.md"),
      path.join(basePath, "AGENT.md"),
      path.join(basePath, ".replit.md"),
    ];
  }

  async parse(): Promise<ReplitMdConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    let content = "";
    
    for (const configPath of this.configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          content = fs.readFileSync(configPath, "utf-8");
          break;
        }
      } catch {
        continue;
      }
    }

    this.cachedConfig = this.parseContent(content);
    return this.cachedConfig;
  }

  private parseContent(content: string): ReplitMdConfig {
    const agentConfig: Partial<AgentConfig> = {};

    const consistencyMatch = content.match(CONFIG_PATTERNS.consistencyMode);
    if (consistencyMatch) {
      agentConfig.consistencyMode = consistencyMatch[1].toLowerCase() as ConsistencyMode;
    }

    const validationMatch = content.match(CONFIG_PATTERNS.validationLevel);
    if (validationMatch) {
      agentConfig.validationLevel = validationMatch[1].toLowerCase() as ValidationLevel;
    }

    const selfCritiqueMatch = content.match(CONFIG_PATTERNS.enableSelfCritique);
    if (selfCritiqueMatch) {
      agentConfig.enableSelfCritique = selfCritiqueMatch[1].toLowerCase() === "true";
    }

    const philosopherMatch = content.match(CONFIG_PATTERNS.enablePhilosopher);
    if (philosopherMatch) {
      agentConfig.enablePhilosopher = philosopherMatch[1].toLowerCase() === "true";
    }

    const maxTokensMatch = content.match(CONFIG_PATTERNS.maxTokens);
    if (maxTokensMatch) {
      agentConfig.maxTokens = parseInt(maxTokensMatch[1], 10);
    }

    const temperatureMatch = content.match(CONFIG_PATTERNS.temperature);
    if (temperatureMatch) {
      agentConfig.temperature = parseFloat(temperatureMatch[1]);
    }

    const codeStandards = this.extractSection(content, "Code Standards");
    const architecturalRules = this.extractSection(content, "Architectural Rules");
    const securityConstraints = this.extractSection(content, "Security Constraints");
    const customInstructions = this.extractSection(content, "Custom Instructions");

    return {
      agentConfig,
      codeStandards,
      architecturalRules,
      securityConstraints,
      customInstructions,
    };
  }

  private extractSection(content: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(
      `##\\s*${sectionName}[\\s\\S]*?(?=##|$)`,
      "i"
    );
    const match = content.match(sectionRegex);
    
    if (!match) return [];

    const lines = match[0].split("\n");
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const item = trimmed.slice(1).trim();
        if (item) items.push(item);
      }
    }

    return items;
  }

  buildContextFromConfig(config: ReplitMdConfig): string {
    const sections: string[] = [];

    if (config.codeStandards.length > 0) {
      sections.push(`Code Standards:\n${config.codeStandards.map(s => `- ${s}`).join("\n")}`);
    }

    if (config.architecturalRules.length > 0) {
      sections.push(`Architectural Rules:\n${config.architecturalRules.map(s => `- ${s}`).join("\n")}`);
    }

    if (config.securityConstraints.length > 0) {
      sections.push(`Security Constraints:\n${config.securityConstraints.map(s => `- ${s}`).join("\n")}`);
    }

    if (config.customInstructions.length > 0) {
      sections.push(`Additional Instructions:\n${config.customInstructions.map(s => `- ${s}`).join("\n")}`);
    }

    return sections.join("\n\n");
  }

  clearCache(): void {
    this.cachedConfig = null;
  }
}
