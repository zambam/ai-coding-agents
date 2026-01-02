import { insertRunOutcomeSchema, insertHumanFeedbackSchema, insertPromptVariantSchema, insertMemoryEntrySchema, insertAgentReportSchema, insertProjectGuidelinesSchema, insertFailurePatternSchema, } from "@shared/schema";
import { randomUUID } from "crypto";
export { insertRunOutcomeSchema, insertHumanFeedbackSchema, insertPromptVariantSchema, insertMemoryEntrySchema, insertAgentReportSchema, insertProjectGuidelinesSchema, insertFailurePatternSchema, };
export class MemStorage {
    constructor() {
        this.users = new Map();
        this.runOutcomes = new Map();
        this.humanFeedbackStore = new Map();
        this.promptVariants = new Map();
        this.memoryEntries = new Map();
        this.agentReports = new Map();
        this.projectGuidelinesStore = new Map();
        this.failurePatternsStore = new Map();
    }
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByUsername(username) {
        return Array.from(this.users.values()).find((user) => user.username === username);
    }
    async createUser(insertUser) {
        const id = randomUUID();
        const user = { ...insertUser, id };
        this.users.set(id, user);
        return user;
    }
    async createRunOutcome(outcome) {
        const id = randomUUID();
        const runOutcome = {
            id,
            runId: outcome.runId,
            agentType: outcome.agentType,
            outcomeStatus: outcome.outcomeStatus,
            editDistance: outcome.editDistance ?? null,
            timeToDecision: outcome.timeToDecision ?? null,
            grokAgreed: outcome.grokAgreed ?? null,
            classicMetrics: outcome.classicMetrics ?? null,
            promptVersion: outcome.promptVersion ?? null,
            createdAt: new Date(),
        };
        this.runOutcomes.set(outcome.runId, runOutcome);
        return runOutcome;
    }
    async getRunOutcome(runId) {
        return this.runOutcomes.get(runId);
    }
    async getRunOutcomesByAgent(agentType, limit = 100) {
        const outcomes = [];
        this.runOutcomes.forEach((o) => {
            if (o.agentType === agentType) {
                outcomes.push(o);
            }
        });
        return outcomes
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async updateRunOutcome(runId, updates) {
        const existing = this.runOutcomes.get(runId);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            editDistance: updates.editDistance !== undefined ? updates.editDistance ?? null : existing.editDistance,
            timeToDecision: updates.timeToDecision !== undefined ? updates.timeToDecision ?? null : existing.timeToDecision,
            grokAgreed: updates.grokAgreed !== undefined ? updates.grokAgreed ?? null : existing.grokAgreed,
            classicMetrics: updates.classicMetrics !== undefined ? updates.classicMetrics ?? null : existing.classicMetrics,
            promptVersion: updates.promptVersion !== undefined ? updates.promptVersion ?? null : existing.promptVersion,
            outcomeStatus: (updates.outcomeStatus ?? existing.outcomeStatus),
            agentType: (updates.agentType ?? existing.agentType),
            runId: updates.runId ?? existing.runId,
        };
        this.runOutcomes.set(runId, updated);
        return updated;
    }
    async getAcceptanceRate(agentType) {
        const outcomes = [];
        this.runOutcomes.forEach((o) => {
            if (o.agentType === agentType) {
                outcomes.push(o);
            }
        });
        if (outcomes.length === 0)
            return 0;
        const accepted = outcomes.filter((o) => o.outcomeStatus === "accepted").length;
        return accepted / outcomes.length;
    }
    async cleanupOldOutcomes(retentionDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        let deleted = 0;
        const toDelete = [];
        this.runOutcomes.forEach((outcome, runId) => {
            if (outcome.createdAt < cutoff) {
                toDelete.push(runId);
            }
        });
        for (const runId of toDelete) {
            this.runOutcomes.delete(runId);
            deleted++;
        }
        return deleted;
    }
    async createFeedback(feedback) {
        const id = randomUUID();
        const humanFeedback = {
            id,
            runId: feedback.runId,
            rating: feedback.rating ?? null,
            tags: feedback.tags ?? null,
            comment: feedback.comment ?? null,
            submittedAt: new Date(),
        };
        this.humanFeedbackStore.set(id, humanFeedback);
        return humanFeedback;
    }
    async getFeedbackByRunId(runId) {
        let found;
        this.humanFeedbackStore.forEach((f) => {
            if (f.runId === runId) {
                found = f;
            }
        });
        return found;
    }
    async getFeedbackByTags(tags, limit = 100) {
        const results = [];
        this.humanFeedbackStore.forEach((f) => {
            if (f.tags?.some((t) => tags.includes(t))) {
                results.push(f);
            }
        });
        return results.slice(0, limit);
    }
    async createPromptVariant(variant) {
        const id = randomUUID();
        const promptVariant = {
            id,
            agentType: variant.agentType,
            version: variant.version,
            promptText: variant.promptText,
            status: variant.status,
            trafficPercent: variant.trafficPercent ?? null,
            metrics: variant.metrics ?? null,
            createdAt: new Date(),
            promotedAt: variant.promotedAt ?? null,
            retiredAt: variant.retiredAt ?? null,
        };
        this.promptVariants.set(id, promptVariant);
        return promptVariant;
    }
    async getPromptVariant(id) {
        return this.promptVariants.get(id);
    }
    async getPromotedVariant(agentType) {
        let found;
        this.promptVariants.forEach((v) => {
            if (v.agentType === agentType && v.status === "promoted") {
                found = v;
            }
        });
        return found;
    }
    async getVariantsByStatus(agentType, status) {
        const results = [];
        this.promptVariants.forEach((v) => {
            if (v.agentType === agentType && v.status === status) {
                results.push(v);
            }
        });
        return results;
    }
    async updatePromptVariant(id, updates) {
        const existing = this.promptVariants.get(id);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            agentType: (updates.agentType ?? existing.agentType),
            version: updates.version ?? existing.version,
            promptText: updates.promptText ?? existing.promptText,
            status: (updates.status ?? existing.status),
            trafficPercent: updates.trafficPercent !== undefined ? updates.trafficPercent ?? null : existing.trafficPercent,
            metrics: updates.metrics !== undefined ? updates.metrics ?? null : existing.metrics,
            promotedAt: updates.promotedAt !== undefined ? updates.promotedAt ?? null : existing.promotedAt,
            retiredAt: updates.retiredAt !== undefined ? updates.retiredAt ?? null : existing.retiredAt,
        };
        this.promptVariants.set(id, updated);
        return updated;
    }
    async getNextVersionNumber(agentType) {
        const variants = [];
        this.promptVariants.forEach((v) => {
            if (v.agentType === agentType) {
                variants.push(v);
            }
        });
        if (variants.length === 0)
            return 1;
        return Math.max(...variants.map((v) => v.version)) + 1;
    }
    async createMemoryEntry(entry) {
        const id = randomUUID();
        const memoryEntry = {
            id,
            agentType: entry.agentType,
            taskDescription: entry.taskDescription,
            taskEmbedding: entry.taskEmbedding ?? null,
            response: entry.response,
            qualityScore: entry.qualityScore,
            accessCount: 0,
            createdAt: new Date(),
            expiresAt: entry.expiresAt,
        };
        this.memoryEntries.set(id, memoryEntry);
        return memoryEntry;
    }
    async getMemoryEntry(id) {
        return this.memoryEntries.get(id);
    }
    async findSimilarMemories(agentType, embedding, limit = 5) {
        const entries = [];
        this.memoryEntries.forEach((e) => {
            if (e.agentType === agentType && e.expiresAt > new Date()) {
                entries.push(e);
            }
        });
        if (entries.length === 0 || embedding.length === 0)
            return [];
        const scored = entries
            .filter((e) => e.taskEmbedding && e.taskEmbedding.length === embedding.length)
            .map((e) => {
            const similarity = cosineSimilarity(embedding, e.taskEmbedding);
            return { entry: e, similarity };
        })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        return scored.map((s) => s.entry);
    }
    async incrementAccessCount(id) {
        const entry = this.memoryEntries.get(id);
        if (entry) {
            entry.accessCount = (entry.accessCount || 0) + 1;
            this.memoryEntries.set(id, entry);
        }
    }
    async cleanupExpiredMemories() {
        const now = new Date();
        let deleted = 0;
        const toDelete = [];
        this.memoryEntries.forEach((entry, id) => {
            if (entry.expiresAt < now) {
                toDelete.push(id);
            }
        });
        for (const id of toDelete) {
            this.memoryEntries.delete(id);
            deleted++;
        }
        return deleted;
    }
    async createAgentReport(report) {
        const id = randomUUID();
        const agentReport = {
            id,
            projectId: report.projectId,
            externalAgent: report.externalAgent,
            sessionId: report.sessionId ?? null,
            action: report.action,
            codeGenerated: report.codeGenerated ?? null,
            codeAccepted: report.codeAccepted ?? null,
            humanCorrection: report.humanCorrection ?? null,
            errorMessage: report.errorMessage ?? null,
            failureCategory: report.failureCategory ?? null,
            failureSeverity: report.failureSeverity ?? null,
            filePath: report.filePath ?? null,
            language: report.language ?? null,
            context: report.context ?? null,
            createdAt: new Date(),
        };
        this.agentReports.set(id, agentReport);
        return agentReport;
    }
    async getAgentReport(id) {
        return this.agentReports.get(id);
    }
    async getAgentReportsByProject(projectId, limit = 100) {
        const reports = [];
        this.agentReports.forEach((r) => {
            if (r.projectId === projectId) {
                reports.push(r);
            }
        });
        return reports
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async getAgentReportsByCategory(category, limit = 100) {
        const reports = [];
        this.agentReports.forEach((r) => {
            if (r.failureCategory === category) {
                reports.push(r);
            }
        });
        return reports
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async getAgentReportsWithFailures(projectId) {
        const reports = [];
        this.agentReports.forEach((r) => {
            if (r.projectId === projectId && r.failureCategory) {
                reports.push(r);
            }
        });
        return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async cleanupOldReports(retentionDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        let deleted = 0;
        const toDelete = [];
        this.agentReports.forEach((report, id) => {
            if (report.createdAt < cutoff) {
                toDelete.push(id);
            }
        });
        for (const id of toDelete) {
            this.agentReports.delete(id);
            deleted++;
        }
        return deleted;
    }
    async createProjectGuidelines(guidelines) {
        const id = randomUUID();
        const now = new Date();
        const projectGuidelines = {
            id,
            projectId: guidelines.projectId,
            rulesMarkdown: guidelines.rulesMarkdown,
            ruleCount: guidelines.ruleCount,
            confidence: guidelines.confidence,
            observationCount: guidelines.observationCount,
            enabledCategories: guidelines.enabledCategories ?? null,
            crossProjectLearning: guidelines.crossProjectLearning ?? false,
            createdAt: now,
            updatedAt: now,
        };
        this.projectGuidelinesStore.set(guidelines.projectId, projectGuidelines);
        return projectGuidelines;
    }
    async getProjectGuidelines(projectId) {
        return this.projectGuidelinesStore.get(projectId);
    }
    async updateProjectGuidelines(projectId, updates) {
        const existing = this.projectGuidelinesStore.get(projectId);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            rulesMarkdown: updates.rulesMarkdown ?? existing.rulesMarkdown,
            ruleCount: updates.ruleCount ?? existing.ruleCount,
            confidence: updates.confidence ?? existing.confidence,
            observationCount: updates.observationCount ?? existing.observationCount,
            enabledCategories: updates.enabledCategories !== undefined ? updates.enabledCategories ?? null : existing.enabledCategories,
            crossProjectLearning: updates.crossProjectLearning ?? existing.crossProjectLearning,
            updatedAt: new Date(),
        };
        this.projectGuidelinesStore.set(projectId, updated);
        return updated;
    }
    async createFailurePattern(pattern) {
        const id = randomUUID();
        const now = new Date();
        const failurePattern = {
            id,
            projectId: pattern.projectId ?? null,
            category: pattern.category,
            pattern: pattern.pattern,
            occurrences: pattern.occurrences ?? 1,
            exampleCodes: pattern.exampleCodes ?? null,
            exampleCorrections: pattern.exampleCorrections ?? null,
            suggestedRule: pattern.suggestedRule ?? null,
            confidence: pattern.confidence ?? null,
            isGlobal: pattern.isGlobal ?? false,
            createdAt: now,
            updatedAt: now,
        };
        this.failurePatternsStore.set(id, failurePattern);
        return failurePattern;
    }
    async getFailurePattern(id) {
        return this.failurePatternsStore.get(id);
    }
    async getFailurePatternsByProject(projectId) {
        const patterns = [];
        this.failurePatternsStore.forEach((p) => {
            if (p.projectId === projectId) {
                patterns.push(p);
            }
        });
        return patterns.sort((a, b) => b.occurrences - a.occurrences);
    }
    async getFailurePatternsByCategory(category) {
        const patterns = [];
        this.failurePatternsStore.forEach((p) => {
            if (p.category === category) {
                patterns.push(p);
            }
        });
        return patterns.sort((a, b) => b.occurrences - a.occurrences);
    }
    async getGlobalPatterns() {
        const patterns = [];
        this.failurePatternsStore.forEach((p) => {
            if (p.isGlobal) {
                patterns.push(p);
            }
        });
        return patterns.sort((a, b) => b.occurrences - a.occurrences);
    }
    async incrementPatternOccurrence(id) {
        const existing = this.failurePatternsStore.get(id);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            occurrences: existing.occurrences + 1,
            updatedAt: new Date(),
        };
        this.failurePatternsStore.set(id, updated);
        return updated;
    }
    async updateFailurePattern(id, updates) {
        const existing = this.failurePatternsStore.get(id);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            projectId: updates.projectId !== undefined ? updates.projectId ?? null : existing.projectId,
            category: (updates.category ?? existing.category),
            pattern: updates.pattern ?? existing.pattern,
            occurrences: updates.occurrences ?? existing.occurrences,
            exampleCodes: updates.exampleCodes !== undefined ? updates.exampleCodes ?? null : existing.exampleCodes,
            exampleCorrections: updates.exampleCorrections !== undefined ? updates.exampleCorrections ?? null : existing.exampleCorrections,
            suggestedRule: updates.suggestedRule !== undefined ? updates.suggestedRule ?? null : existing.suggestedRule,
            confidence: updates.confidence !== undefined ? updates.confidence ?? null : existing.confidence,
            isGlobal: updates.isGlobal ?? existing.isGlobal,
            updatedAt: new Date(),
        };
        this.failurePatternsStore.set(id, updated);
        return updated;
    }
    async getMonitorAnalytics(projectId) {
        const reports = [];
        this.agentReports.forEach((r) => {
            if (!projectId || r.projectId === projectId) {
                reports.push(r);
            }
        });
        const failuresByCategory = {
            security_gap: 0,
            logic_error: 0,
            context_blindness: 0,
            outdated_api: 0,
            missing_edge_case: 0,
            poor_readability: 0,
            broke_existing: 0,
            hallucinated_code: 0,
        };
        const failuresByAgent = {
            replit_agent: 0,
            cursor: 0,
            copilot: 0,
            claude_code: 0,
            windsurf: 0,
            aider: 0,
            continue: 0,
            cody: 0,
            unknown: 0,
        };
        const failuresBySeverity = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };
        const dateCounts = {};
        reports.forEach((r) => {
            if (r.failureCategory) {
                failuresByCategory[r.failureCategory]++;
                failuresByAgent[r.externalAgent]++;
                if (r.failureSeverity) {
                    failuresBySeverity[r.failureSeverity]++;
                }
            }
            const dateKey = r.createdAt.toISOString().split("T")[0];
            dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
        });
        const patterns = [];
        this.failurePatternsStore.forEach((p) => {
            if (!projectId || p.projectId === projectId || p.isGlobal) {
                patterns.push(p);
            }
        });
        const topPatterns = patterns
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 10)
            .map((p) => ({
            pattern: p.pattern,
            occurrences: p.occurrences,
            category: p.category,
        }));
        const recentTrend = Object.entries(dateCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-30)
            .map(([date, count]) => ({ date, count }));
        return {
            totalReports: reports.length,
            failuresByCategory,
            failuresByAgent,
            failuresBySeverity,
            topPatterns,
            recentTrend,
        };
    }
}
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
export const storage = new MemStorage();
//# sourceMappingURL=storage.js.map