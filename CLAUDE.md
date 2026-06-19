# finance-docs-mcp

AI-searchable finance & investment knowledge base — MCP server + RAG chatbot for financial literacy education. BM25 + metadata filter based. Korean + English bilingual.

## Repo Scope

- **Included**: MCP server, search engine (indexer + retriever), RAG chatbot, analysis pipeline
- **Not included**: The MDX documents themselves (authored separately), source code of the project being documented

## Key Paths

| Target | Path |
|--------|------|
| MDX documents | `content/docs/` |
| Conventions | `content/conventions/` |
| Indexer | `src/indexer/` |
| Retriever | `src/retriever/` |
| MCP tools | `src/tools/` |
| RAG chatbot | `src/chat/` |
| Analysis scripts | `analysis/scripts/` |
| Analysis templates | `analysis/templates/` |
| Search index (build artifact) | `data/search-index.json` |

## Session Rules (Enforced)

1. **Before starting work**: Read `PROGRESS.md` to understand current state
2. **Before ending work**: Update `PROGRESS.md` with what was done
3. **Design reference**: `ARCHITECTURE.md` for system architecture and phase roadmap

## Tech Constraints

- TypeScript only (no Python)
- No vector DB -- BM25 + metadata filtering for search
- `data/search-index.json` is a build artifact (gitignored, not committed)
- External API dependency: OpenAI (chatbot feature only)
- Node.js 20+ required

## Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Development mode with auto-rebuild |
| `npm run reindex` | Rebuild search index from MDX files |
| `npm run start` | Start MCP server |
| `npm run typecheck` | Type checking only |

## Document Conventions

- All docs use MDX format with YAML frontmatter
- Required frontmatter: `title`, `description`, `category`
- See `content/conventions/` for the full schema and category system
- Frontend and backend analysis must be in separate directories (see `fe-be-separation.md`)
