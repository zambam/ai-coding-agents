import type { AgentType } from "@shared/schema";
import type { IDataTelemetry, MemoryEntry } from "../../storage";
export interface MemorySearchResult {
    entry: MemoryEntry;
    similarity: number;
}
export interface MemoryManagerConfig {
    maxMemories: number;
    similarityThreshold: number;
    defaultTTLDays: number;
    embeddingDimension: number;
}
export declare class MemoryManager {
    private storage;
    private config;
    constructor(storage: IDataTelemetry, config?: Partial<MemoryManagerConfig>);
    storeMemory(agentType: AgentType, taskDescription: string, response: string, qualityScore: number): Promise<MemoryEntry>;
    retrieveRelevantMemories(agentType: AgentType, taskDescription: string, limit?: number): Promise<MemorySearchResult[]>;
    buildContextFromMemories(agentType: AgentType, taskDescription: string): Promise<string>;
    pruneExpiredMemories(): Promise<number>;
    getMemoryStats(agentType: AgentType): Promise<{
        totalMemories: number;
        avgQualityScore: number;
        avgAccessCount: number;
    }>;
    private generateSimpleEmbedding;
    private simpleHash;
    private cosineSimilarity;
}
//# sourceMappingURL=memory-manager.d.ts.map