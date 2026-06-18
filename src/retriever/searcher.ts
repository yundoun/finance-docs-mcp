import fs from "node:fs";
import path from "node:path";
import { tokenize, type DocMeta, type Chunk } from "../indexer/chunker.js";
import { scoreBM25, type BM25Index } from "../indexer/bm25.js";
import { routeQuery, type RouteResult } from "./router.js";
import { getConfig } from "../config.js";

// ── Types ──

export interface SearchResult {
  chunkId: string;
  docPath: string;
  title: string;
  breadcrumb: string;
  score: number;
  snippet: string;
  category: string;
  platform: string[];
  domain?: string;
}

export interface SearchOptions {
  category?: string;
  platform?: string;
  domain?: string;
  limit?: number;
}

interface SearchIndex {
  buildAt: string;
  docCount: number;
  chunkCount: number;
  documents: DocMeta[];
  chunks: Chunk[];
  bm25: BM25Index;
}

// ── Searcher ──

/** KWIC snippet — extract text around the first matching query term */
function buildSnippet(content: string, queryTerms: string[], snippetLength: number): string {
  const lower = content.toLowerCase();

  // Find the position of the longest matching query term first
  const sorted = [...queryTerms].sort((a, b) => b.length - a.length);
  let bestPos = -1;
  for (const term of sorted) {
    const pos = lower.indexOf(term);
    if (pos >= 0) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos < 0) return content.slice(0, snippetLength);

  // Get context around the match
  const start = Math.max(0, bestPos - 60);
  const end = Math.min(content.length, start + snippetLength);
  const snippet = content.slice(start, end);

  return (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "");
}

export class Searcher {
  private index: SearchIndex;

  constructor(indexPath?: string) {
    const p =
      indexPath ??
      path.resolve(import.meta.dirname, "../../data/search-index.json");
    this.index = JSON.parse(fs.readFileSync(p, "utf-8")) as SearchIndex;
  }

  get docCount(): number {
    return this.index.docCount;
  }

  get chunkCount(): number {
    return this.index.chunkCount;
  }

  /** Count documents per category */
  listCategories(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const doc of this.index.documents) {
      counts[doc.category] = (counts[doc.category] ?? 0) + 1;
    }
    return counts;
  }

  /** Get document metadata by path */
  getDocument(docPath: string): DocMeta | undefined {
    return this.index.documents.find((d) => d.path === docPath);
  }

  /** Get all chunks for a document */
  getDocumentChunks(docPath: string): Chunk[] {
    return this.index.chunks.filter((c) => c.docPath === docPath);
  }

  /** Find related documents via the related field + tag overlap */
  findRelated(docPath: string, limit = 5): DocMeta[] {
    const doc = this.getDocument(docPath);
    if (!doc) return [];

    const relatedPaths = new Set(doc.related);
    const docTags = new Set(doc.tags);

    const scored: { doc: DocMeta; score: number }[] = [];

    for (const d of this.index.documents) {
      if (d.path === docPath) continue;

      let score = 0;
      // Explicitly related docs get a high score
      if (relatedPaths.has(d.path)) score += 10;
      // Tag overlap
      for (const tag of d.tags) {
        if (docTags.has(tag)) score += 1;
      }
      // Same category
      if (d.category === doc.category) score += 0.5;

      if (score > 0) scored.push({ doc: d, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.doc);
  }

  /** Natural language search: routing + filter + BM25 */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const config = getConfig();
    const limit = options.limit ?? config.search.defaultLimit;

    // 1. Route: extract filter hints from query
    const route = routeQuery(query);
    const category = options.category ?? route.category;
    const platform = options.platform ?? route.platform;
    const domain = options.domain ?? route.domain;

    // 2. Metadata filtering
    let candidates = this.index.chunks;

    if (category) {
      candidates = candidates.filter((c) => c.category === category);
    }
    if (platform) {
      candidates = candidates.filter((c) => c.platform.includes(platform));
    }
    if (domain) {
      candidates = candidates.filter((c) => c.domain === domain);
    }

    // Progressively relax filters if no candidates found
    if (candidates.length === 0 && (category || platform || domain)) {
      // Drop domain filter first
      candidates = this.index.chunks;
      if (category) {
        candidates = candidates.filter((c) => c.category === category);
      }
      if (platform) {
        candidates = candidates.filter((c) => c.platform.includes(platform));
      }
    }
    if (candidates.length === 0) {
      candidates = this.index.chunks;
    }

    // 3. BM25 scoring
    const queryTerms = tokenize(query);
    const totalDocs = this.index.chunkCount;

    const scored: SearchResult[] = [];

    for (const chunk of candidates) {
      const score = scoreBM25(queryTerms, chunk, this.index.bm25, totalDocs);
      if (score <= 0) continue;

      scored.push({
        chunkId: chunk.id,
        docPath: chunk.docPath,
        title: chunk.title,
        breadcrumb: chunk.breadcrumb,
        score: Math.round(score * 1000) / 1000,
        snippet: buildSnippet(chunk.content, queryTerms, config.search.snippetLength),
        category: chunk.category,
        platform: chunk.platform,
        domain: chunk.domain,
      });
    }

    // 4. Sort by score descending + deduplicate (keep highest score per docPath)
    scored.sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const deduped: SearchResult[] = [];
    for (const r of scored) {
      if (!seen.has(r.docPath)) {
        seen.add(r.docPath);
        deduped.push(r);
      }
      if (deduped.length >= limit) break;
    }

    return deduped;
  }
}
