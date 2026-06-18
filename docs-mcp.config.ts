import type { DocsMcpConfig } from "./src/config.js";

/**
 * docs-mcp configuration file.
 *
 * Required fields:
 *   - name:     Display name for your MCP server
 *   - docsRoot: Path to the directory containing your MDX documentation files
 *
 * All other fields are optional and have sensible defaults.
 */
const config: DocsMcpConfig = {
  // ── Required ──

  /** Display name shown in MCP tool descriptions and server logs */
  name: "my-docs-mcp",

  /** Path to docs root (relative to this file, or absolute) */
  docsRoot: "./content/docs",

  // ── Optional ──

  /** Base URL of the deployed docs site (for generating links in chat responses) */
  // docsBaseUrl: "https://docs.example.com",

  /** Primary language: "en" or "ko" — affects the default system prompt */
  // language: "en",

  /** Chat / RAG configuration */
  // chat: {
  //   model: "gpt-4o-mini",            // OpenAI model for RAG chat
  //   systemPrompt: "Custom prompt...", // Overrides the default language-aware prompt
  //   maxContextDocs: 5,               // Max docs to include as LLM context
  // },

  /** Query routing hints — regex patterns that auto-detect filters from natural language */
  // routing: {
  //   domainHints: [
  //     { pattern: /auth|login/i, value: "auth" },
  //     { pattern: /billing|payment/i, value: "billing" },
  //   ],
  //   platformHints: [
  //     { pattern: /mobile|app/i, value: "mobile" },
  //     { pattern: /web|dashboard/i, value: "web" },
  //   ],
  // },

  /** BM25 search tuning */
  // search: {
  //   bm25k1: 1.2,         // Term frequency saturation (higher = less saturation)
  //   bm25b: 0.75,         // Document length normalization (0 = no normalization, 1 = full)
  //   defaultLimit: 10,    // Default number of results returned
  //   snippetLength: 200,  // Character length of result snippets
  // },
};

export default config;
