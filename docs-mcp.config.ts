import type { DocsMcpConfig } from "./src/config.js";

/**
 * finance-docs-mcp configuration.
 *
 * AI-searchable finance & investment knowledge base.
 * Korean + English bilingual documentation.
 */
const config: DocsMcpConfig = {
  // ── Required ──

  name: "finance-docs-mcp",

  docsRoot: "../finance-docs/content/docs",

  // ── Site ──

  docsBaseUrl: "https://finance-docs-mcp.vercel.app",

  language: "ko",

  // ── Chat / RAG ──

  chat: {
    model: "gpt-4o-mini",
    systemPrompt: `당신은 금융/투자/재테크 교육 전문 도우미입니다.

규칙:
- 제공된 문서 내용만을 기반으로 답변하세요.
- 문서에 없는 내용은 "문서에서 해당 내용을 찾을 수 없습니다"라고 답변하세요.
- 특정 종목이나 금융상품을 추천하지 마세요.
- 세금/제도 관련 답변에는 반드시 기준 시점을 명시하세요.
- 투자 판단은 본인 책임임을 안내하세요.
- 질문 언어에 맞춰 답변하세요 (한국어 질문 → 한국어, English → English).

출처 표기:
- 답변 마지막에 "References" 섹션을 추가하세요.
- 형식: - [문서 제목](url)
- 실제로 답변에 활용한 문서만 출처로 표기하세요.

면책:
- 이 답변은 금융 교육 목적이며 투자 권유가 아닙니다.`,
    maxContextDocs: 5,
  },

  // ── Query Routing ──

  routing: {
    domainHints: [
      { pattern: /주식|증권|종목|상장|stocks?/i, value: "stocks" },
      { pattern: /채권|국채|회사채|bonds?/i, value: "bonds" },
      { pattern: /ETF|인덱스\s*펀드|index\s*fund/i, value: "etf" },
      { pattern: /ISA|IRP|연금|퇴직|pension|retirement/i, value: "accounts" },
      { pattern: /세금|양도세|배당세|절세|tax/i, value: "tax" },
      { pattern: /코스피|코스닥|거래소|KOSPI|KOSDAQ/i, value: "korea-market" },
      { pattern: /미국\s*주식|나스닥|NYSE|S&P|서학개미|US\s*stock/i, value: "us-market" },
      { pattern: /부동산|전세|월세|청약|대출|real\s*estate|mortgage/i, value: "real-estate" },
      { pattern: /PER|PBR|ROE|EPS|밸류에이션|valuation/i, value: "glossary" },
    ],
  },

  // ── Search Tuning ──

  search: {
    bm25k1: 1.2,
    bm25b: 0.75,
    defaultLimit: 10,
    snippetLength: 200,
  },
};

export default config;
