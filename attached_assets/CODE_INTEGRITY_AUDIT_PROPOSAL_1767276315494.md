# Code Integrity Audit Tool - Technical Proposal

**Version:** 1.0.0  
**Created:** 2026-01-01  
**Author:** Agent  
**Status:** Proposed

## Executive Summary

This proposal addresses the discovery that significant portions of the codebase produce "reasonable looking but potentially inaccurate results" through placeholder implementations, magic numbers, and facade patterns. A systematic tool is needed to identify, track, and remediate these issues.

---

## Problem Statement

### Findings from DEM Fetcher Analysis

| Issue | Impact |
|-------|--------|
| Provider selection runs but result ignored | False resolution claims (says 5m, actually 30m) |
| State-specific APIs defined but never implemented | Dead code suggesting capability that doesn't exist |
| Magic numbers without citations | Unknown accuracy of thermal calculations |
| Fixed radii instead of adaptive logic | Terrain analysis may miss significant features |
| Duplicate elevation APIs | Wasted API quota, potential data inconsistency |

### Root Causes Identified

1. **Aspirational Architecture** - Code structure suggests future capabilities not yet implemented
2. **Rapid Prototyping** - Quick wins prioritized over accuracy validation
3. **Missing Citations** - Scientific coefficients lack source references
4. **No Integrity Tracking** - No systematic way to mark/find placeholder code

---

## Proposed Solution

### Tool: `scripts/audit-code-integrity.ts`

A TypeScript-based static analysis tool that:

1. **Scans all `.ts` files** in `server/` and `shared/` directories
2. **Detects patterns** indicating incomplete or facade implementations
3. **Generates reports** in JSON format for tracking
4. **Integrates with CI/CD** to block merges on critical issues

### Detection Patterns

#### 1. Magic Numbers
```typescript
// Pattern: Decimal/integer constants without adjacent comments
const RADIUS_M = 200;  // ❌ Flagged - no explanation
// @integrity-cited Source: ASHRAE 55-2020
const RADIUS_M = 200;  // ✅ Not flagged - has annotation
```

#### 2. Placeholder Markers
```typescript
// Pattern: TODO, FIXME, XXX, HACK, "not implemented", "placeholder"
// TODO: Implement actual provider selection  // ❌ Flagged
```

#### 3. Facade Patterns
```typescript
// Pattern: Selection logic followed by hardcoded call
const provider = selectProvider(lat, lon);  // Selects "qtopo"
const data = fetchOpenTopoData(lat, lon);   // ❌ Always uses srtm30m
```

#### 4. Duplicate APIs
```typescript
// Pattern: Same external API called from multiple files
// dem-fetcher.ts:    api.opentopodata.org
// microclimate.ts:   api.open-elevation.com  // ❌ Same purpose, different API
```

#### 5. Uncited Coefficients
```typescript
// Pattern: COEFFICIENT, MULTIPLIER, FACTOR definitions without comments
const UHI_COEFFICIENT = 0.045;  // ❌ Flagged - no source
```

### Integrity Annotations

Standard annotations for acknowledging known issues:

| Annotation | Usage |
|------------|-------|
| `@integrity-verified` | Value confirmed against authoritative source |
| `@integrity-cited` | Has citation in adjacent comment |
| `@integrity-placeholder` | Known stub, tracked in issue tracker |
| `@integrity-arbitrary` | Needs research, marked for future work |

---

## Technical Implementation

### File Structure

```
scripts/
└── audit-code-integrity.ts     # Main audit tool

docs/
├── tools/
│   └── CODE_INTEGRITY_AUDIT.md # Tool documentation
└── CODE_INTEGRITY_AUDIT_PROPOSAL.md  # This proposal

reports/
└── code-integrity-audit.json   # Generated report (gitignored)
```

### Algorithm

```
1. COLLECT all .ts files from server/ and shared/
2. FOR each file:
   a. READ file content
   b. SCAN line-by-line for patterns
   c. SKIP lines with @integrity-* annotations
   d. RECORD issues with file, line, category, severity
3. SCAN for cross-file issues (duplicate APIs)
4. GENERATE report JSON
5. PRINT summary to console
6. EXIT with code 1 if critical issues found
```

### Severity Levels

| Level | Meaning | CI/CD Impact |
|-------|---------|--------------|
| Critical | Active deception (facade patterns) | Blocks merge |
| High | Incomplete implementation | Warning |
| Medium | Missing documentation | Info |
| Low | Style/best practice | Info |

---

## Integration Points

### 1. QA Checklist Update

Add to `docs/QA_CHECKLIST.md`:

```markdown
### 9. Code Integrity Verification
- [ ] Run `npx tsx scripts/audit-code-integrity.ts`
- [ ] No critical issues found
- [ ] New magic numbers have @integrity-* annotations
```

### 2. Contributing Guide Update

Add to `docs/CONTRIBUTING.md`:

```markdown
## Code Integrity

All new code must pass the integrity audit:

\`\`\`bash
npx tsx scripts/audit-code-integrity.ts
\`\`\`

When adding constants or coefficients:
- Add @integrity-cited with source reference, OR
- Add @integrity-arbitrary to acknowledge uncertainty
```

### 3. Pre-commit Hook (Future)

```bash
#!/bin/bash
npx tsx scripts/audit-code-integrity.ts --quick
```

---

## Remediation Roadmap

### Phase 1: Immediate (This PR)
- [x] Create audit tool
- [x] Document tool usage
- [x] Run initial scan
- [ ] Fix critical facade issues (DEM fetcher)

### Phase 2: Short-term (1-2 weeks)
- [ ] Add @integrity annotations to all magic numbers
- [ ] Consolidate duplicate elevation APIs
- [ ] Document coefficient sources where known

### Phase 3: Medium-term (1 month)
- [ ] Research and cite unknown coefficients
- [ ] Implement or remove dead provider code
- [ ] Add to CI/CD pipeline

### Phase 4: Ongoing
- [ ] Run audit before each release
- [ ] Maintain zero critical issues
- [ ] Annual review of all @integrity-arbitrary items

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Critical issues | 0 |
| Percentage of coefficients with citations | >80% |
| Magic numbers with annotations | 100% |
| Facade patterns | 0 |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| False positives | Annotations allow marking verified code |
| Developer resistance | Integrate into existing workflow, not separate |
| Maintenance burden | Automate in CI/CD |
| Incomplete detection | Iterate on patterns based on findings |

---

## Appendix: Known Issues to Address

Based on DEM Fetcher analysis:

### Critical (Facade Patterns)

1. **dem-fetcher.ts:160** - selectProvider() result ignored
2. **dem-fetcher.ts:188** - Resolution claims don't match actual data

### High (Missing Implementation)

1. **dem-fetcher.ts:29-32** - State-specific providers never used
2. **dem-fetcher.ts:262** - Fixed 200m radius, no adaptive expansion

### Medium (Magic Numbers)

1. **uhi-calculator.ts:13-32** - UHI coefficients without citations
2. **microclimate-fetchers.ts:224-235** - Urban density thresholds arbitrary
3. **simulation-engine-service.ts** - Multiple thermal coefficients

---

## Approval

- [ ] Technical Review
- [ ] Architect Review
- [ ] Merge to Main
