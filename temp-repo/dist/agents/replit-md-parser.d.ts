import type { ReplitMdConfig, AgentConfig } from "../types";
export declare class ReplitMdParser {
    private configPath;
    constructor(configPath?: string);
    parse(): Promise<ReplitMdConfig>;
    private parseContent;
    private getDefaultConfig;
    buildContextFromConfig(config: ReplitMdConfig): string;
    mergeWithDefaults(parsed: ReplitMdConfig): AgentConfig;
}
//# sourceMappingURL=replit-md-parser.d.ts.map