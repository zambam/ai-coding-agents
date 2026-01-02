export { MONITOR_CONFIG, CATEGORY_DESCRIPTIONS, CATEGORY_SEVERITY_DEFAULTS, SEVERITY_WEIGHTS, FAILURE_PATTERNS } from "./config";
export type { MonitorConfig } from "./config";

export { ReportProcessor, externalReportSchema } from "./report-processor";
export type { ExternalReport, ProcessorConfig, ProcessedReport } from "./report-processor";

export { FailureDetector } from "./failure-detector";
export type { DetectionInput, DetectionResult } from "./failure-detector";

export { GuidelinesGenerator } from "./guidelines-generator";
export type { GeneratorConfig, GeneratedRule, GenerationResult } from "./guidelines-generator";

export { AnalyticsService } from "./analytics";
export type { AnalyticsQuery, TrendData, AgentComparison, ExportData } from "./analytics";

export { MonitorLearningIntegration } from "./learning-integration";
export type { MonitorLearningSignal, CrossProjectInsight, MonitorLearningConfig } from "./learning-integration";
