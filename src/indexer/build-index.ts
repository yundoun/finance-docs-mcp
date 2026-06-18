#!/usr/bin/env tsx
/**
 * Read MDX documents and generate search-index.json.
 * Usage: npm run reindex
 */

import fs from "node:fs";
import path from "node:path";
import { chunkFile, type DocMeta, type Chunk } from "./chunker.js";
import { buildBM25Index, type BM25Index } from "./bm25.js";
import { initConfig } from "../config.js";

// ── Collect MDX files ──

function collectMdxFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".mdx")) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

// ── Search index structure ──

interface SearchIndex {
  buildAt: string;
  docCount: number;
  chunkCount: number;
  documents: DocMeta[];
  chunks: Chunk[];
  bm25: BM25Index;
}

// ── Main ──

async function main() {
  const config = await initConfig(path.resolve(import.meta.dirname, "../.."));

  const docsRoot = config.docsRoot;
  const outputDir = path.resolve(import.meta.dirname, "../../data");
  const outputPath = path.join(outputDir, "search-index.json");

  console.log(`Docs root: ${docsRoot}`);

  if (!fs.existsSync(docsRoot)) {
    console.error(`Docs root not found: ${docsRoot}`);
    process.exit(1);
  }

  const files = collectMdxFiles(docsRoot);
  console.log(`Found ${files.length} MDX files`);

  const documents: DocMeta[] = [];
  const chunks: Chunk[] = [];
  let skipped = 0;

  for (const file of files) {
    try {
      const result = chunkFile(file, docsRoot);
      documents.push(result.doc);
      chunks.push(...result.chunks);
    } catch (err) {
      skipped++;
      const rel = path.relative(docsRoot, file);
      console.warn(`Skipped ${rel}: ${(err as Error).message}`);
    }
  }

  console.log(`${chunks.length} chunks from ${documents.length} documents (skipped: ${skipped})`);

  // Build BM25 index
  const bm25 = buildBM25Index(chunks);
  console.log(`BM25 index: avgDl=${bm25.avgDl.toFixed(1)}, unique terms=${Object.keys(bm25.df).length}`);

  // Write output
  const index: SearchIndex = {
    buildAt: new Date().toISOString(),
    docCount: documents.length,
    chunkCount: chunks.length,
    documents,
    chunks,
    bm25,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), "utf-8");

  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`Written ${outputPath} (${sizeMB} MB)`);
}

main();
