import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Searcher } from "../retriever/searcher.js";
import { getConfig } from "../config.js";

export function registerTools(server: McpServer, searcher: Searcher) {
  const config = getConfig();

  // ── Dynamically build category list from index ──
  const allCategories = Object.keys(searcher.listCategories()).sort().join(", ");

  // ── search_docs ──
  server.tool(
    "search_docs",
    `Search ${config.name} docs with natural language. BM25 + metadata filter. Auto-extracts category/domain from query.`,
    {
      query: z.string().describe("Search query (natural language)"),
      category: z.string().optional().describe(`Category filter: ${allCategories}`),
      platform: z.string().optional().describe("Platform filter"),
      locale: z.string().optional().describe("Language filter: ko, en (omit for all languages)"),
      limit: z.number().optional().describe("Max results to return (default 10)"),
    },
    async ({ query, category, platform, locale, limit }) => {
      const results = searcher.search(query, { category, platform, locale, limit });

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No results found for "${query}".` }],
        };
      }

      const text = results
        .map((r, i) => {
          const meta = [r.category, ...r.platform].filter(Boolean).join(", ");
          return [
            `### ${i + 1}. ${r.title}`,
            `- **Path**: ${r.docPath}`,
            `- **Meta**: ${meta}${r.domain ? ` | domain: ${r.domain}` : ""}`,
            `- **Score**: ${r.score}`,
            `- **Preview**: ${r.snippet}`,
          ].join("\n");
        })
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );

  // ── get_document ──
  server.tool(
    "get_document",
    "Return the full MDX document content. Pass a path from search_docs results.",
    {
      path: z.string().describe("Document path (e.g. guides/getting-started.mdx)"),
    },
    async ({ path: docPath }) => {
      const doc = searcher.getDocument(docPath);
      if (!doc || !doc.fullContent) {
        return {
          content: [{ type: "text" as const, text: `Document not found: ${docPath}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: doc.fullContent }],
      };
    }
  );

  // ── list_categories ──
  server.tool(
    "list_categories",
    "Return document counts grouped by category.",
    {},
    async () => {
      const categories = searcher.listCategories();
      const lines = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => `- ${cat}: ${count}`);

      return {
        content: [{
          type: "text" as const,
          text: `## Documents by category (total: ${searcher.docCount})\n\n${lines.join("\n")}`,
        }],
      };
    }
  );

  // ── find_related ──
  server.tool(
    "find_related",
    "Find documents related to a given document. Based on the related field + tag overlap.",
    {
      path: z.string().describe("Reference document path"),
      limit: z.number().optional().describe("Max results to return (default 5)"),
    },
    async ({ path: docPath, limit }) => {
      const related = searcher.findRelated(docPath, limit);

      if (related.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No related documents found for "${docPath}".` }],
        };
      }

      const text = related
        .map((d, i) => `${i + 1}. **${d.title}** — ${d.path} [${d.category}]`)
        .join("\n");

      return {
        content: [{ type: "text" as const, text: `## Related to ${docPath}\n\n${text}` }],
      };
    }
  );
}
