# Frontend Cross-Validation

Cross-validate frontend client code against API spec to identify usage patterns,
dead APIs, missing coverage, and field-level consumption.

Arguments: $ARGUMENTS

## Usage

```
/cross-validate-fe <fe-root> <domain>              # Full cross-validation
/cross-validate-fe <fe-root> --list                 # Domain list + validation status
/cross-validate-fe <fe-root> <domain> --quick       # API call mapping only
```

## Prerequisites

1. `/analyze-api` completed for the target domain -> api-spec.json exists
2. Frontend source code accessible at the given path

## Execution (5 Steps)

### Step 1: API Surface Mapping

Exhaustively scan the frontend code for API call sites.

Scan targets (adapt to your framework):
- API constants file (e.g., src/constant/api.js, src/api/endpoints.ts)
- State management (Redux slices, Vuex actions, Zustand stores, etc.)
- Direct HTTP calls in pages/components (axios, fetch, etc.)

Key findings:
- FE calls an API not in SSoT -> WARNING: unanalyzed API
- SSoT has an API not called by FE -> Dead API candidate

### Step 2: Parameter Extraction

Track actual parameters passed at each API call site:
- State management action payloads
- Conditional parameters (added inside if statements)
- Hardcoded default values
- Compare against SSoT required parameters -> identify FE gaps

### Step 3: Call Sequence Extraction

Track API call order at the page/component level:
- Initial load sequences (useEffect, componentDidMount, onMounted)
- User action -> API call chains
- Success callback cascades (post-mutation refetches)

### Step 4: Field Usage Analysis

Track which response fields are actually consumed in the UI:
- State selectors -> component props mapping
- Table column definitions (which fields are displayed)
- Form fields (which fields are editable)
- Conditional rendering (fields used for show/hide logic)

### Step 5: Error Handling Patterns

Analyze how API errors are handled in the frontend:
- Global error interceptors
- Domain-specific error handlers
- Retry logic
- User-facing error messages

## SSoT Artifacts

| File | Description |
|------|-------------|
| {frontend}-usage.md | Screen-level API call mapping + sequences |
| {frontend}-binding.md | Field usage rates + transforms + priority |
| client-api-map.json | Cross-validation results |

## Automated FE Scanner

After manual cross-validation, run the automated scanner:

```bash
node analysis/scripts/fe-scanner.mjs --fe-root=<path> --analysis-dir=<path>
node analysis/scripts/mark-dead-apis.mjs --analysis-dir=<path> --fe-root=<path>
```

## Core Principles

> **The frontend is the final consumer of every API.**
> Server SSoT = "what the API provides". Cross-validation = "what is actually used".
> Unused response fields -> SKIP candidates for rebuilds.

> **Frontend framework patterns vary:**
> React + Redux Toolkit: table column defs reveal field usage.
> Vue + Vuex: computed properties map to API fields.
> Mobile (Kotlin/Swift): data classes define field usage.
