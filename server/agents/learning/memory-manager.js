const DEFAULT_CONFIG = {
    maxMemories: 5,
    similarityThreshold: 0.7,
    defaultTTLDays: 30,
    embeddingDimension: 256,
};
export class MemoryManager {
    constructor(storage, config = {}) {
        this.storage = storage;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async storeMemory(agentType, taskDescription, response, qualityScore) {
        const embedding = this.generateSimpleEmbedding(taskDescription);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.config.defaultTTLDays);
        return this.storage.createMemoryEntry({
            agentType,
            taskDescription,
            taskEmbedding: embedding,
            response,
            qualityScore,
            expiresAt,
        });
    }
    async retrieveRelevantMemories(agentType, taskDescription, limit) {
        const embedding = this.generateSimpleEmbedding(taskDescription);
        const memories = await this.storage.findSimilarMemories(agentType, embedding, limit ?? this.config.maxMemories);
        const results = [];
        for (const memory of memories) {
            if (!memory.taskEmbedding)
                continue;
            const similarity = this.cosineSimilarity(embedding, memory.taskEmbedding);
            if (similarity >= this.config.similarityThreshold) {
                results.push({ entry: memory, similarity });
                await this.storage.incrementAccessCount(memory.id);
            }
        }
        return results.sort((a, b) => {
            const scoreA = a.similarity * 0.6 + a.entry.qualityScore * 0.4;
            const scoreB = b.similarity * 0.6 + b.entry.qualityScore * 0.4;
            return scoreB - scoreA;
        });
    }
    async buildContextFromMemories(agentType, taskDescription) {
        const memories = await this.retrieveRelevantMemories(agentType, taskDescription);
        if (memories.length === 0) {
            return "";
        }
        const contextParts = memories.map((m, i) => {
            return `[Example ${i + 1} - Quality: ${(m.entry.qualityScore * 100).toFixed(0)}%]
Task: ${m.entry.taskDescription}
Response: ${m.entry.response.substring(0, 500)}${m.entry.response.length > 500 ? "..." : ""}`;
        });
        return `\n\n--- Relevant Past Examples ---\n${contextParts.join("\n\n")}\n--- End Examples ---\n`;
    }
    async pruneExpiredMemories() {
        return this.storage.cleanupExpiredMemories();
    }
    async getMemoryStats(agentType) {
        const allMemories = await this.storage.findSimilarMemories(agentType, new Array(this.config.embeddingDimension).fill(0), 1000);
        const agentMemories = allMemories.filter((m) => m.agentType === agentType);
        if (agentMemories.length === 0) {
            return { totalMemories: 0, avgQualityScore: 0, avgAccessCount: 0 };
        }
        const avgQuality = agentMemories.reduce((sum, m) => sum + m.qualityScore, 0) / agentMemories.length;
        const avgAccess = agentMemories.reduce((sum, m) => sum + (m.accessCount ?? 0), 0) / agentMemories.length;
        return {
            totalMemories: agentMemories.length,
            avgQualityScore: avgQuality,
            avgAccessCount: avgAccess,
        };
    }
    generateSimpleEmbedding(text) {
        const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
        const words = normalized.split(/\s+/).filter((w) => w.length > 0);
        const embedding = new Array(this.config.embeddingDimension).fill(0);
        for (const word of words) {
            const hash = this.simpleHash(word);
            const index = Math.abs(hash) % this.config.embeddingDimension;
            embedding[index] += 1;
        }
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= magnitude;
            }
        }
        return embedding;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        if (magnitudeA === 0 || magnitudeB === 0)
            return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    }
}
//# sourceMappingURL=memory-manager.js.map