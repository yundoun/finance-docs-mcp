/**
 * RAG chatbot handler
 * User message -> BM25 search -> LLM call -> streaming response
 */

import type { ServerResponse } from "node:http";
import OpenAI from "openai";
import { Searcher } from "../retriever/searcher.js";
import { getConfig } from "../config.js";

// ── Types ──

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

// ── Client (lazy init) ──

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ── Build context from search ──

function docPathToUrl(docPath: string): string {
  const config = getConfig();
  // policies/booking.mdx -> /docs/policies/booking
  // guides/index.mdx -> /docs/guides
  const stripped = docPath.replace(/\.mdx$/, "").replace(/\/index$/, "");
  return `${config.docsBaseUrl}/docs/${stripped}`;
}

function buildContext(searcher: Searcher, query: string): string {
  const config = getConfig();
  const results = searcher.search(query, { limit: config.chat.maxContextDocs });

  if (results.length === 0) return "No relevant documents found.";

  return results
    .map((r, i) => {
      const doc = searcher.getDocument(r.docPath);
      const content = doc?.fullContent ?? r.snippet;
      const url = docPathToUrl(r.docPath);
      return `--- Document ${i + 1}: ${r.title} ---\nurl: ${url}\npath: ${r.docPath}\n\n${content}`;
    })
    .join("\n\n");
}

// ── Stream handlers ──

async function streamGPT(
  messages: ChatMessage[],
  context: string,
  res: ServerResponse,
) {
  const config = getConfig();
  const openai = getOpenAI();

  const stream = await openai.chat.completions.create({
    model: config.chat.model,
    stream: true,
    messages: [
      { role: "system", content: `${config.chat.systemPrompt}\n\n## Reference Documents\n\n${context}` },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }
  res.write("data: [DONE]\n\n");
  res.end();
}

// ── Main handler ──

export async function handleChat(
  body: ChatRequest,
  searcher: Searcher,
  res: ServerResponse,
) {
  const { messages } = body;

  if (!messages?.length) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "messages required" }));
    return;
  }

  // Search using the last user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "no user message found" }));
    return;
  }

  const context = buildContext(searcher, lastUserMsg.content);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    await streamGPT(messages, context, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
}
