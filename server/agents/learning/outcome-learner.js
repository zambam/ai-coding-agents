const DEFAULT_CONFIG = {
    minDataPoints: 10,
    lookbackDays: 30,
    significanceThreshold: 0.1,
};
export class OutcomeLearner {
    constructor(storage, config = {}) {
        this.storage = storage;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async analyzeAgentPerformance(agentType) {
        const outcomes = await this.storage.getRunOutcomesByAgent(agentType, 500);
        if (outcomes.length < this.config.minDataPoints) {
            return {
                agentType,
                signalType: "neutral",
                strength: 0,
                insights: ["Insufficient data for analysis"],
                suggestedImprovements: [],
                dataPoints: outcomes.length,
            };
        }
        const acceptanceRate = await this.storage.getAcceptanceRate(agentType);
        const recentOutcomes = this.filterRecentOutcomes(outcomes);
        const recentAcceptanceRate = this.computeAcceptanceRate(recentOutcomes);
        const trend = recentAcceptanceRate - acceptanceRate;
        const insights = [];
        const improvements = [];
        if (acceptanceRate >= 0.8) {
            insights.push(`High acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`);
        }
        else if (acceptanceRate >= 0.6) {
            insights.push(`Moderate acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`);
            improvements.push("Consider reviewing rejected responses for patterns");
        }
        else {
            insights.push(`Low acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`);
            improvements.push("Significant prompt revision recommended");
        }
        if (trend > this.config.significanceThreshold) {
            insights.push(`Positive trend: +${(trend * 100).toFixed(1)}% recently`);
        }
        else if (trend < -this.config.significanceThreshold) {
            insights.push(`Negative trend: ${(trend * 100).toFixed(1)}% recently`);
            improvements.push("Recent performance degradation detected");
        }
        const editDistances = outcomes
            .filter((o) => o.editDistance !== null && o.outcomeStatus === "edited")
            .map((o) => o.editDistance);
        if (editDistances.length > 0) {
            const avgEdit = editDistances.reduce((a, b) => a + b, 0) / editDistances.length;
            if (avgEdit > 100) {
                insights.push(`High average edit distance: ${avgEdit.toFixed(0)} chars`);
                improvements.push("Responses require significant user modification");
            }
        }
        const signalType = acceptanceRate >= 0.7 ? "positive" : acceptanceRate >= 0.4 ? "neutral" : "negative";
        const strength = Math.abs(acceptanceRate - 0.5) * 2;
        return {
            agentType,
            signalType,
            strength,
            insights,
            suggestedImprovements: improvements,
            dataPoints: outcomes.length,
        };
    }
    async identifyFeedbackPatterns(agentType) {
        const outcomes = await this.storage.getRunOutcomesByAgent(agentType, 200);
        const patterns = new Map();
        for (const outcome of outcomes) {
            const feedback = await this.storage.getFeedbackByRunId(outcome.runId);
            if (feedback?.tags && feedback.tags.length > 0) {
                for (const tag of feedback.tags) {
                    const existing = patterns.get(tag) || {
                        pattern: tag,
                        frequency: 0,
                        associatedTags: [],
                        avgRating: null,
                    };
                    existing.frequency++;
                    const otherTags = feedback.tags.filter((t) => t !== tag);
                    for (const otherTag of otherTags) {
                        if (!existing.associatedTags.includes(otherTag)) {
                            existing.associatedTags.push(otherTag);
                        }
                    }
                    if (feedback.rating !== null) {
                        const currentTotal = (existing.avgRating ?? 0) * (existing.frequency - 1);
                        existing.avgRating = (currentTotal + feedback.rating) / existing.frequency;
                    }
                    patterns.set(tag, existing);
                }
            }
        }
        return Array.from(patterns.values())
            .sort((a, b) => b.frequency - a.frequency);
    }
    async generateImprovementSuggestions(agentType) {
        const signal = await this.analyzeAgentPerformance(agentType);
        const patterns = await this.identifyFeedbackPatterns(agentType);
        const suggestions = [...signal.suggestedImprovements];
        const problemTags = ["too_verbose", "too_brief", "incorrect", "off_topic", "confusing"];
        for (const pattern of patterns) {
            if (problemTags.includes(pattern.pattern) && pattern.frequency >= 3) {
                suggestions.push(this.tagToSuggestion(pattern.pattern, pattern.frequency));
            }
        }
        return Array.from(new Set(suggestions));
    }
    async computeGrokAgreementRate(agentType) {
        const outcomes = await this.storage.getRunOutcomesByAgent(agentType, 200);
        const withGrok = outcomes.filter((o) => o.grokAgreed !== null);
        if (withGrok.length === 0)
            return 0;
        const agreed = withGrok.filter((o) => o.grokAgreed === true).length;
        return agreed / withGrok.length;
    }
    filterRecentOutcomes(outcomes) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.config.lookbackDays);
        return outcomes.filter((o) => o.createdAt >= cutoff);
    }
    computeAcceptanceRate(outcomes) {
        if (outcomes.length === 0)
            return 0;
        const accepted = outcomes.filter((o) => o.outcomeStatus === "accepted").length;
        return accepted / outcomes.length;
    }
    tagToSuggestion(tag, frequency) {
        const suggestions = {
            too_verbose: `Reduce response length (${frequency} users found responses too verbose)`,
            too_brief: `Provide more detail (${frequency} users found responses too brief)`,
            incorrect: `Improve accuracy (${frequency} reports of incorrect information)`,
            off_topic: `Stay focused on the task (${frequency} off-topic complaints)`,
            confusing: `Clarify explanations (${frequency} users found responses confusing)`,
            helpful: "",
            creative: "",
            slow: `Optimize for speed (${frequency} users reported slow responses)`,
        };
        return suggestions[tag] || "";
    }
}
//# sourceMappingURL=outcome-learner.js.map