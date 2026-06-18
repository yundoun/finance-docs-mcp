# Category System

Categories are the primary organizational axis for documents. Each document has exactly one category. The category determines how the document appears in search results and which filters apply to it.

## Category Hierarchy

### Backend Analysis Categories

These categories are used for documenting backend services, APIs, and their behaviors.

| Category | Purpose | Typical Content |
|----------|---------|-----------------|
| `endpoint` | Single API endpoint | Method, path, request/response schema, validation rules, internal flow |
| `flow` | Business flow sequences | Multi-step API call chains, state transitions, error handling paths |
| `traps` | Pitfalls and edge cases | Numbered items (T01, T02...) with scenario, impact, and mitigation |
| `dependencies` | Cross-service dependency map | Which services call which, shared databases, event dependencies |
| `nested-objects` | Complex response structures | Deep object hierarchies, conditional fields, polymorphic responses |
| `data-mapping` | Schema-to-schema mapping | API field to DB column mapping, transformation rules |

### Frontend Analysis Categories

These categories document frontend client code and its relationship to backend APIs.

| Category | Purpose | Typical Content |
|----------|---------|-----------------|
| `page-map` | Page inventory | Route-to-component mapping, page hierarchy, navigation structure |
| `platforms` | Platform-level overview | Tech stack, folder structure, build system, deployment |
| `client-analysis` | Client API usage | How frontend code calls APIs, state management patterns, error handling |

### Cross-Cutting Categories

These categories span both frontend and backend concerns.

| Category | Purpose | Typical Content |
|----------|---------|-----------------|
| `domain-hub` | Domain index page | Links to all analysis docs for a domain, endpoint summary table |
| `features` | Feature documentation | Requirements, implementation notes, release info |
| `policies` | Business rules | Calculation logic, validation rules, business constraints |
| `onboarding` | Setup and guides | Getting started, environment setup, contribution guides |
| `glossary` | Terminology | Domain-specific terms with definitions |
| `overview` | Architecture overview | System diagrams, service topology, tech decisions |
| `deep-dive` | Focused technical analysis | In-depth exploration of a specific topic |

## Standard Document Sets

When analyzing a domain, aim to produce a consistent set of documents:

### Backend Domain Analysis Set

```
domain-name/
  index.mdx          # category: domain-hub
  flow-analysis.mdx   # category: flow
  traps.mdx           # category: traps
  dependencies.mdx    # category: dependencies
  nested-objects.mdx   # category: nested-objects
```

### Frontend Platform Analysis Set

```
platform-name/
  index.mdx           # category: platforms
  page-map.mdx        # category: page-map
  domain-name/
    index.mdx          # category: domain-hub (FE perspective)
    page-a.mdx         # category: client-analysis
    page-b.mdx         # category: client-analysis
    flow.mdx           # category: flow (FE flow)
    traps.mdx          # category: traps (FE traps)
```

### Feature Documentation

```
features/
  2026/
    h1/
      index.mdx              # category: features (half index)
      feature-name.mdx       # category: features
```

## Choosing the Right Category

**Decision tree:**

1. Is it about a single API endpoint? -> `endpoint`
2. Does it describe a multi-step flow? -> `flow`
3. Does it list pitfalls or edge cases? -> `traps`
4. Does it map dependencies between services? -> `dependencies`
5. Does it document a frontend page? -> `client-analysis` or `page-map`
6. Is it a domain index linking to other docs? -> `domain-hub`
7. Is it a business rule or calculation? -> `policies`
8. Is it a feature spec or release note? -> `features`
9. Is it a setup guide? -> `onboarding`
10. None of the above? -> `overview` or `deep-dive`

## Naming Conventions

- Use kebab-case for file names: `flow-analysis.mdx`, not `flowAnalysis.mdx`
- Hub pages are always `index.mdx` in their directory
- Traps use the `T01`, `T02` numbering pattern in headings
- Flow documents use numbered steps with ASCII diagrams
