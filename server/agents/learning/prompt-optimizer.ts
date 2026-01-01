import type { AgentType, PromptStatus, PromptMetrics } from "@shared/schema";
import type { IDataTelemetry, PromptVariant, InsertPromptVariant, RunOutcome } from "../../storage";

export interface PromptSelectionResult {
  variant: PromptVariant;
  promptText: string;
  version: number;
}

export interface PromptOptimizationConfig {
  minSampleSize: number;
  pValueThreshold: number;
  improvementThreshold: number;
  maxConcurrentTests: number;
}

const DEFAULT_CONFIG: PromptOptimizationConfig = {
  minSampleSize: 30,
  pValueThreshold: 0.05,
  improvementThreshold: 0.05,
  maxConcurrentTests: 2,
};

export class PromptOptimizer {
  private storage: IDataTelemetry;
  private config: PromptOptimizationConfig;

  constructor(storage: IDataTelemetry, config: Partial<PromptOptimizationConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async selectPromptVariant(agentType: AgentType): Promise<PromptSelectionResult | null> {
    const promoted = await this.storage.getPromotedVariant(agentType);
    const abTestVariants = await this.storage.getVariantsByStatus(agentType, "ab_test");

    if (!promoted && abTestVariants.length === 0) {
      return null;
    }

    if (abTestVariants.length === 0 && promoted) {
      return {
        variant: promoted,
        promptText: promoted.promptText,
        version: promoted.version,
      };
    }

    const allVariants = promoted ? [promoted, ...abTestVariants] : abTestVariants;
    const totalTraffic = allVariants.reduce((sum, v) => sum + (v.trafficPercent ?? 0), 0);

    if (totalTraffic === 0) {
      const selected = allVariants[0];
      return {
        variant: selected,
        promptText: selected.promptText,
        version: selected.version,
      };
    }

    const rand = Math.random() * totalTraffic;
    let cumulative = 0;

    for (const variant of allVariants) {
      cumulative += variant.trafficPercent ?? 0;
      if (rand <= cumulative) {
        return {
          variant,
          promptText: variant.promptText,
          version: variant.version,
        };
      }
    }

    const fallback = allVariants[allVariants.length - 1];
    return {
      variant: fallback,
      promptText: fallback.promptText,
      version: fallback.version,
    };
  }

  async createShadowVariant(
    agentType: AgentType,
    promptText: string
  ): Promise<PromptVariant> {
    const version = await this.storage.getNextVersionNumber(agentType);
    return this.storage.createPromptVariant({
      agentType,
      version,
      promptText,
      status: "shadow",
      trafficPercent: 0,
    });
  }

  async promoteToABTest(
    variantId: string,
    trafficPercent: number = 10
  ): Promise<PromptVariant | undefined> {
    return this.storage.updatePromptVariant(variantId, {
      status: "ab_test",
      trafficPercent: Math.min(trafficPercent, 50),
    });
  }

  async computeVariantMetrics(
    variantId: string,
    outcomes: RunOutcome[]
  ): Promise<PromptMetrics> {
    const variantOutcomes = outcomes.filter(
      (o) => o.promptVersion === variantId
    );

    if (variantOutcomes.length === 0) {
      return {
        acceptanceRate: 0,
        avgEditDistance: 0,
        avgLatency: 0,
        sampleSize: 0,
      };
    }

    const accepted = variantOutcomes.filter((o) => o.outcomeStatus === "accepted").length;
    const acceptanceRate = accepted / variantOutcomes.length;

    const editDistances = variantOutcomes
      .filter((o) => o.editDistance !== null)
      .map((o) => o.editDistance!);
    const avgEditDistance =
      editDistances.length > 0
        ? editDistances.reduce((a, b) => a + b, 0) / editDistances.length
        : 0;

    const latencies = variantOutcomes
      .filter((o) => o.timeToDecision !== null)
      .map((o) => o.timeToDecision!);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    return {
      acceptanceRate,
      avgEditDistance,
      avgLatency,
      sampleSize: variantOutcomes.length,
    };
  }

  async evaluateABTest(agentType: AgentType): Promise<{
    winner: PromptVariant | null;
    loser: PromptVariant | null;
    significant: boolean;
    pValue: number | null;
  }> {
    const promoted = await this.storage.getPromotedVariant(agentType);
    const abVariants = await this.storage.getVariantsByStatus(agentType, "ab_test");

    if (!promoted || abVariants.length === 0) {
      return { winner: null, loser: null, significant: false, pValue: null };
    }

    const outcomes = await this.storage.getRunOutcomesByAgent(agentType, 1000);

    const controlMetrics = await this.computeVariantMetrics(promoted.id, outcomes);
    
    for (const challenger of abVariants) {
      const challengerMetrics = await this.computeVariantMetrics(challenger.id, outcomes);

      if (
        controlMetrics.sampleSize < this.config.minSampleSize ||
        challengerMetrics.sampleSize < this.config.minSampleSize
      ) {
        continue;
      }

      const pValue = this.computePValue(
        controlMetrics.acceptanceRate,
        controlMetrics.sampleSize,
        challengerMetrics.acceptanceRate,
        challengerMetrics.sampleSize
      );

      const isSignificant = pValue < this.config.pValueThreshold;
      const improvement =
        challengerMetrics.acceptanceRate - controlMetrics.acceptanceRate;

      if (isSignificant && improvement > this.config.improvementThreshold) {
        return {
          winner: challenger,
          loser: promoted,
          significant: true,
          pValue,
        };
      }

      if (isSignificant && improvement < -this.config.improvementThreshold) {
        return {
          winner: promoted,
          loser: challenger,
          significant: true,
          pValue,
        };
      }
    }

    return { winner: null, loser: null, significant: false, pValue: null };
  }

  async promoteWinner(winnerId: string, loserId: string): Promise<void> {
    await this.storage.updatePromptVariant(winnerId, {
      status: "promoted",
      trafficPercent: 100,
      promotedAt: new Date(),
    });

    await this.storage.updatePromptVariant(loserId, {
      status: "retired",
      trafficPercent: 0,
      retiredAt: new Date(),
    });
  }

  private computePValue(
    p1: number,
    n1: number,
    p2: number,
    n2: number
  ): number {
    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 1;

    const z = Math.abs(p1 - p2) / se;
    const pValue = 2 * (1 - this.normalCDF(z));

    return pValue;
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}
