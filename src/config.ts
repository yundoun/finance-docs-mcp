/**
 * Config loader for docs-mcp.
 * Reads docs-mcp.config.ts from project root and exports typed config with defaults.
 */

import fs from "node:fs";
import path from "node:path";

// ── Types ──

export interface DocsMcpConfig {
  /** Display name for the MCP server (used in tool descriptions, logs) */
  name: string;

  /** Absolute or relative path to the docs root directory containing MDX files */
  docsRoot: string;

  /** Base URL for the deployed docs site (used for link generation in chat) */
  docsBaseUrl?: string;

  /** Primary language for the docs (e.g. "ko", "en") — affects system prompt */
  language?: string;

  /** Chat / RAG settings */
  chat?: {
    /** OpenAI model to use (default: "gpt-4o-mini") */
    model?: string;
    /** Custom system prompt for the RAG chatbot */
    systemPrompt?: string;
    /** Max number of documents to include as context (default: 5) */
    maxContextDocs?: number;
  };

  /** Query routing hints — regex patterns that map to metadata filter values */
  routing?: {
    /** Domain detection patterns (e.g. /reservation/i -> "reservation") */
    domainHints?: Array<{ pattern: RegExp; value: string }>;
    /** Platform detection patterns (e.g. /mobile/i -> "mobile") */
    platformHints?: Array<{ pattern: RegExp; value: string }>;
  };

  /** BM25 search tuning */
  search?: {
    /** BM25 k1 parameter (default: 1.2) */
    bm25k1?: number;
    /** BM25 b parameter (default: 0.75) */
    bm25b?: number;
    /** Default result limit (default: 10) */
    defaultLimit?: number;
    /** Snippet character length (default: 200) */
    snippetLength?: number;
  };
}

// ── Resolved config (all optional fields filled with defaults) ──

export interface ResolvedConfig {
  name: string;
  docsRoot: string;
  docsBaseUrl: string;
  language: string;
  chat: {
    model: string;
    systemPrompt: string;
    maxContextDocs: number;
  };
  routing: {
    domainHints: Array<{ pattern: RegExp; value: string }>;
    platformHints: Array<{ pattern: RegExp; value: string }>;
  };
  search: {
    bm25k1: number;
    bm25b: number;
    defaultLimit: number;
    snippetLength: number;
  };
}

// ── Defaults ──

function buildDefaultSystemPrompt(name: string, language: string): string {
  if (language === "ko") {
    return `당신은 ${name} 문서를 기반으로 질문에 답변하는 도우미입니다.

규칙:
- 아래 제공된 문서 내용만을 기반으로 답변하세요.
- 문서에 없는 내용은 "문서에서 해당 내용을 찾을 수 없습니다"라고 답변하세요.
- 한국어로 답변하세요.
- 코드나 API 정보는 정확하게 인용하세요.

출처 표기 규칙:
- 답변 마지막에 반드시 "References" 섹션을 추가하세요.
- 각 문서에 제공된 url을 사용하여 마크다운 링크로 표기하세요.
- 형식: - [문서 제목](url)
- 실제로 답변에 활용한 문서만 출처로 표기하세요.`;
  }

  return `You are a documentation assistant for ${name}.

Rules:
- Answer only based on the provided documents below.
- If the answer is not in the documents, say "I couldn't find that information in the docs."
- Cite code and API information accurately.

Citation rules:
- Add a "References" section at the end of your answer.
- Use markdown links with the URLs provided for each document.
- Format: - [Document Title](url)
- Only cite documents you actually used in the answer.`;
}

// ── Loader ──

const CONFIG_FILENAME = "docs-mcp.config.ts";

/**
 * Load config from the project root. Falls back to defaults if the config file
 * exports values. Validates required fields.
 */
export async function loadConfig(projectRoot?: string): Promise<ResolvedConfig> {
  const root = projectRoot ?? process.cwd();
  const configPath = path.resolve(root, CONFIG_FILENAME);

  let userConfig: Partial<DocsMcpConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      // Dynamic import for .ts config (requires tsx or ts-node runtime)
      const mod = await import(configPath);
      userConfig = mod.default ?? mod;
    } catch {
      console.warn(`Warning: Could not load ${configPath}, using defaults.`);
    }
  } else {
    console.warn(`Warning: ${CONFIG_FILENAME} not found at ${root}, using defaults.`);
  }

  // Validate required fields
  if (!userConfig.name) {
    throw new Error(`Config error: "name" is required in ${CONFIG_FILENAME}`);
  }
  if (!userConfig.docsRoot) {
    throw new Error(`Config error: "docsRoot" is required in ${CONFIG_FILENAME}`);
  }

  const name = userConfig.name;
  const language = userConfig.language ?? "en";

  const resolved: ResolvedConfig = {
    name,
    docsRoot: path.resolve(root, userConfig.docsRoot),
    docsBaseUrl: userConfig.docsBaseUrl ?? "http://localhost:3000",
    language,
    chat: {
      model: userConfig.chat?.model ?? "gpt-4o-mini",
      systemPrompt:
        userConfig.chat?.systemPrompt ?? buildDefaultSystemPrompt(name, language),
      maxContextDocs: userConfig.chat?.maxContextDocs ?? 5,
    },
    routing: {
      domainHints: userConfig.routing?.domainHints ?? [],
      platformHints: userConfig.routing?.platformHints ?? [],
    },
    search: {
      bm25k1: userConfig.search?.bm25k1 ?? 1.2,
      bm25b: userConfig.search?.bm25b ?? 0.75,
      defaultLimit: userConfig.search?.defaultLimit ?? 10,
      snippetLength: userConfig.search?.snippetLength ?? 200,
    },
  };

  return resolved;
}

// ── Singleton ──

let _config: ResolvedConfig | null = null;

/** Get the resolved config (must call loadConfig first, or this will throw) */
export function getConfig(): ResolvedConfig {
  if (!_config) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return _config;
}

/** Initialize config singleton */
export async function initConfig(projectRoot?: string): Promise<ResolvedConfig> {
  _config = await loadConfig(projectRoot);
  return _config;
}
