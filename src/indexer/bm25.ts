import type { Chunk } from "./chunker.js";
import { getConfig } from "../config.js";

// ── Types ──

export interface BM25Index {
  avgDl: number;
  df: Record<string, number>; // document frequency per term
}

// ── Build ──

/** Build a BM25 index (avgDl, df) from an array of chunks */
export function buildBM25Index(chunks: Chunk[]): BM25Index {
  const df: Record<string, number> = {};
  let totalLength = 0;

  for (const chunk of chunks) {
    const terms = chunk.terms;
    const docLen = Object.values(terms).reduce((a, b) => a + b, 0);
    totalLength += docLen;

    // Increment df for each unique term in this chunk
    for (const term of Object.keys(terms)) {
      df[term] = (df[term] ?? 0) + 1;
    }
  }

  return {
    avgDl: chunks.length > 0 ? totalLength / chunks.length : 0,
    df,
  };
}

// ── Score ──

/** Compound token boost: original tokens from camelCase/snake_case splitting (12+ chars with sub-words) */
const COMPOUND_BOOST = 3;

/** Calculate BM25 score for a single chunk against query terms */
export function scoreBM25(
  queryTerms: string[],
  chunk: Chunk,
  index: BM25Index,
  totalDocs: number,
): number {
  const config = getConfig();
  const K1 = config.search.bm25k1;
  const B = config.search.bm25b;

  const { avgDl, df } = index;
  const docLen = Object.values(chunk.terms).reduce((a, b) => a + b, 0);
  let score = 0;

  for (const term of queryTerms) {
    const termDf = df[term] ?? 0;
    if (termDf === 0) continue;

    const tf = chunk.terms[term] ?? 0;
    if (tf === 0) continue;

    // IDF: log((N - df + 0.5) / (df + 0.5) + 1)
    const idf = Math.log((totalDocs - termDf + 0.5) / (termDf + 0.5) + 1);

    // TF normalization
    const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLen / avgDl)));

    // Compound token boost: sub-words that exist separately in the query
    const isCompound = term.length >= 12
      && queryTerms.some((t) => t !== term && t.length >= 2 && term.includes(t));
    const boost = isCompound ? COMPOUND_BOOST : 1;

    score += idf * tfNorm * boost;
  }

  return score;
}
