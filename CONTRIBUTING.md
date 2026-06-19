# Contributing to finance-docs-mcp

금융 교육 지식베이스에 기여해 주셔서 감사합니다.
이 문서는 기여 방법, 품질 기준, 리뷰 프로세스를 설명합니다.

Thank you for contributing to the finance education knowledge base.
This document explains how to contribute, quality standards, and the review process.

---

## Before You Start

이 프로젝트는 **금융 교육** 목적의 지식베이스입니다. 기여하기 전에 반드시 이해해야 할 원칙이 있습니다.

### 핵심 원칙

1. **교육 목적** — 투자 권유가 아닌, 개념과 제도를 설명하는 문서입니다
2. **정확성 우선** — 공식 기관 자료(금융위, 국세청, 한국은행 등)를 기반으로 합니다
3. **비추천** — 특정 종목, 상품, 증권사를 추천하지 않습니다
4. **최신성** — 수치와 제도는 반드시 기준 시점을 명시합니다
5. **한/영 병행** — 한국어 문서는 `content/docs/ko/`, 영어는 `content/docs/en/`에 위치합니다

---

## Types of Contributions

### 1. 새 문서 작성 (New Document)

아직 다루지 않은 금융 개념, 제도, 전략에 대한 문서를 추가합니다.

**절차:**
1. [Issue](../../issues)에서 기존에 요청된 주제가 있는지 확인
2. 없으면 `doc-request` 이슈를 생성하여 주제 제안
3. 승인 후 브랜치 생성 (`docs/{category}/{topic}`)
4. 아래 문서 작성 가이드를 따라 MDX 작성
5. PR 제출 (템플릿의 체크리스트 필수 완료)

### 2. 기존 문서 수정 (Correction)

오류, 오래된 정보, 불명확한 설명을 수정합니다.

**절차:**
1. `correction` 이슈 생성 (어떤 문서의 어떤 부분이 잘못되었는지 명시)
2. 수정 PR 제출 (변경 근거 + 출처 필수)

### 3. 번역 (Translation)

한국어 ↔ 영어 번역을 추가합니다.

**절차:**
1. 원본 문서 경로 확인 (예: `ko/basics/etf.mdx`)
2. 대응되는 경로에 번역 문서 생성 (예: `en/basics/etf.mdx`)
3. frontmatter의 `title`, `description`도 번역
4. 금융 용어는 해당 언어권의 표준 용어 사용

### 4. 엔진/인프라 수정 (Code)

검색 엔진, MCP 서버, 빌드 시스템 관련 변경입니다. 일반적인 코드 리뷰 기준을 따릅니다.

---

## 문서 작성 가이드

### 디렉토리 구조

```
content/docs/
├── ko/                    ← 한국어
│   ├── basics/            ← 기초 개념
│   ├── accounts/          ← 계좌·제도
│   ├── strategy/          ← 투자 전략
│   ├── tax/               ← 세금·절세
│   ├── korea-market/      ← 한국 시장
│   ├── us-market/         ← 미국 주식
│   ├── real-estate/       ← 부동산 기초
│   ├── glossary/          ← 용어 사전
│   └── updates/           ← 제도 변경
└── en/                    ← English (same structure)
```

### Frontmatter (필수)

```yaml
---
title: "ISA (개인종합자산관리계좌)"
description: "ISA 계좌의 종류, 납입한도, 세제혜택, 가입 조건 총정리"
category: account                    # 아래 카테고리 목록 참조
tags: [ISA, 절세, 비과세, 계좌]
difficulty: beginner                 # beginner | intermediate | advanced
related: [accounts/irp, tax/tax-saving-strategy]
updated: "2026-06-18"               # 작성 또는 최종 수정일
---
```

카테고리 목록: `hub`, `concept`, `account`, `strategy`, `tax`, `market`, `glossary`, `update`, `scenario`

### 문서 구조 (3단계 깊이)

```markdown
## 한 줄 요약

{검색 결과 스니펫에 노출될 핵심 한 줄 정의}

## 개요

{이 개념이 뭔지, 왜 중요한지, 누구를 위한 것인지}

## 상세

{구조, 종류, 비교표, 수치 — 반드시 기준 시점 명시}

### 소제목 1
### 소제목 2

## 실전 적용

{시나리오, 계산 예시, 주의사항}

## 자주 묻는 질문

{FAQ 3~5개}

## 관련 문서

{related 링크 목록}

---

> **면책 조항**: 이 문서는 금융 교육 목적으로 작성되었으며, 투자 권유나 특정 금융상품 추천이 아닙니다. 투자 판단은 본인의 책임이며, 실제 투자 전 전문가와 상담하시기 바랍니다. 수치와 제도는 작성 시점 기준이며 변경될 수 있습니다.
```

---

## 품질 기준 (Quality Guardrails)

### 반드시 지켜야 할 것 (MUST)

- [ ] **출처 명시** — 수치, 세율, 한도 등은 공식 기관 출처를 각주 또는 본문에 표기
  - 허용: 금융위원회, 국세청, 한국은행, 금융감독원, 한국거래소, 법제처
  - 불허: 개인 블로그, 커뮤니티 게시글, 출처 불명의 수치
- [ ] **기준 시점** — 모든 수치에 "2026년 6월 기준" 형태로 시점 명시
- [ ] **면책 조항** — 문서 하단에 면책 문구 포함
- [ ] **related 3개 이상** — 고립된 문서 없이 최소 3개 관련 문서 링크
- [ ] **difficulty 태그** — beginner / intermediate / advanced 중 하나

### 절대 하면 안 되는 것 (MUST NOT)

- **특정 종목 언급 금지** — "삼성전자", "테슬라", "TIGER 나스닥100" ❌
  - 대체: "대형주", "해외 기술주 ETF", "S&P 500 추종 ETF" ✅
- **수익률 보장 표현 금지** — "연 10% 수익 보장" ❌
  - 대체: "과거 10년 평균 수익률은 약 X%였으나, 미래 수익을 보장하지 않습니다" ✅
- **특정 증권사/은행 추천 금지** — "A증권사가 수수료가 싸다" ❌
  - 대체: "증권사별로 수수료가 다르므로 비교 후 선택하세요" ✅
- **날짜 없는 수치 금지** — "ISA 납입한도는 연 2,000만원" ❌
  - 대체: "ISA 납입한도는 연 2,000만원 (2026년 기준)" ✅

### 권장 사항 (SHOULD)

- 비교표를 활용하여 유사 개념 구분 (ISA vs IRP vs 연금저축)
- 계산 예시를 포함하여 실용성 확보
- FAQ 3~5개로 자주 묻는 질문 대응
- prerequisite 문서를 명시하여 학습 경로 안내

---

## PR 프로세스

### 1. 브랜치 네이밍

```
docs/{category}/{topic}        # 새 문서: docs/accounts/isa
fix/{category}/{topic}         # 수정: fix/tax/capital-gains-tax
translate/{locale}/{topic}     # 번역: translate/en/basics/stocks
feat/{feature}                 # 엔진/인프라: feat/locale-filter
```

### 2. PR 제출

- PR 템플릿의 **체크리스트를 모두 완료**해야 합니다
- 콘텐츠 PR은 반드시 1명 이상의 리뷰를 받아야 합니다
- 자동 거절 대상:
  - 특정 종목/상품 추천이 포함된 PR
  - 출처 없는 수치/제도 설명
  - 면책 조항 누락

### 3. 리뷰 기준

리뷰어는 다음을 확인합니다:

| 항목 | 확인 내용 |
|------|----------|
| 정확성 | 공식 출처와 수치가 일치하는가? |
| 중립성 | 특정 상품/종목 추천이 없는가? |
| 완결성 | 3단계 구조 (한줄요약 → 개요 → 상세)를 따르는가? |
| 연결성 | related 3개 이상, prerequisite 적절한가? |
| 최신성 | 기준 시점이 명시되어 있는가? |
| 면책 | 하단 면책 조항이 있는가? |
| MDX 문법 | frontmatter 유효한가? 빌드 에러 없는가? |

---

## 개발 환경 설정

```bash
git clone https://github.com/yundoun/finance-docs-mcp.git
cd finance-docs-mcp
npm install

# 문서 작성 후 인덱스 리빌드
npm run reindex

# 로컬 서버 실행
npm run dev

# 검색 테스트
curl "http://localhost:3000/api/search?q=ISA&locale=ko"
```

---

## 질문이 있으신가요?

- [Issues](../../issues)에 질문을 남겨주세요
- 문서 주제 제안: `doc-request` 라벨로 이슈 생성
- 오류 신고: `correction` 라벨로 이슈 생성
