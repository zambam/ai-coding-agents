import * as fs from "fs";
import * as path from "path";
import { DEFAULT_AGENT_CONFIG } from "../constants";
export class ReplitMdParser {
    constructor(configPath) {
        this.configPath = configPath || path.join(process.cwd(), "replit.md");
    }
    async parse() {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, "utf-8");
            return this.parseContent(content);
        }
        catch (error) {
            console.warn("Could not parse replit.md:", error);
            return this.getDefaultConfig();
        }
    }
    parseContent(content) {
        const config = this.getDefaultConfig();
        const consistencyMatch = content.match(/consistency\.mode:\s*(none|fast|robust)/i);
        if (consistencyMatch) {
            config.agentConfig.consistencyMode = consistencyMatch[1].toLowerCase();
        }
        const validationMatch = content.match(/validationLevel:\s*(low|medium|high|strict)/i);
        if (validationMatch) {
            config.agentConfig.validationLevel = validationMatch[1].toLowerCase();
        }
        const selfCritiqueMatch = content.match(/enableSelfCritique:\s*(true|false)/i);
        if (selfCritiqueMatch) {
            config.agentConfig.enableSelfCritique = selfCritiqueMatch[1].toLowerCase() === "true";
        }
        const philosopherMatch = content.match(/enablePhilosopher:\s*(true|false)/i);
        if (philosopherMatch) {
            config.agentConfig.enablePhilosopher = philosopherMatch[1].toLowerCase() === "true";
        }
        const grokMatch = content.match(/enableGrokSecondOpinion:\s*(true|false)/i);
        if (grokMatch) {
            config.agentConfig.enableGrokSecondOpinion = grokMatch[1].toLowerCase() === "true";
        }
        const codeStandardsSection = content.match(/## Code Standards[\s\S]*?(?=##|$)/i);
        if (codeStandardsSection) {
            const items = codeStandardsSection[0].match(/[-*]\s+(.+)/g);
            if (items) {
                config.codeStandards = items.map(item => item.replace(/^[-*]\s+/, "").trim());
            }
        }
        return config;
    }
    getDefaultConfig() {
        return {
            agentConfig: {},
            codeStandards: [],
            architecturalRules: [],
            securityConstraints: [],
            customInstructions: [],
        };
    }
    buildContextFromConfig(config) {
        const parts = [];
        if (config.codeStandards.length > 0) {
            parts.push("Code Standards:\n" + config.codeStandards.map(s => `- ${s}`).join("\n"));
        }
        if (config.architecturalRules.length > 0) {
            parts.push("Architectural Rules:\n" + config.architecturalRules.map(r => `- ${r}`).join("\n"));
        }
        if (config.securityConstraints.length > 0) {
            parts.push("Security Constraints:\n" + config.securityConstraints.map(c => `- ${c}`).join("\n"));
        }
        if (config.customInstructions.length > 0) {
            parts.push("Custom Instructions:\n" + config.customInstructions.map(i => `- ${i}`).join("\n"));
        }
        return parts.join("\n\n");
    }
    mergeWithDefaults(parsed) {
        return {
            ...DEFAULT_AGENT_CONFIG,
            ...parsed.agentConfig,
        };
    }
}
//# sourceMappingURL=replit-md-parser.js.map