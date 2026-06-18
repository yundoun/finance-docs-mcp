# Domain Analysis Pipeline

Analyze a service domain to generate SSoT documentation. Combines static analysis
with optional live API verification. Works for both internal services and API gateways.

Arguments: $ARGUMENTS

## Usage

```
/analyze-api <service-path> <domain>               # Full analysis
/analyze-api <service-path> <domain> --verify       # Re-verify existing SSoT only
/analyze-api <service-path> <domain> --gw           # GW-specific analysis (adds call mapping)
/analyze-api <service-path> --list                  # Domain list + current status
/analyze-api <service-path> --audit                 # Re-verify all domains
```

## Prerequisites

- `/scan-service <service-path>` completed -> INVENTORY.md exists
- For GW analysis (--gw): Internal service analysis should be done first

## Execution

### --list mode

Read INVENTORY.md and display domain-level analysis status.

### Full Analysis

**Phase 1: Controller Analysis**

1. Read INVENTORY.md to identify controllers/endpoints for this domain
2. Read controller code:
   - All endpoint paths, HTTP methods
   - Request parameters (query, path, body)
   - For GW: identify which internal service each endpoint calls

**Phase 2: Service Logic Analysis**

3. Read service classes:
   - if/else branch exhaustive survey -- this is the core
   - throw statement collection -> error code + cause mapping
   - Read all code comments (business intent is often only in comments)
   - DB access patterns (Repository/Mapper calls)
   - Transaction boundaries (@Transactional)
   - Cross-service dependencies

4. VO/DTO analysis:
   - Request/response field exhaustive list
   - Serialization name changes (@JsonNaming, @JsonProperty, etc.)
   - Inheritance chains (fields hidden in parent classes)
   - Generic type resolution

**Phase 3: Business Rules Extraction**

5. Extract from service logic:
   - State transition rules (status machines)
   - Calculation logic (pricing, discounts, settlements)
   - Validation rules (required fields, ranges, permissions)
   - Only document what is evidenced in code (no guessing)

**Phase 4: GW-Specific Analysis** (when --gw flag is present)

6. GW call chain tracking:
   - Map each GW endpoint to internal service endpoints
   - Identify fan-out patterns (one GW EP calling multiple internal services)
   - Identify conditional calls
   - Document request/response field transformations

7. Cross-validate with internal SSoT:
   - GW calls EP not in internal SSoT -> WARNING: unanalyzed internal API
   - Internal SSoT has EP not called by this GW -> different GW or dead API

**Phase 5: SSoT Document Generation**

8. Generate artifacts in the analysis directory:

| File | Required | Description |
|------|:--------:|-------------|
| api-spec.json | Y | Endpoint specification (see templates/api-spec.schema.json) |
| business-rules.md | Y | Business rules collection |
| traps.md | Y | Non-obvious behaviors (see templates/traps.template.md) |
| flow.md | Y | Business flow diagrams |
| dependencies.json | Y | Inter-domain dependencies |
| nested-objects.md | N | Complex nested object documentation |
| internal-call-map.md | GW | GW -> Internal call mapping (GW only) |
| field-mapping.md | GW | Request/response field transform table (GW only) |
| caller-map.md | INT | Which GW endpoints call this internal domain (Internal only) |

**Phase 6: Live Verification** (when --verify flag is present)

9. Call the live API endpoints:
   - Issue auth tokens as needed
   - Call all GET endpoints (and safe POST endpoints with test data)
   - Test parameter combinations
   - Save response JSON to verification/

10. Auto-diff verification:
    - Run `node analysis/scripts/verify-diff.mjs --analysis-dir=... <domain>`
    - Resolve all reported issues:
      - [UNDOC]: Add missing fields to api-spec.json
      - [PHANTOM]: Confirm conditional field or remove from docs
      - [MISMATCH]: Live response is truth -- fix api-spec.json

## Quality Grades

| Grade | Criteria |
|-------|----------|
| A | Static analysis + live verification complete. Ready for development. |
| B | Static analysis complete, live verification pending. May have surprises. |
| C | Partial static analysis. Reference only. |

## Core Principles

> **Live data beats code. Code beats documentation.**

> **For GW services: the gateway is a mirror. Internal services are the substance.**
> Fan-out (multi-service composition) endpoints are where GW analysis shines.

> **For Internal services: this is where the business truth lives.**
> Same business logic often branches differently for admin/partner/mobile roles.
