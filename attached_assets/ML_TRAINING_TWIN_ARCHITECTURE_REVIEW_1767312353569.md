# ML Training Twin Architecture Review

**Document Version**: 1.0  
**Date**: January 2026  
**Status**: Research Analysis Complete

---

## Executive Summary

The Smart HVAC Advisor ML ecosystem is designed to achieve **continuously self-improving HVAC recommendations** through a hybrid ML + simulation architecture. The system uses XGBoost with SHAP explainability to provide transparent recommendations that meet ASHRAE Guideline 14 compliance standards (NMBE ±5%, CV(RMSE) ±15%).

The architecture employs a **dual-twin design** where two Training Twin implementations can run identical tasks for A/B comparison and validation:
- **Server Training Twin** (Port 7020): Production runtime for monitoring and optimization
- **Package Training Twin** (`packages/training-twin`): Configurable digital twin for ML self-observation and comparative validation

---

## System Architecture

### Three-Process Ecosystem

| Component | Port | Purpose |
|-----------|------|---------|
| **HVAC Advisor** | 5000 | Main application, UI, ML predictions, scenario orchestration |
| **Training Worker** | 7010 | Executes training jobs, manages job queue, compliance validation |
| **Training Twin** | 7020 | Monitors metrics, detects degradation, proposes & approves optimizations |

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ML SYSTEM (Port 5000)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ ML Routes    │  │ Scenario     │  │ Observation      │   │
│  │ /api/ml/*    │  │ Orchestrator │  │ Service          │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                TRAINING TWIN (Port 7020)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Sync         │◄─┤ Scheduler    │──►│ Degradation      │   │
│  │ Manager      │  │ Optimizer    │   │ Detector         │   │
│  └──────┬───────┘  └──────┬───────┘   └────────┬─────────┘   │
│         │                 │                    │             │
│         ▼                 ▼                    ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Mirror       │  │ Proposal     │  │ Rollback         │   │
│  │ Service      │  │ Engine       │  │ Manager          │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│                    ┌──────────────┐                          │
│                    │ AI Client    │                          │
│                    │ (Gemini)     │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Dual-Twin Design (User Clarification U1)

### Purpose
The system employs two Training Twin implementations that can run **identical tasks** for performance comparison:

| Twin | Location | Role |
|------|----------|------|
| **Server Twin** | `server/training-twin/` | Streamlined production runtime |
| **Package Twin** | `packages/training-twin/` | Full-featured digital twin for ML self-observation |

### Comparison Concept
- Package Twin acts as a **configurable digital twin**
- Can use different architecture, services, or configurations
- Runs the SAME tests/tasks as Server Twin
- Results are compared to validate optimization proposals
- Enables A/B testing of different ML strategies

### Current Gap
No shared task harness currently enforces identical task execution between twins. A comparison framework is needed to:
1. Execute same test sequences on both twins
2. Collect metrics from both executions
3. Perform statistical comparison
4. Validate proposals before production deployment

---

## Simulated Building Comparison System (User Clarification U3, U6)

### Location
The system is implemented in `server/services/scenario-orchestration.ts` (not a separate service).

### How It Works

The ScenarioOrchestrator runs three simulation profiles for comparison:

| Profile | Mode | Purpose |
|---------|------|---------|
| **A** | Real | Baseline using actual location data |
| **B** | Simulated | Test scenario with overridden parameters |
| **C** | Control | Different location for cross-validation |

### Data Download & Creation
Training data is **generated on demand** by the comparison framework:
- Environmental analysis results from satellite/street view imagery
- DEM (Digital Elevation Model) data from `demFetcherService`
- AI analysis of building characteristics
- Cached images via `simulated-image-router.ts`

### KPI Thresholds (from `shared/scenario-constants.ts`)

```typescript
SCENARIO_KPI_THRESHOLDS = {
  BUILDING_DELTA_MAX: 0.05,      // 5% max building variance
  UHI_DELTA_MAX: 0.3,            // 30% max Urban Heat Island delta
  CANOPY_DELTA_MAX: 0.10,        // 10% max canopy coverage delta
  INFLUENCE_CORRELATION_MIN: 0.85, // 85% minimum correlation
  PROVENANCE_COMPLIANCE_TARGET: 1.0,
  CACHE_ISOLATION_TARGET: 0,
}
```

### Comparison Workflow
1. Acquire lock to prevent concurrent runs
2. Execute Scenario A (real baseline)
3. Execute Scenario B (simulated with overrides)
4. Execute Scenario C (control location)
5. Compute deltas between profiles
6. Validate against KPI thresholds
7. Notify Training Twin via `trainingTwinAdapter.onScenarioComplete()`

---

## Approval Authority & Grok Sanity Check (User Clarification U4)

### Approval Workflow
- Low-risk proposals: Auto-approved based on confidence thresholds
- High-risk proposals: Require manual approval
- All proposals: Subject to Grok second opinion (sanity check)

### Grok Integration
Referenced in AI integration layer (`server/training-twin/ai-integration-layer.ts`):
- Acts as independent sanity check on proposals
- Provides second opinion before execution
- Uses XAI_API_KEY for Grok model access

### Current Gap
Concrete integration hooks for Grok approval workflow need to be wired. The authority chain (auto vs manual) is documented but not fully implemented.

---

## Baseline Storage (User Clarification U5)

### Current Implementation
Baseline metrics are stored **in-memory** within `DegradationService`:

```typescript
// server/training-twin/degradation-service.ts
class DegradationService {
  private baseline: TrainingMetrics | null = null;
  private samples: SampleRecord[] = [];
  
  async setBaseline(metrics: TrainingMetrics) {
    this.baseline = { ...metrics };
    // In-memory only - lost on restart
  }
}
```

### Gap Identified
- Baselines are lost when service restarts
- Undermines rollback guarantees
- Need persistent storage (PostgreSQL via training-job-store or dedicated table)

### Planned Solution
According to documentation, baseline storage should be:
1. Persisted to PostgreSQL
2. Keyed by building type and climate zone
3. Versioned for historical comparison
4. Integrated with rollback manager

---

## Server vs Sandbox Comparison (User Clarification U6)

### Key Point
A **major purpose** of the system is comparing server vs sandbox test results.

### Comparison Flow
```
┌─────────────────────┐    ┌─────────────────────┐
│  SERVER TWIN        │    │  PACKAGE TWIN       │
│  (Port 7020)        │    │  (Digital Twin)     │
│                     │    │                     │
│  Run Task X         │    │  Run Task X         │
│  Collect Metrics    │    │  Collect Metrics    │
└─────────┬───────────┘    └──────────┬──────────┘
          │                           │
          └───────────┬───────────────┘
                      ▼
             ┌────────────────────┐
             │  COMPARISON ENGINE │
             │  - Metrics diff    │
             │  - Statistical test│
             │  - Pass/Fail       │
             └────────────────────┘
```

### Validation Purpose
- Ensures optimization proposals work correctly before production
- Allows testing different architectures/configurations
- Provides safety net for auto-optimization

---

## ASHRAE Compliance Standards

### Guideline 14 Requirements
| Metric | Target | Frequency |
|--------|--------|-----------|
| **NMBE** (Normalized Mean Bias Error) | ±5% | Monthly |
| **CV(RMSE)** (Coefficient of Variation of RMSE) | ±15% | Monthly |

### Degradation Thresholds (from `degradation-service.ts`)
```typescript
THRESHOLDS = {
  NMBE_WARNING: 5,      // 5% triggers warning
  NMBE_CRITICAL: 10,    // 10% triggers critical
  CVRMSE_WARNING: 10,   // 10% triggers warning
  CVRMSE_CRITICAL: 20,  // 20% triggers critical
  RMSE_WARNING: 0.3,
  RMSE_CRITICAL: 0.5,
  TREND_WINDOW: 5,      // Sample window size
  DEGRADATION_STREAK: 3, // Consecutive failures for alert
}
```

### Severity Levels
| Level | Description | Action |
|-------|-------------|--------|
| **none** | Within normal range | Monitor |
| **low** | Slight drift detected | Log and watch |
| **medium** | Notable degradation | Generate proposal |
| **high** | Significant issue | Auto-trigger optimization |
| **critical** | Severe degradation | Consider rollback |

---

## Research Strategy (from ML_RESEARCH_SUMMARY.md)

### ML Choices
| Technology | Rationale |
|------------|-----------|
| **XGBoost** | Surrogate modeling with R² = 0.9994 in benchmarks |
| **SHAP** | Explainability for "Why this recommendation?" |
| **Hybrid ML+Simulation** | Physical fidelity + predictive speed |
| **UTCI** | Human-centric thermal comfort index |

### Phased Implementation (from TRAINING_TWIN_PHASED_VALIDATION_PROPOSAL.md)

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Biloela Pilot | 2 weeks |
| 2 | ASHRAE Compliance | 2 weeks |
| 3 | Self-Adjustment | 3 weeks |
| 4 | Multi-Site Expansion | 4 weeks |

---

## Current Implementation Status

### Implemented ✅
- Training Worker on Port 7010 (simulated training, job queue)
- Training Twin on Port 7020 (degradation detection, proposal engine)
- AI Integration Layer (Gemini, OpenRouter, Grok clients)
- Scenario Orchestration (3-profile comparison)
- Simulated Image Router (caching)
- Compliance Gate (hemisphere, timezone, metric validation)
- Training Job Store (job persistence)

### Partially Implemented ⚠️
- Sandbox Engine (code exists, not fully wired)
- Persona Logic (in packages/training-twin, not active)
- Baseline Storage (in-memory only)
- Twin-to-Worker Bridge (proposals don't trigger jobs)

### Not Yet Implemented ❌
- Dual-twin comparison harness
- Persistent baseline storage
- Real XGBoost/Python training
- SHAP explainability UI
- Full approval workflow automation

---

## Proposed First Training Tasks

### Task 1: HVAC Recommendation Surrogate Model
**Objective**: Train XGBoost model to predict energy consumption/comfort

**Prerequisites**:
- Curated feature matrix from scenario orchestration
- Baseline metrics per building type/climate zone
- Compliance-validated dataset

**Success Criteria**:
- NMBE within ±5%
- CV(RMSE) within ±15%
- SHAP outputs showing top feature contributors

### Task 2: Dual-Twin Comparison Validation
**Objective**: Validate that both twins produce consistent results

**Prerequisites**:
- Shared task harness implementation
- Identical test sequences defined
- Metrics comparison framework

**Success Criteria**:
- 100% job sync accuracy between twins
- Statistical equivalence of metrics (p < 0.05)
- Variance within acceptable thresholds

### Task 3: Baseline Persistence Migration
**Objective**: Move baseline storage from in-memory to PostgreSQL

**Prerequisites**:
- Baseline schema in `shared/schema.ts`
- Migration to training-job-store integration

**Success Criteria**:
- Baselines survive service restart
- Historical baselines queryable
- Rollback manager integration verified

---

## Remaining Uncertainties

| # | Item | Status |
|---|------|--------|
| U1 | Dual-twin comparison mechanism | Clarified - needs implementation |
| U2 | Simulated Building Comparison location | Found in `server/services/scenario-orchestration.ts` |
| U3 | Training data source | Clarified - generated on demand by comparison framework |
| U4 | Approval authority | Clarified - Grok sanity check, tiered approval |
| U5 | Baseline storage | Clarified - needs migration to PostgreSQL |
| U6 | Server vs sandbox comparison | Clarified - major purpose of the system |

---

## Implementation Roadmap

### Phase 0: Foundation (Current Focus)
1. Connect Twin-to-Worker bridge (proposal approval → job enqueue)
2. Implement job status polling and result evaluation
3. Migrate baseline storage to PostgreSQL

### Phase 1: Comparison Framework
1. Design shared task harness for dual-twin execution
2. Implement metrics comparison engine
3. Wire Grok sanity check into approval workflow

### Phase 2: Real Training
1. Integrate Python/XGBoost training pipeline
2. Implement SHAP explainability extraction
3. Build "Why this recommendation?" UI

### Phase 3: Automation
1. Enable auto-optimization cycles
2. Implement rollback with persistent baselines
3. Multi-site expansion per phased validation proposal

---

*Document generated from comprehensive architecture review incorporating user clarifications.*
