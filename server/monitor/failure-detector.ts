import type { FailureCategory, FailureSeverity } from "@shared/schema";
import { FAILURE_PATTERNS, CATEGORY_SEVERITY_DEFAULTS, SEVERITY_WEIGHTS } from "./config";

export interface DetectionInput {
  codeGenerated?: string;
  humanCorrection?: string;
  errorMessage?: string;
  codeAccepted?: boolean;
}

export interface DetectionResult {
  detected: boolean;
  category?: FailureCategory;
  severity?: FailureSeverity;
  matchedPattern?: string;
  confidence: number;
  reasons: string[];
}

export class FailureDetector {
  detectFailure(input: DetectionInput): DetectionResult {
    const reasons: string[] = [];
    let highestConfidence = 0;
    let detectedCategory: FailureCategory | undefined;
    let matchedPattern: string | undefined;

    if (input.codeAccepted === false && input.humanCorrection) {
      reasons.push("Code was rejected and human provided correction");
      highestConfidence = Math.max(highestConfidence, 0.8);
    }

    if (input.errorMessage) {
      const errorResult = this.analyzeErrorMessage(input.errorMessage);
      if (errorResult.category) {
        detectedCategory = errorResult.category;
        matchedPattern = errorResult.matchedPattern;
        highestConfidence = Math.max(highestConfidence, errorResult.confidence);
        reasons.push(`Error message indicates ${errorResult.category}`);
      }
    }

    if (input.codeGenerated) {
      const codeResult = this.analyzeCode(input.codeGenerated);
      if (codeResult.category && codeResult.confidence > highestConfidence) {
        detectedCategory = codeResult.category;
        matchedPattern = codeResult.matchedPattern;
        highestConfidence = codeResult.confidence;
        reasons.push(`Code pattern matches ${codeResult.category}`);
      }
    }

    if (input.humanCorrection && input.codeGenerated) {
      const diffResult = this.analyzeDiff(input.codeGenerated, input.humanCorrection);
      if (diffResult.category && diffResult.confidence > highestConfidence) {
        detectedCategory = diffResult.category;
        matchedPattern = diffResult.matchedPattern;
        highestConfidence = diffResult.confidence;
        reasons.push(`Human correction pattern indicates ${diffResult.category}`);
      }
    }

    const detected = highestConfidence >= 0.5 && !!detectedCategory;
    const severity = detectedCategory ? CATEGORY_SEVERITY_DEFAULTS[detectedCategory] : undefined;

    return {
      detected,
      category: detected ? detectedCategory : undefined,
      severity,
      matchedPattern: detected ? matchedPattern : undefined,
      confidence: highestConfidence,
      reasons,
    };
  }

  private analyzeErrorMessage(errorMessage: string): { category?: FailureCategory; matchedPattern?: string; confidence: number } {
    const lowerMessage = errorMessage.toLowerCase();

    for (const { category, keywords } of FAILURE_PATTERNS) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return {
            category,
            matchedPattern: `keyword:${keyword}`,
            confidence: 0.7,
          };
        }
      }
    }

    return { confidence: 0 };
  }

  private analyzeCode(code: string): { category?: FailureCategory; matchedPattern?: string; confidence: number } {
    for (const { category, patterns } of FAILURE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(code)) {
          return {
            category,
            matchedPattern: `regex:${pattern.source}`,
            confidence: 0.6,
          };
        }
      }
    }

    return { confidence: 0 };
  }

  private analyzeDiff(original: string, corrected: string): { category?: FailureCategory; matchedPattern?: string; confidence: number } {
    const originalLines = original.split("\n");
    const correctedLines = corrected.split("\n");

    const addedLines = correctedLines.filter(line => !originalLines.includes(line));
    const removedLines = originalLines.filter(line => !correctedLines.includes(line));

    const addedNullChecks = addedLines.filter(line => 
      /!==?\s*(null|undefined)/.test(line) || 
      /\?\.\s*\w/.test(line) ||
      /\?\?/.test(line)
    );

    if (addedNullChecks.length > 0) {
      return {
        category: "missing_edge_case",
        matchedPattern: "added_null_checks",
        confidence: 0.75,
      };
    }

    const addedTryCatch = addedLines.some(line => /\btry\s*\{/.test(line) || /\bcatch\s*\(/.test(line));
    if (addedTryCatch) {
      return {
        category: "missing_edge_case",
        matchedPattern: "added_error_handling",
        confidence: 0.7,
      };
    }

    const removedSecurityIssues = removedLines.some(line => 
      /eval\s*\(/.test(line) || 
      /innerHTML\s*=/.test(line)
    );
    if (removedSecurityIssues) {
      return {
        category: "security_gap",
        matchedPattern: "removed_security_issue",
        confidence: 0.85,
      };
    }

    if (removedLines.length > 0 && addedLines.length > 0) {
      const significantChange = removedLines.length + addedLines.length >= 3;
      if (significantChange) {
        return {
          category: "logic_error",
          matchedPattern: "significant_correction",
          confidence: 0.5,
        };
      }
    }

    return { confidence: 0 };
  }

  categorizeFromKeywords(text: string): FailureCategory | undefined {
    const lowerText = text.toLowerCase();

    for (const { category, keywords } of FAILURE_PATTERNS) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    return undefined;
  }

  calculateSeverityScore(reports: Array<{ failureCategory?: FailureCategory | null; failureSeverity?: FailureSeverity | null }>): number {
    if (reports.length === 0) return 0;

    let totalWeight = 0;
    let count = 0;

    for (const report of reports) {
      if (report.failureSeverity) {
        totalWeight += SEVERITY_WEIGHTS[report.failureSeverity];
        count++;
      }
    }

    return count > 0 ? totalWeight / count : 0;
  }
}
