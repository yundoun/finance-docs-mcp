# Generate MDX Documentation

Generate MDX documentation from SSoT analysis data. This is the final step in the
analysis pipeline -- combines all analysis artifacts into publishable docs.

Arguments: $ARGUMENTS

## Usage

```
/gen-docs <platform> <domain>              # Generate all pages for a domain
/gen-docs <platform> <domain> <page>       # Generate a specific page only
/gen-docs <platform> <domain> --dry-run    # Preview document list without writing
/gen-docs <platform> <domain> --hub-only   # Generate hub (index) document only
```

## Prerequisites (Required SSoT)

| Artifact | Source | Purpose |
|----------|--------|---------|
| INVENTORY.md | /scan-service | Controller and EP catalog |
| business-rules.md | /analyze-api | Business rules |
| traps.md | /analyze-api | Trap catalog |
| api-spec.json | /analyze-api | Endpoint specification |
| *-usage.md | /cross-validate-fe | FE coverage, dead code |
| page-map-*.md | page mapping | Page -> EP mapping (required for leaf docs) |

Without page-map, only hub (index) documents can be generated.

## Execution

### Phase 1: Load SSoT Data

1. Read all SSoT files for the domain
2. Validate data consistency:
   - EP count in page-map vs INVENTORY.md
   - All fan-out EPs have call chain documentation
   - Warn on missing data

### Phase 2: Hub (Index) Document

Generate/update domain index.mdx with:
- Overview table (EP count, pattern ratios, internal dependencies, FE coverage)
- Sub-menu table (page-level EP counts)
- API Endpoint Mapping table
- Key fan-out flow diagrams (ASCII in code blocks)
- Frontend status section
- Caveats with relevant traps only

### Phase 3: Leaf (Page) Documents

Generate/update leaf MDX for each page in page-map with:
- Overview table (route, component, EP count, pattern)
- API Endpoint Mapping (all EPs used by this page)
- User flow (page entry -> CRUD sequence)
- Caveats (only traps affecting this page)

### Phase 4: MDX Validation

- Frontmatter required fields (title, description, order, category, platform)
- No bare curly braces in MDX -- path variables must use :key format
- Callout component syntax is correct
- Existing order/created values are preserved

### Phase 5: Reindex

Run `npm run reindex` and report document/chunk count changes.

## Document Guidelines

### Accuracy
> Do not write what is not in the SSoT.
> If page-map has 3 EPs, document 3 EPs. Do not infer additional ones.
> Never use "probably", "likely", "might be" language.

### MDX Safety
> No bare curly braces. Path variable: use :key format.
> In tables: wrap paths in backticks. Inside code blocks curly braces are safe.

### Size Guidelines
| Document type | EP count | Target lines |
|--------------|--------:|------------:|
| Hub (index) | 20+ | 120-180 |
| Leaf (fan-out) | 5+ | 60-100 |
| Leaf (proxy only) | 2-4 | 40-60 |

Pages with 2 or fewer EPs can be SKIPped -- the hub table covers them.
