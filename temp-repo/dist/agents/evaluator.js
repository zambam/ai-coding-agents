const COST_PER_1K_INPUT = 0.0025;
const COST_PER_1K_OUTPUT = 0.01;
export class Evaluator {
    constructor(validationLevel = "medium") {
        this.validationLevel = validationLevel;
    }
    calculateCost(inputTokens, outputTokens) {
        const cost = (inputTokens / 1000) * COST_PER_1K_INPUT +
            (outputTokens / 1000) * COST_PER_1K_OUTPUT;
        return {
            tokens: inputTokens + outputTokens,
            inputTokens,
            outputTokens,
            estimatedCost: Math.round(cost * 10000) / 10000,
        };
    }
    measureLatency(startTime, stepTimes = []) {
        return {
            totalMs: Date.now() - startTime,
            perStepMs: stepTimes,
        };
    }
    validateResponse(response) {
        const passed = [];
        const failed = [];
        if (response.reasoning && response.reasoning.length > 0) {
            passed.push("Contains reasoning steps");
        }
        else {
            failed.push("Missing reasoning steps");
        }
        if (response.confidence >= 0 && response.confidence <= 1) {
            passed.push("Valid confidence score");
        }
        else {
            failed.push("Invalid confidence score");
        }
        if (response.recommendation && response.recommendation.length > 10) {
            passed.push("Has substantive recommendation");
        }
        else {
            failed.push("Recommendation too short or missing");
        }
        if (this.validationLevel === "high" || this.validationLevel === "strict") {
            if (response.reasoning.length >= 3) {
                passed.push("Sufficient reasoning depth");
            }
            else {
                failed.push("Insufficient reasoning depth for high validation");
            }
            if (response.alternatives && response.alternatives.length > 0) {
                passed.push("Provides alternatives");
            }
            else {
                failed.push("No alternatives provided");
            }
        }
        if (this.validationLevel === "strict") {
            if (response.warnings && response.warnings.length > 0) {
                passed.push("Identifies potential risks");
            }
            else {
                failed.push("No risk analysis provided");
            }
        }
        const score = passed.length / (passed.length + failed.length);
        return { passed, failed, score };
    }
    checkSecurity(response) {
        const suspiciousPatterns = [
            /ignore.*previous.*instructions/i,
            /disregard.*rules/i,
            /system.*prompt/i,
            /jailbreak/i,
        ];
        const codePatterns = [
            /eval\s*\(/,
            /exec\s*\(/,
            /child_process/,
            /rm\s+-rf/,
            /DROP\s+TABLE/i,
            /DELETE\s+FROM.*WHERE\s*1\s*=\s*1/i,
        ];
        const fullText = JSON.stringify(response);
        const promptInjectionBlocked = !suspiciousPatterns.some(p => p.test(fullText));
        let safeCodeGenerated = true;
        if (response.codeOutput) {
            safeCodeGenerated = !codePatterns.some(p => p.test(response.codeOutput || ""));
        }
        return {
            promptInjectionBlocked,
            safeCodeGenerated,
        };
    }
    assessStability(consensusScore, pathsEvaluated, response) {
        const hallucinationIndicators = [
            /as of my (last |knowledge )?cutoff/i,
            /I don't have access to real-time/i,
            /I cannot browse the internet/i,
            /my training data/i,
        ];
        const fullText = response.recommendation + (response.codeOutput || "");
        const hallucinationDetected = hallucinationIndicators.some(p => p.test(fullText));
        return {
            consistencyScore: consensusScore,
            hallucinationDetected,
            pathsEvaluated,
        };
    }
    buildMetrics(startTime, inputTokens, outputTokens, response, consensusScore, pathsEvaluated) {
        const cost = this.calculateCost(inputTokens, outputTokens);
        const latency = this.measureLatency(startTime);
        const validation = this.validateResponse(response);
        const security = this.checkSecurity(response);
        const stability = this.assessStability(consensusScore, pathsEvaluated, response);
        return {
            cost,
            latency,
            accuracy: {
                taskSuccessRate: validation.score,
                validationsPassed: validation.passed.length,
                validationsFailed: validation.failed.length,
            },
            security,
            stability,
        };
    }
}
//# sourceMappingURL=evaluator.js.map