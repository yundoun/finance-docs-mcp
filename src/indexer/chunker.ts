import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// ── Types ──

export interface DocMeta {
  path: string; // relative to docs root, e.g. "guides/getting-started.mdx"
  title: string;
  description: string;
  category: string;
  platform: string[];
  tags: string[];
  related: string[];
  summary?: string;
  updated: string;
  /** Full MDX content (for get_document without filesystem access in production) */
  fullContent?: string;
}

export interface Chunk {
  id: string; // "{docPath}#{sectionId}"
  docPath: string;
  title: string;
  breadcrumb: string;
  content: string;
  terms: Record<string, number>;
  category: string;
  platform: string[];
  tags: string[];
  domain?: string;
}

// ── Helpers ──

/** Whitespace-based tokenization — strip punctuation, lowercase */
export function tokenize(text: string): string[] {
  // Remove special chars (preserve Korean, word chars, /.- )
  const cleaned = text.replace(/[^\w가-힣\s/.-]/g, " ");

  // Split on whitespace (preserve case for camelCase splitting)
  const raw = cleaned.split(/\s+/).filter((t) => t.length > 0);

  const result: string[] = [];
  for (const token of raw) {
    // camelCase / snake_case splitting
    const parts = token
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (parts.length > 1) {
      result.push(token.replace(/_/g, "").toLowerCase()); // compound token
      result.push(...parts);
    } else {
      result.push(parts[0] ?? token.toLowerCase());
    }
  }

  return result;
}

/** Term frequency map */
export function termFrequency(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = Object.create(null);
  for (const t of tokens) {
    tf[t] = (tf[t] ?? 0) + 1;
  }
  return tf;
}

/** Strip MDX component tags, keep text content */
function stripMdx(text: string): string {
  return text
    .replace(/<[A-Z]\w*[^>]*\/>/g, "") // self-closing <Component />
    .replace(/<[A-Z]\w*[^>]*>/g, "")   // opening <Component>
    .replace(/<\/[A-Z]\w*>/g, "")       // closing </Component>
    .replace(/```[\s\S]*?```/g, (m) => m) // keep code blocks
    .replace(/import\s+.*from\s+['"].*['"]/g, "") // import statements
    .trim();
}

/** Extract domain from docPath (first subdirectory under a known prefix) */
function extractDomain(docPath: string): string | undefined {
  // Generic: use first path segment as domain if there are 2+ segments
  const parts = docPath.split("/");
  if (parts.length >= 3) {
    return parts[0];
  }
  return undefined;
}

/** Generate breadcrumb from docPath */
function makeBreadcrumb(docPath: string, sectionTitle?: string): string {
  const parts = docPath
    .replace(/\.mdx$/, "")
    .split("/")
    .filter((p) => p !== "index");

  const crumbs = parts.map((p) =>
    p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
  if (sectionTitle) crumbs.push(sectionTitle);
  return crumbs.join(" > ");
}

// ── H2 splitter ──

interface Section {
  heading: string;
  content: string;
}

function splitByH2(body: string): Section[] {
  const lines = body.split("\n");
  const sections: Section[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      if (currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = h2Match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }
  return sections;
}

// ── Chunking threshold ──

const CHUNK_CHAR_THRESHOLD = 3000;
const CATEGORIES_ALWAYS_WHOLE = new Set(["endpoint", "domain-hub", "glossary"]);

// ── Main ──

export interface ChunkResult {
  doc: DocMeta;
  chunks: Chunk[];
}

export function chunkFile(filePath: string, docsRoot: string): ChunkResult {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data: fm, content: body } = matter(raw);

  const docPath = path.relative(docsRoot, filePath).replace(/\\/g, "/");
  const category = (fm.category as string) ?? "unknown";
  const platform = Array.isArray(fm.platform)
    ? (fm.platform as string[])
    : typeof fm.platform === "string"
      ? [fm.platform]
      : [];

  const doc: DocMeta = {
    path: docPath,
    title: (fm.title as string) ?? path.basename(filePath, ".mdx"),
    description: (fm.description as string) ?? "",
    category,
    platform,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    related: Array.isArray(fm.related) ? (fm.related as string[]) : [],
    summary: fm.summary as string | undefined,
    updated: (fm.updated as string) ?? "",
    fullContent: raw,
  };

  const cleanBody = stripMdx(body);
  const domain = extractDomain(docPath);

  // Conditional splitting: short docs stay whole, long docs split by H2
  const shouldSplitByH2 =
    !CATEGORIES_ALWAYS_WHOLE.has(category) &&
    cleanBody.length > CHUNK_CHAR_THRESHOLD;

  const chunks: Chunk[] = [];

  if (shouldSplitByH2) {
    const sections = splitByH2(cleanBody);
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec.content.trim()) continue;

      const sectionId = sec.heading
        ? sec.heading
            .toLowerCase()
            .replace(/[^\w가-힣\s]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 40)
        : `section-${i}`;

      const tokens = tokenize(
        `${doc.title} ${sec.heading} ${sec.content}`
      );

      chunks.push({
        id: `${docPath}#${sectionId}`,
        docPath,
        title: sec.heading || doc.title,
        breadcrumb: makeBreadcrumb(docPath, sec.heading || undefined),
        content: sec.content,
        terms: termFrequency(tokens),
        category,
        platform,
        tags: doc.tags,
        ...(domain && { domain }),
      });
    }
  }

  // Whole-doc single chunk (if no splitting or splitting produced nothing)
  if (chunks.length === 0) {
    const tokens = tokenize(`${doc.title} ${doc.description} ${cleanBody}`);
    chunks.push({
      id: `${docPath}#whole`,
      docPath,
      title: doc.title,
      breadcrumb: makeBreadcrumb(docPath),
      content: cleanBody,
      terms: termFrequency(tokens),
      category,
      platform,
      tags: doc.tags,
      ...(domain && { domain }),
    });
  }

  return { doc, chunks };
}
