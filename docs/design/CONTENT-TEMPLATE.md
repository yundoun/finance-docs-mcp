# MDX 문서 작성 템플릿

새 문서 작성 시 이 템플릿을 복사하여 사용합니다.

---

## 파일명 규칙

- kebab-case: `capital-gains-tax.mdx`, `asset-allocation.mdx`
- 카테고리 허브: `index.mdx`
- 한국어: `content/docs/ko/{category}/{topic}.mdx`
- 영어: `content/docs/en/{category}/{topic}.mdx`

---

## 템플릿 (한국어)

```mdx
---
title: "{주제 한글명}"
description: "{한 줄 설명 — 검색 결과에 노출됨}"
category: concept
tags: [{태그1}, {태그2}, {태그3}]
difficulty: beginner
related: [{category}/{doc1}, {category}/{doc2}, {category}/{doc3}]
updated: "{YYYY-MM-DD}"
---

## 한 줄 요약

{이 개념의 핵심을 한 문장으로. 검색 스니펫에 노출됩니다.}

## 개요

{이것이 무엇인지, 왜 알아야 하는지, 누구에게 필요한지.}

| 항목 | 내용 |
|------|------|
| 분류 | {어떤 금융 상품/제도에 해당하는지} |
| 관련 법령 | {해당 법률/시행령} |
| 관할 기관 | {금융위원회, 국세청 등} |

## 상세

### {소제목 1}

{구체적인 설명. 수치는 반드시 기준 시점 포함.}

| 구분 | 내용 |
|------|------|
| {항목} | {값} (YYYY년 MM월 기준) |

### {소제목 2}

{비교표, 구조 설명, 장단점 등.}

## 실전 적용

### 시나리오

{구체적인 상황 예시와 계산.}

### 주의사항

- {실수하기 쉬운 점 1}
- {실수하기 쉬운 점 2}

## 자주 묻는 질문

**Q. {질문 1}**
A. {답변 1}

**Q. {질문 2}**
A. {답변 2}

**Q. {질문 3}**
A. {답변 3}

## 관련 문서

- [{관련 문서 1 제목}](./{path1})
- [{관련 문서 2 제목}](./{path2})
- [{관련 문서 3 제목}](./{path3})

---

> **면책 조항**: 이 문서는 금융 교육 목적으로 작성되었으며, 투자 권유나 특정 금융상품 추천이 아닙니다. 투자 판단은 본인의 책임이며, 실제 투자 전 전문가와 상담하시기 바랍니다. 수치와 제도는 작성 시점 기준이며 변경될 수 있습니다.
```

---

## 템플릿 (English)

```mdx
---
title: "{Topic Name}"
description: "{One-line description — shown in search results}"
category: concept
tags: [{tag1}, {tag2}, {tag3}]
difficulty: beginner
related: [{category}/{doc1}, {category}/{doc2}, {category}/{doc3}]
updated: "{YYYY-MM-DD}"
---

## Summary

{Core definition in one sentence. Shown in search snippets.}

## Overview

{What this is, why it matters, who needs to know.}

## Details

### {Subsection 1}

### {Subsection 2}

## Practical Application

### Scenario

### Common Mistakes

## FAQ

**Q. {Question 1}**
A. {Answer 1}

## Related Documents

---

> **Disclaimer**: This document is for financial education purposes only and does not constitute investment advice or a recommendation of any specific financial product. Investment decisions are your own responsibility. Please consult a qualified financial advisor before making investment decisions. Figures and regulations are as of the date written and may change.
```

---

## 카테고리 허브 (index.mdx) 템플릿

```mdx
---
title: "{카테고리 한글명}"
description: "{카테고리 전체를 소개하는 한 줄}"
category: hub
tags: [{카테고리 관련 태그}]
difficulty: beginner
updated: "{YYYY-MM-DD}"
---

## 개요

{이 카테고리에서 다루는 주제 영역 설명.}

## 문서 목록

| 문서 | 난이도 | 설명 |
|------|:------:|------|
| [{문서1 제목}](./{doc1}) | beginner | {한 줄 설명} |
| [{문서2 제목}](./{doc2}) | intermediate | {한 줄 설명} |

## 학습 순서 추천

1. {입문자가 먼저 읽어야 할 문서}
2. {다음으로 읽을 문서}
3. {심화 문서}

---

> **면책 조항**: 이 문서는 금융 교육 목적으로 작성되었으며, 투자 권유나 특정 금융상품 추천이 아닙니다. 투자 판단은 본인의 책임이며, 실제 투자 전 전문가와 상담하시기 바랍니다. 수치와 제도는 작성 시점 기준이며 변경될 수 있습니다.
```
