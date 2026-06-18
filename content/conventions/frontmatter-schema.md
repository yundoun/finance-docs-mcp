# Frontmatter Schema

Every MDX document in this system **must** include YAML frontmatter. The indexer parses frontmatter to build the search index, so correct metadata directly affects search quality.

## Required Fields

### `title` (string)

The document title. Displayed in search results and used for BM25 scoring.

```yaml
title: "User Registration API"
```

Keep titles concise but descriptive. Include the entity name and document type when relevant.

### `description` (string)

A one-line summary of the document. Used for search result snippets and BM25 scoring.

```yaml
description: "POST /api/users/register endpoint analysis with validation rules"
```

### `category` (string)

The document's structural category. This is the primary filter for search and determines how the document is indexed and grouped.

**Standard categories:**

| Category | When to use |
|----------|-------------|
| `domain-hub` | Index page for a domain. Links to all analysis docs. One per domain. |
| `endpoint` | Single API endpoint documentation (method, path, request/response, flow). |
| `flow` | Business flow analysis showing multi-step sequences across services. |
| `data-mapping` | Field-level mapping between API schemas and database tables. |
| `client-analysis` | Frontend client code analysis (how the client calls the API). |
| `deep-dive` | In-depth analysis of a specific technical topic within a domain. |
| `dependencies` | Cross-service dependency map for a domain. |
| `traps` | Pitfalls, gotchas, and edge cases. Numbered T01, T02, etc. |
| `page-map` | Frontend page inventory with route-to-component mapping. |
| `platforms` | Platform-level overview (tech stack, architecture, folder structure). |
| `features` | Feature specification or release note. |
| `policies` | Business rules and policy documentation. |
| `onboarding` | Getting started guides and setup instructions. |
| `glossary` | Term definitions and domain vocabulary. |
| `overview` | High-level system or architecture overview. |
| `nested-objects` | Documentation of complex nested response structures. |

## Optional Fields

### `platform` (string[])

Which platforms this document applies to. Use when your project has multiple frontends or services.

```yaml
platform: [web, mobile]
```

Common values: `web`, `mobile`, `admin`, `api`, `common` (applies to all).

### `tags` (string[])

Free-form tags for search. Tags improve recall for synonym-based queries.

```yaml
tags: [auth, jwt, login, security]
```

Guidelines:
- Use lowercase
- Prefer single words or short hyphenated phrases
- Include abbreviations users might search for (e.g., both `auth` and `authentication`)

### `domain` (string)

The business domain this document belongs to. Used for domain-scoped filtering.

```yaml
domain: user-management
```

### `related` (string[])

Paths to related documents (relative to the docs root). The `find_related` MCP tool uses this field.

```yaml
related: [example/sample-api, example/flow-analysis]
```

### `updated` (string)

ISO date of the last meaningful update. Helps users assess freshness.

```yaml
updated: "2026-06-17"
```

### `order` (number)

Sort order within a directory listing. Lower numbers appear first. Optional; documents without `order` are sorted alphabetically.

```yaml
order: 0
```

### `summary` (string)

A multi-line summary for hub pages. Displayed in parent directory listings.

```yaml
summary: |
  React 18 + Redux Toolkit. JWT authentication with refresh token rotation.
  7 endpoints across auth-svc and user-svc.
```

## Full Example

```yaml
---
title: "User Registration API"
description: "POST /api/users/register endpoint with validation and duplicate handling"
category: endpoint
domain: user-management
platform: [web, mobile]
tags: [api, registration, users, validation]
related: [user-management/index, user-management/flow-analysis]
updated: "2026-06-17"
---
```

## Common Mistakes

1. **Missing `category`** -- The indexer will still index the document, but it will not appear in category-filtered searches.
2. **Tags as a comma-separated string** -- Tags must be a YAML array (`[a, b, c]`), not a plain string.
3. **Relative paths in `related`** -- Use paths relative to the docs root (`domain/sub/file`), not filesystem-relative paths (`./file` or `../other/file`).
4. **Stale `updated` dates** -- Update this field when making meaningful content changes, not just formatting fixes.
