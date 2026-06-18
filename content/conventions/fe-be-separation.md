# Frontend / Backend Separation Principle

This convention defines how to organize documentation when a project has both backend APIs and frontend clients. The key rule: **never mix backend API analysis with frontend client analysis in the same directory.**

## Why Separate?

In a typical project, the same business domain is touched by multiple codebases:

- A **backend gateway** that exposes API endpoints
- One or more **frontend clients** that consume those endpoints

These have fundamentally different concerns:

| Concern | Backend | Frontend |
|---------|---------|----------|
| Primary unit | API endpoint | Page / component |
| Analysis focus | Request/response, validation, service calls | State management, UI binding, user flow |
| Traps | Race conditions, data integrity, auth edge cases | Rendering bugs, stale state, missing error handling |
| Dependencies | Inter-service calls, database schemas | API calls, shared components, state slices |

Mixing them in a single directory creates confusion: a developer looking for "how does the registration page work" does not want to wade through backend endpoint schemas, and vice versa.

## Directory Structure

### Backend Gateway Analysis

Backend analysis lives under a `{platform}-gw/` directory (or `api/` if there is only one gateway):

```
content/docs/
  api/                          # Single gateway
    user-management/
      index.mdx                 # domain-hub: endpoint summary
      flow-analysis.mdx         # flow: API call sequences
      traps.mdx                 # traps: backend pitfalls
      dependencies.mdx          # dependencies: service map
      nested-objects.mdx         # nested-objects: response schemas
```

For multiple gateways:

```
content/docs/
  admin-gw/                     # Admin gateway
    user-management/
      ...
  public-gw/                    # Public gateway
    user-management/
      ...
```

### Frontend Client Analysis

Frontend analysis lives under a `{platform}/` directory named after the client:

```
content/docs/
  web/                          # Web frontend
    user-management/
      index.mdx                 # domain-hub (FE perspective)
      page-map.mdx              # page-map: route inventory
      registration.mdx          # client-analysis: per-page doc
      login.mdx                 # client-analysis: per-page doc
      flow.mdx                  # flow: FE user flow
      traps.mdx                 # traps: FE-specific pitfalls
  mobile/                       # Mobile frontend
    user-management/
      ...
```

### What Goes Where

| Document type | Backend (`api/`) | Frontend (`web/`) |
|---------------|-----------------|-------------------|
| Endpoint schema (method, path, req/res) | Yes | No |
| Service-to-service flow | Yes | No |
| Database mapping | Yes | No |
| Page-to-component mapping | No | Yes |
| UI state management | No | Yes |
| API call patterns from client | No | Yes |
| Business flow (multi-step) | Either (different perspective) | Either |
| Traps | Yes (backend traps) | Yes (frontend traps) |

## Per-Domain Checklist

For each business domain, a complete documentation set looks like:

### Backend Side

- [ ] `index.mdx` -- Domain hub with endpoint table
- [ ] `flow-analysis.mdx` -- Service-level flow diagrams
- [ ] `traps.mdx` -- Backend traps (T01, T02, ...)
- [ ] `dependencies.mdx` -- Which services this domain calls
- [ ] `nested-objects.mdx` -- Complex response structures (if applicable)

### Frontend Side (per platform)

- [ ] `index.mdx` -- Domain hub (FE perspective) with page list
- [ ] `page-map.mdx` -- Route-to-component inventory
- [ ] Per-page documents -- One `.mdx` per significant page/view
- [ ] `flow.mdx` -- User-facing flow (click sequences, state transitions)
- [ ] `traps.mdx` -- Frontend traps (rendering, state, timing issues)

## Common Mistakes

### 1. Putting endpoint docs in the frontend directory

**Wrong**: `web/user-management/register-api.mdx` describing `POST /api/users/register` request/response schema.

**Right**: Put endpoint schemas in `api/user-management/`. The frontend doc should describe *how the registration page calls the API*, not the API itself.

### 2. Mixing FE and BE traps in one file

Backend traps (race conditions, token expiry) and frontend traps (stale Redux state, missing loading indicators) should be in separate files, in their respective directories.

### 3. Duplicating information across FE and BE docs

The backend doc owns the API contract (endpoint, fields, validation). The frontend doc should reference the backend doc rather than duplicating the schema:

```mdx
## API Call

Calls [POST /api/users/register](../../api/user-management/register).
Sends: `{ email, password, name }`. See the endpoint doc for full field validation.
```

### 4. One monolithic "analysis" file

Instead of one giant `analysis.mdx` covering everything, split into the standard document set (flow, traps, dependencies, nested-objects). Each file has a focused category, which makes search more precise.
