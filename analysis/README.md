# Analysis Pipeline

Automated pipeline for generating SSoT (Single Source of Truth) API documentation from backend source code, frontend source code, and live API verification.

## Pipeline Overview

```
                            ┌─────────────────┐
                            │  Backend Source  │
                            │  (controllers,   │
                            │   services, VOs) │
                            └────────┬────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │  Step 1: /scan-service         │
                     │  Generate INVENTORY.md          │
                     │  + api-spec.json per domain     │
                     └───────────────┬───────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
    ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
    │ Step 2a: /analyze │ │ Step 2b (optional) │ │ FE Source          │
    │ (Internal svc)    │ │ /analyze (GW svc)  │ │ (Redux, pages,     │
    │ business-rules.md │ │ field-mapping.md   │ │  components)       │
    │ traps.md          │ │ internal-call-map  │ └─────────┬─────────┘
    │ flow.md           │ │ flow.md            │           │
    │ dependencies.json │ └─────────┬──────────┘           │
    └─────────┬─────────┘           │           ┌──────────▼──────────┐
              │                     │           │ Step 3: fe-scanner   │
              │                     │           │ Generate fe-map.json │
              │                     │           └──────────┬──────────┘
              │                     │                      │
              └──────────┬──────────┴──────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Step 4: mark-dead   │
              │ Classify unused EPs │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Step 5: coverage    │
              │ Generate report     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Step 6: verify-diff │
              │ Compare live vs doc │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Step 7: /gen-docs   │
              │ Generate MDX docs   │
              │ for docs site       │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Step 8: /reindex    │
              │ Rebuild search idx  │
              └─────────────────────┘
```

## Directory Structure

```
analysis/
├── scripts/
│   ├── fe-scanner.mjs        # FE source -> fe-map.json (field-level)
│   ├── mark-dead-apis.mjs    # Classify unused/special endpoints
│   ├── coverage-report.mjs   # FE + BE coverage statistics
│   └── verify-diff.mjs       # Live response vs documented fields
├── templates/
│   ├── api-spec.schema.json  # JSON Schema for api-spec.json
│   ├── fe-map.schema.json    # JSON Schema for fe-map.json
│   ├── INVENTORY.template.md # Template for service inventory
│   └── traps.template.md     # Template for traps documentation
└── README.md                 # This file
```

## Step-by-Step Guide

### Step 1: Scan backend service

```bash
# Use the Claude command
/scan-service my-backend-service

# Output: {analysis-dir}/{service}/INVENTORY.md + domain api-spec.json files
```

Reads all controllers, extracts endpoints, maps service methods, identifies external dependencies.

### Step 2: Analyze domains

```bash
# Analyze a specific domain
/analyze-api my-service user

# This generates:
#   - api-spec.json         (endpoint specification)
#   - business-rules.md     (business logic rules)
#   - traps.md              (non-obvious behaviors)
#   - flow.md               (business flow diagrams)
#   - dependencies.json     (inter-domain dependencies)
```

### Step 3: Scan frontend

```bash
node analysis/scripts/fe-scanner.mjs \
  --fe-root=/path/to/frontend/src \
  --analysis-dir=/path/to/analysis/output

# Output: fe-map.json in each domain directory
```

### Step 4: Mark dead APIs

```bash
node analysis/scripts/mark-dead-apis.mjs \
  --analysis-dir=/path/to/analysis/output \
  --fe-root=/path/to/frontend/src

# Classifies endpoints: _NO_FE_USAGE, _DELETE_OPERATION, _FILE_DOWNLOAD, etc.
```

### Step 5: Generate coverage report

```bash
node analysis/scripts/coverage-report.mjs \
  --analysis-dir=/path/to/analysis/output

# Add --md to also generate COVERAGE.md
```

### Step 6: Verify against live API

```bash
# First: save live API responses to {domain}/verification/*.json
# Then:
node analysis/scripts/verify-diff.mjs \
  --analysis-dir=/path/to/analysis/output \
  --all

# Reports: [UNDOC], [PHANTOM], [MISMATCH] discrepancies
```

### Step 7: Generate MDX docs

```bash
/gen-docs my-platform user
```

### Step 8: Reindex search

```bash
/reindex
```

## Customization

Each script has `[CUSTOMIZE]` comments marking project-specific sections:

| Script | Key customization points |
|--------|------------------------|
| `fe-scanner.mjs` | API constant file path, thunk regex pattern, HTTP client pattern, search directories, state shape patterns |
| `mark-dead-apis.mjs` | Thunk/function field names, search directories, URL pattern classifications |
| `coverage-report.mjs` | FE map file name, service directory structure |
| `verify-diff.mjs` | Response envelope structure, success codes, wrapper field names |

## Quality Grades

| Grade | Criteria |
|-------|----------|
| **A** | Static analysis + live verification complete. Ready for development. |
| **B** | Static analysis complete, live verification pending. May have surprises. |
| **C** | Partial analysis. Reference only. |

## Core Principle

> **Live data beats code. Code beats documentation.**
>
> - If live API response JSON exists, that is the truth
> - Code analysis is an inference, not a fact
> - SSoT docs are grade A only when verified against live responses
