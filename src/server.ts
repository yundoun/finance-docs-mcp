#!/usr/bin/env node
/**
 * finance-docs-mcp — MCP server for searching financial education documentation.
 * Supports two transports:
 *   - stdio  (default, for local Claude Code)
 *   - HTTP   (--http flag or PORT env, for remote access)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { initConfig, getConfig } from "./config.js";
import { Searcher } from "./retriever/searcher.js";
import { setKnownCategories } from "./retriever/router.js";
import { registerTools } from "./tools/register.js";
import { handleChat, type ChatRequest } from "./chat/handler.js";

async function main() {
  // Load config before anything else
  const config = await initConfig(path.resolve(import.meta.dirname, ".."));

  const searcher = new Searcher();

  // Inject known categories from the index into the router for auto-detection
  setKnownCategories(Object.keys(searcher.listCategories()));

  const useHttp =
    process.argv.includes("--http") || !!process.env.PORT;

  if (useHttp) {
    // ── HTTP transport (remote) ──
    const port = Number(process.env.PORT) || 3000;

    // Session management for Streamable HTTP spec
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    function createSession(): { server: McpServer; transport: StreamableHTTPServerTransport } {
      const server = new McpServer({
        name: config.name,
        version: "0.1.0",
      });
      registerTools(server, searcher);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
      };

      return { server, transport };
    }

    const httpServer = http.createServer(async (req, res) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          name: config.name,
          docs: searcher.docCount,
          chunks: searcher.chunkCount,
          sessions: sessions.size,
        }));
        return;
      }

      // REST search endpoint (for web UI)
      if (req.url?.startsWith("/api/search")) {
        const url = new URL(req.url, `http://localhost:${port}`);
        const query = url.searchParams.get("q") ?? "";
        const category = url.searchParams.get("category") ?? undefined;
        const platform = url.searchParams.get("platform") ?? undefined;
        const locale = url.searchParams.get("locale") ?? undefined;
        const limit = Number(url.searchParams.get("limit")) || config.search.defaultLimit;

        if (!query) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "q parameter required" }));
          return;
        }

        const results = searcher.search(query, { category, platform, locale, limit });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(results));
        return;
      }

      // Chat endpoint (RAG)
      if (req.url === "/chat" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body) as ChatRequest;
            await handleChat(parsed, searcher, res);
          } catch {
            if (!res.headersSent) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid request body" }));
            }
          }
        });
        return;
      }

      // MCP endpoint
      if (req.url === "/mcp") {
        try {
          const sessionId = req.headers["mcp-session-id"] as string | undefined;

          if (sessionId && sessions.has(sessionId)) {
            // Existing session -> route to its transport
            const session = sessions.get(sessionId)!;
            await session.transport.handleRequest(req, res);
          } else if (req.method === "POST") {
            // New session (initialize request)
            const { server, transport } = createSession();
            await server.connect(transport);
            await transport.handleRequest(req, res);
            if (transport.sessionId) {
              sessions.set(transport.sessionId, { server, transport });
            }
          } else {
            // No session for GET/DELETE -> 400
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32000, message: "Bad Request: No valid session. Send an initialize request first." },
              id: null,
            }));
          }
        } catch (err) {
          console.error("MCP transport error:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }));
          }
        }
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(port, () => {
      console.error(
        `${config.name} HTTP started on :${port} — ${searcher.docCount} docs, ${searcher.chunkCount} chunks`
      );
    });
  } else {
    // ── stdio transport (local) ──
    const server = new McpServer({
      name: config.name,
      version: "0.1.0",
    });
    registerTools(server, searcher);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(
      `${config.name} started — ${searcher.docCount} docs, ${searcher.chunkCount} chunks`
    );
  }
}

main();
