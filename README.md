# docs-mcp

MCP server + RAG chatbot that makes your MDX documentation searchable by AI assistants. Built on BM25 + metadata filtering.

## What This Does

You write MDX documentation with structured frontmatter. This system indexes those documents and exposes them as MCP tools that Claude Code (or any MCP client) can use to search, retrieve, and reason about your docs.

```
MDX Documents  -->  Indexer  -->  Search Index  -->  MCP Server  -->  AI Assistant
                                  (BM25)             (tools)
```

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> my-docs-mcp
cd my-docs-mcp
npm install

# 2. Configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, DOCS_ROOT

# 3. Build the search index
npm run reindex

# 4. Start the MCP server
npm run start
```

## Architecture

```
docs-mcp/
|
+-- content/
|   +-- docs/              # Your MDX documentation
|   |   +-- domain-a/      # Organized by domain
|   |   +-- domain-b/
|   +-- conventions/        # How-to-write-docs guides
|
+-- src/
|   +-- indexer/            # MDX parser + BM25 index builder
|   +-- retriever/          # Search engine (BM25 + metadata filters)
|   +-- tools/              # MCP tool definitions
|   +-- chat/               # RAG chatbot (OpenAI)
|
+-- analysis/
|   +-- scripts/            # Analysis pipeline scripts
|   +-- templates/          # MDX templates for generated docs
|
+-- data/
|   +-- search-index.json   # Built index (gitignored)
|
+-- dist/                   # Compiled output (gitignored)
```

### Data Flow

```
  MDX files (content/docs/)
       |
       v
  [Indexer] -- parses frontmatter + content
       |
       v
  search-index.json (BM25 terms + metadata)
       |
       v
  [Retriever] -- query -> ranked results
       |
       v
  [MCP Tools] -- exposed to AI assistants
       |
       v
  [Chat] -- RAG: retriever results + OpenAI completion
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_docs` | BM25 keyword search with optional category, domain, platform, and tag filters |
| `get_document` | Retrieve a single document by its path |
| `list_categories` | List all categories with document counts |
| `find_related` | Find documents related to a given document (uses `related` frontmatter) |

### Example Queries

```
search_docs("user registration flow")
search_docs("traps", { category: "traps", domain: "user-management" })
get_document("example/sample-api")
list_categories()
find_related("example/index")
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCS_ROOT` | No | `./content/docs` | Path to MDX documents |
| `OPENAI_API_KEY` | For chat | -- | OpenAI API key for RAG chatbot |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Log verbosity: debug, info, warn, error |

### .mcp.json (Client Configuration)

Add to your project's `.mcp.json` to connect Claude Code:

```json
{
  "mcpServers": {
    "project-docs": {
      "command": "node",
      "args": ["/path/to/docs-mcp/dist/server.js"],
      "env": {
        "DOCS_ROOT": "/path/to/docs-mcp/content/docs"
      }
    }
  }
}
```

## Writing Documentation

Documents are MDX files with YAML frontmatter. Three fields are required:

```yaml
---
title: "Document Title"
description: "One-line summary for search results"
category: endpoint
---
```

See `content/conventions/` for full documentation:

- [Frontmatter Schema](content/conventions/frontmatter-schema.md) -- All available fields
- [Category System](content/conventions/category-system.md) -- When to use each category
- [FE/BE Separation](content/conventions/fe-be-separation.md) -- Directory organization

## Analysis Pipeline

The `analysis/` directory contains scripts and templates for automated documentation generation. The pipeline:

1. **Extract** -- Parse source code (backend routes, frontend components) to identify endpoints and pages
2. **Analyze** -- Generate analysis documents (flows, traps, dependencies) using structured templates
3. **Generate** -- Output MDX files with correct frontmatter into `content/docs/`
4. **Index** -- Rebuild the search index with `npm run reindex`

Templates in `analysis/templates/` define the structure for each document category.

## Deployment (Fly.io)

```bash
# First time
fly launch --name my-docs-mcp

# Deploy
fly deploy

# Set secrets
fly secrets set OPENAI_API_KEY=sk-...
```

The server runs as a long-lived process. The search index is built at startup from the bundled MDX files.

## Development

```bash
# Build
npm run build

# Run in development mode (auto-rebuild)
npm run dev

# Rebuild search index
npm run reindex

# Type check
npm run typecheck
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Search**: BM25 (no vector DB)
- **Protocol**: MCP (Model Context Protocol)
- **Chat**: OpenAI GPT-4 (RAG only, optional)
- **Deployment**: Fly.io (or any Node.js host)
