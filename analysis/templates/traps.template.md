# {domain} Traps

> Domain: {domain}
> Service: {service-name}
> Last updated: {YYYY-MM-DD}
> Total traps: {count}

Traps are non-obvious behaviors discovered through code analysis and live verification
that could cause bugs if not documented. Each trap is prefixed with a star marker.

## Trap Catalog

### T01: {Short title}

**Severity**: HIGH / MEDIUM / LOW
**Affected endpoints**: {EP IDs}
**Discovery**: static analysis / live verification

{Description of the non-obvious behavior. Be specific:
- What the code actually does (not what you'd expect)
- Under what conditions this trap triggers
- What the impact is for the consumer}

```
// Code evidence (optional)
```

---

### T02: {Short title}

**Severity**: HIGH / MEDIUM / LOW
**Affected endpoints**: {EP IDs}
**Discovery**: static analysis / live verification

{Description}

---

## Trap Classification Guide

| Severity | Criteria |
|----------|----------|
| HIGH | Will cause runtime errors or data corruption if not handled |
| MEDIUM | Will cause incorrect display or unexpected behavior |
| LOW | Minor inconsistency, cosmetic impact only |

## Adding New Traps

When adding a new trap:
1. Assign the next T{nn} number
2. Include the code evidence or verification JSON reference
3. List all affected endpoints
4. Update the total count in the header
