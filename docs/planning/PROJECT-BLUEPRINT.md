# Finance Docs MCP — 프로젝트 청사진

> 작성일: 2026-06-18
> 상태: 초기 기획 (Phase 0)

---

## 1. Lean Canvas

### Problem (해결할 문제)

1. **금융 정보가 산재** — 용어사전은 은행마다 따로, 제도 설명은 공공기관 PDF, 전략은 블로그에 흩어져 있음
2. **기존 금융 MCP는 데이터 조회만** — 시세/공시 조회는 되지만 "ISA가 뭐야?"에 답하는 MCP는 없음
3. **초보 투자자의 학습 곡선** — 용어 하나를 이해하려면 5개의 연관 개념을 알아야 하지만 연결이 안 됨

### Customer Segment (타깃 사용자)

| 세그먼트 | 특징 | 핵심 니즈 |
|---------|------|----------|
| **P1: 재테크 입문자** | 20~30대, 사회 초년생, 첫 투자 | "뭐부터 해야 하지?" 단계별 가이드 |
| **P2: AI 코딩 개발자** | Claude Code/Cursor 사용자 | MCP로 금융 지식을 코딩 컨텍스트에 바로 주입 |
| **P3: 금융 콘텐츠 크리에이터** | 블로거, 유튜버 | 정확한 출처 기반 팩트체크 도구 |

### Unique Value Proposition

**"AI에게 물어볼 수 있는 금융 교과서"**

기존 용어사전 = 단어 → 뜻 (1:1)
Finance Docs = 개념 → 맥락 → 관계 → 실전 → 절세 (1:N, 연결된 지식 그래프)

### Solution

1. **구조화된 MDX 지식베이스** — 카테고리별 체계 + 문서 간 관계(related) + 난이도 레벨
2. **BM25 + MCP 검색** — Claude Code에서 `/finance ISA 납입한도` 바로 조회
3. **RAG 챗봇** — "30대 직장인인데 연 500만원으로 시작하려면 어떤 계좌가 좋아?" 맥락 답변

### Channels

| 채널 | 전략 |
|------|------|
| GitHub | 오픈소스 레포, README 데모 GIF |
| MCP 디렉토리 | [pulsemcp.com](https://pulsemcp.com), [mcp.so](https://mcp.so), [mcpmoa.com](https://mcpmoa.com) 등록 |
| 개발자 커뮤니티 | 디스코드, 트위터, velog/tistory 소개 글 |
| .mcp.json 배포 | 한 줄 설정으로 Claude Code에 연결 |

### Key Metrics

| 지표 | 의미 | 목표 (3개월) |
|------|------|-------------|
| GitHub Stars | 관심도 | 100+ |
| MCP 연결 수 | 실사용 | 50+ |
| 검색 쿼리 수 (/api/search) | 활용도 | 일 100+ |
| 문서 수 | 콘텐츠 깊이 | 200+ MDX |

### Unfair Advantage

- coolstay 프로젝트에서 검증된 파이프라인 (570 MDX, 11MB 인덱스 운영 경험)
- BM25 기반으로 외부 API/벡터DB 의존 없이 셀프호스팅 가능
- 한국어 금융 도메인 + MCP 조합은 현재 시장에 없음

---

## 2. Information Architecture (정보 구조)

### 2.1 카테고리 체계

```
finance-docs/
├── basics/              ← 투자 기초 개념
│   ├── index.mdx        ← 카테고리 허브 ("투자란 무엇인가")
│   ├── stocks.mdx       ← 주식
│   ├── bonds.mdx        ← 채권
│   ├── etf.mdx          ← ETF
│   ├── funds.mdx        ← 펀드
│   └── ...
│
├── accounts/            ← 계좌와 제도
│   ├── index.mdx        ← "어떤 계좌를 써야 할까?"
│   ├── isa.mdx          ← ISA
│   ├── irp.mdx          ← IRP
│   ├── pension-saving.mdx ← 연금저축
│   └── ...
│
├── strategy/            ← 투자 전략
│   ├── index.mdx        ← "나에게 맞는 전략 찾기"
│   ├── value-investing.mdx
│   ├── dividend-investing.mdx
│   ├── asset-allocation.mdx
│   └── ...
│
├── tax/                 ← 세금과 절세
│   ├── index.mdx        ← "투자와 세금 한눈에 보기"
│   ├── capital-gains-tax.mdx
│   ├── dividend-tax.mdx
│   ├── financial-income-tax.mdx
│   └── ...
│
├── korea-market/        ← 한국 시장
│   ├── index.mdx
│   ├── kospi-kosdaq.mdx
│   ├── trading-hours.mdx
│   ├── short-selling.mdx
│   └── ...
│
├── us-market/           ← 미국 주식
│   ├── index.mdx
│   ├── exchanges.mdx
│   ├── currency.mdx
│   ├── tax-for-koreans.mdx
│   └── ...
│
├── real-estate/         ← 부동산 기초
│   ├── index.mdx
│   ├── jeonse-wolse.mdx
│   ├── subscription.mdx
│   ├── loans.mdx
│   └── ...
│
├── glossary/            ← 용어 사전
│   ├── index.mdx        ← 전체 용어 목록
│   ├── valuation.mdx    ← PER, PBR, ROE 등 밸류에이션 지표
│   ├── trading.mdx      ← 시가, 종가, 호가 등 매매 용어
│   ├── derivatives.mdx  ← 선물, 옵션 등 파생 용어
│   └── ...
│
└── updates/             ← 제도 변경 사항
    ├── 2026-tax-reform.mdx
    └── ...
```

### 2.2 문서 깊이 레벨

모든 문서는 3단계 깊이로 설계:

```
Level 1 — 한 줄 정의 (검색 스니펫용)
  "ETF는 거래소에 상장된 펀드로, 주식처럼 실시간 매매가 가능하다."

Level 2 — 핵심 이해 (3분 읽기)
  개념 설명, 장단점, 다른 상품과의 비교표, 기본 구조

Level 3 — 실전 적용 (10분 읽기)
  실제 투자 시나리오, 세금 계산 예시, 추천 상품 유형,
  관련 제도와의 연결, 주의사항, FAQ
```

### 2.3 문서 간 관계 설계

```
ISA ──related──→ 연금저축, IRP, 절세전략
 │                  │
 └──prerequisite──→ 주식이란, ETF란
                    │
                    └──see-also──→ PER, 배당수익률, 시가총액
```

관계 유형:
- **related**: 함께 읽으면 좋은 문서
- **prerequisite**: 이 문서를 이해하려면 먼저 읽어야 할 문서
- **see-also**: 본문에서 언급되는 용어/개념

---

## 3. Frontmatter Schema

```yaml
---
# ── 필수 ──
title: "ISA (개인종합자산관리계좌)"
description: "ISA 계좌의 종류, 납입한도, 세제혜택, 가입 조건 총정리"
category: accounts           # 아래 카테고리 목록 참조

# ── 권장 ──
tags: [ISA, 절세, 비과세, 계좌, 금융소득]
difficulty: beginner          # beginner | intermediate | advanced
related: [accounts/irp, accounts/pension-saving, tax/tax-saving-strategy]

# ── 선택 ──
prerequisite: [basics/stocks, basics/etf]   # 사전 지식
updated: "2026-06-18"
summary: "ISA는 다양한 금융상품을 하나의 계좌에서 운용하며 비과세·분리과세 혜택을 받는 절세 계좌다."
---
```

### 카테고리 목록

| category | 설명 | 예상 문서 수 |
|----------|------|----------:|
| `hub` | 카테고리 허브 (목차 역할) | 8 |
| `concept` | 기초 개념 설명 | 20~30 |
| `account` | 계좌·제도 상세 | 10~15 |
| `strategy` | 투자 전략 | 10~15 |
| `tax` | 세금·절세 | 8~12 |
| `market` | 시장 구조·메커니즘 | 10~15 |
| `glossary` | 용어 정의 (그룹 단위) | 8~12 |
| `update` | 제도 변경 | 5~10 |
| `scenario` | 실전 시나리오 (30대 직장인의 첫 투자 등) | 5~10 |

---

## 4. 콘텐츠 품질 기준

### 4.1 필수 원칙

1. **정확성 우선** — 법령/고시 기준, 출처 명시 (금융위, 국세청, 한국은행)
2. **비추천 원칙** — 특정 종목/상품 추천 절대 금지, 구조와 원리만 설명
3. **최신성** — updated 날짜 필수, 제도 변경 시 관련 문서 일괄 갱신
4. **연결성** — 모든 문서에 related 3개 이상, 고립된 문서 없어야 함
5. **실용성** — 개념만이 아니라 "그래서 어떻게 하라는 건데?"에 답해야 함

### 4.2 문서 템플릿

```markdown
## 한 줄 요약
{Level 1 — 검색 스니펫에 노출될 핵심 정의}

## 개요
{Level 2 — 이게 뭔지, 왜 중요한지, 누구를 위한 것인지}

## 상세
{Level 3 — 구조, 종류, 비교표, 수치}

### {소제목 1}
### {소제목 2}

## 실전 적용
{시나리오, 계산 예시, 주의사항}

## 자주 묻는 질문
{FAQ 3~5개}

## 관련 문서
{related 링크 목록}
```

### 4.3 금지 사항

- 특정 종목/상품명 언급 (삼성전자, 테슬라 등) → "대형주", "해외 기술주"로 대체
- 수익률 보장 표현 → "과거 수익률은 미래를 보장하지 않습니다" 고지
- 날짜가 없는 수치 → 반드시 "2026년 6월 기준" 명시
- 비공식 출처 (블로그, 커뮤니티) → 공식 기관 자료만

---

## 5. 기술 설정

### 5.1 docs-mcp.config.ts

```typescript
export default defineConfig({
  name: "finance-docs",
  docsRoot: "./content/docs",
  docsBaseUrl: "https://finance-docs.example.com",  // 추후 프론트엔드 배포 시
  language: "ko",

  chat: {
    model: "gpt-4o-mini",
    systemPrompt: `당신은 한국 금융/투자/재테크 교육 전문 도우미입니다.

규칙:
- 제공된 문서 내용만을 기반으로 답변하세요.
- 특정 종목이나 상품을 추천하지 마세요.
- 세금/제도 관련 답변에는 반드시 기준 시점을 명시하세요.
- 투자 판단은 본인 책임임을 안내하세요.
- 한국어로 답변하세요.`,
    maxContextDocs: 5,
  },

  routing: {
    domainHints: [
      { pattern: /주식|증권|종목|상장/, value: "stocks" },
      { pattern: /채권|국채|회사채/, value: "bonds" },
      { pattern: /ETF|인덱스펀드/, value: "etf" },
      { pattern: /ISA|IRP|연금|퇴직/, value: "accounts" },
      { pattern: /세금|양도세|배당세|절세/, value: "tax" },
      { pattern: /코스피|코스닥|거래소/, value: "korea-market" },
      { pattern: /미국주식|나스닥|S&P|서학개미/, value: "us-market" },
      { pattern: /부동산|전세|월세|청약|대출/, value: "real-estate" },
      { pattern: /PER|PBR|ROE|EPS|밸류에이션/, value: "glossary" },
    ],
  },
});
```

### 5.2 MCP 도구 시나리오

```
사용자: "ISA 계좌 세제혜택이 뭐야?"
→ search_docs(query="ISA 세제혜택") 
→ accounts/isa.mdx 반환
→ 비과세 200만원(서민형 400만원), 초과분 9.9% 분리과세 답변

사용자: "30대 직장인인데 연 500만원으로 뭐부터 해야 해?"
→ RAG 챗봇 (/chat)
→ 검색: accounts/isa, strategy/asset-allocation, basics/etf
→ "ISA 계좌 개설 → 국내 ETF 적립식 → 연금저축 추가" 단계별 안내
```

---

## 6. Roadmap

### Phase 0: 기획 (현재)
- [x] Lean Canvas
- [x] Information Architecture
- [x] Frontmatter Schema
- [x] 콘텐츠 품질 기준
- [x] 기술 설정
- [ ] 콘텐츠 우선순위 매트릭스 (아래)
- [ ] 1차 MVP 문서 목록 확정

### Phase 1: MVP (목표: 핵심 50개 MDX)
- [ ] config 변경 + 예시 문서 교체
- [ ] 카테고리 허브 8개
- [ ] basics 10개 (주식, 채권, ETF, 펀드, 배당, 시가총액, 공모주, 우선주, 인덱스, 파생상품)
- [ ] accounts 8개 (위탁계좌, ISA, IRP, 연금저축, 청년도약, 퇴직연금, CMA, 해외주식계좌)
- [ ] glossary 8개 (밸류에이션, 매매용어, 수익률, 리스크, 배당, 거래량, 차트기초, 파생용어)
- [ ] strategy 6개 (가치투자, 배당투자, 적립식, 자산배분, 리밸런싱, 72법칙)
- [ ] tax 5개 (양도소득세, 배당소득세, 금융소득종합과세, 해외주식세금, 절세전략)
- [ ] scenario 3개 (사회초년생, 30대 직장인, 은퇴준비)
- [ ] reindex + Fly.io 배포 + MCP 디렉토리 등록

### Phase 2: 확장 (100개 MDX)
- [ ] korea-market 전체
- [ ] us-market 전체
- [ ] real-estate 기초
- [ ] updates (2026년 제도 변경)
- [ ] 문서 간 관계(related/prerequisite) 품질 검증
- [ ] 검색 품질 테스트 (test-search fixtures)

### Phase 3: 고도화
- [ ] 프론트엔드 사이트 (검색 UI + 챗봇)
- [ ] 기존 금융 MCP (시세 조회)와 연동
- [ ] 커뮤니티 기여 가이드 (CONTRIBUTING.md)
- [ ] 콘텐츠 자동 검증 (날짜 체크, 깨진 관계 링크)

---

## 7. 콘텐츠 우선순위 매트릭스

### 기준

| 축 | 높음 | 낮음 |
|----|------|------|
| **검색 수요** | "ETF란", "ISA 한도" | "CDS 스프레드" |
| **연결 가치** | 다른 문서에서 많이 참조됨 | 독립적 개념 |
| **작성 난이도** | 공식 출처에서 바로 정리 가능 | 해석/분석 필요 |

### 우선순위 분류

```
           검색 수요 높음
                │
    ┌───────────┼───────────┐
    │   P1      │    P2     │
    │  즉시     │   곧      │
    │  작성     │   작성    │
연결 ──────────┼──────────── 연결
가치  │   P3    │    P4     │ 가치
높음  │  필요시  │   나중    │ 낮음
    │  작성     │           │
    └───────────┼───────────┘
                │
           검색 수요 낮음
```

### P1 (즉시 작성) — 검색 수요 높음 + 연결 가치 높음

| 문서 | 이유 |
|------|------|
| basics/stocks | 거의 모든 문서의 prerequisite |
| basics/etf | ISA, 자산배분, 적립식 등 10개+ 문서에서 참조 |
| accounts/isa | 절세의 시작점, 검색량 최상위 |
| glossary/valuation | PER/PBR/ROE — 투자 판단의 기초 용어 |
| tax/capital-gains-tax | 모든 투자자의 필수 지식 |
| strategy/asset-allocation | 전략 카테고리의 허브 |

### P2 (곧 작성) — 검색 수요 높음 + 연결 가치 중간

| 문서 | 이유 |
|------|------|
| basics/bonds | ETF, 자산배분의 한 축 |
| accounts/irp | ISA와 항상 비교됨 |
| accounts/pension-saving | IRP와 세트 |
| strategy/dividend-investing | 배당 관련 검색 수요 높음 |
| us-market/tax-for-koreans | 서학개미 세금 관심 폭발 |

---

## 8. Open Questions (미결정 사항)

1. **레포 이름**: `finance-docs-mcp` vs `finance-mcp` vs `fin-docs`?
2. **프론트엔드 도메인**: 자체 도메인 구매할지, GitHub Pages로 충분한지?
3. **부동산 카테고리 포함 범위**: 기초만 할지, 청약/대출까지 할지?
4. **영어 지원**: 한국어 전용 vs 한/영 병행?
5. **커뮤니티 기여**: 초기부터 열지, MVP 완성 후 열지?
6. **법적 면책**: 투자 조언이 아님을 어디에 어떻게 명시할지?

---

## 참고 자료

- [Lean Canvas 방법론](https://gustdebacker.com/lean-canvas/)
- [Knowledge Base IA Best Practices](https://document360.com/blog/knowledge-base-information-architecture/)
- [PRD Template Guide](https://userpilot.com/blog/prd-template/)
- [PM Skills Framework](https://github.com/deanpeters/Product-Manager-Skills)
