# 콘텐츠·출처 현재 감사

기준일: 2026-08-19 KST. production 수량과 로컬 릴리스 후보를 분리합니다. 수량은 seed plan, schema, verifier와 두 번 대조했습니다.

## Production 콘텐츠 감사

production 기준선은 D1 migration `0000–0023`과 manifest `content-v3-d102868e3d43b9b3c1a4`입니다.

| source | 범위 | expected rows/항목 | 상태 |
| --- | --- | ---: | --- |
| 03–05 | N5 한자·어휘·문법 | 103 / 700 / 55 | 공개 canonical |
| 06–08 | N4 한자·어휘·문법 | 164 / 548 / 98 | 공개 canonical |
| 09–11 | N3 한자·어휘·문법 | 275 / 2,052 / 163 | 공개 canonical |
| 12 / A / C | 예문 / 직무 / 주차 계획 | 1,100 / 82 / 52 | 공개 canonical |
| N2-A1–A5 | N2 자체 저작 Batch 1–5 | 258 / 112 / 101 / 51 / 61 | 공개 canonical |
| N1-A1–A4 | N1 자체 저작 Batch 1–4 | 87 / 87 / 51 / 61 | 공개 canonical |
| TOPIK-A1–A4 | owner curriculum | 각 60행, 총 120 unit+120 item | 운영 curriculum |
| TOPIK practice v2 | 자체 저작 문제은행 | 300문항 | 공개, audit 300 published |
| TOPIK practice v1 | 기존 결함 bank | 28문항 | 보존·비공개 |

manifest canonical 합계는 6,501행입니다. TOPIK practice bank는 이 canonical 합계와 별도입니다. v2 선택형 240개는 네 영역마다 정답 위치 `15/15/15/15`, 쓰기 60개는 서술형입니다.

## 로컬 릴리스 후보 감사

| 후보 | 수량/분포 | review 상태 | publication 상태 |
| --- | --- | --- | --- |
| `jlpt-n3-practice-v1-2026-08-19` | 한자 읽기 60 + 듣기 60; 영역별 `15/15/15/15` | 서로 다른 두 독립 artifact가 120개 대조 | 전부 `is_published=0` |
| `topik-owner-batch5-2026-08-19` | 1급 10 + 2급 10; 급수별 5영역×2 | 같은 두 artifact가 20개 대조 | 전부 `draft` |

140개 초안은 자체 저작 source `packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md`와 SHA 기반 evidence에 연결됩니다. 독립 review artifact는 답·해설·음성 계약을 검토했지만, source 객체의 pending reviewer slot을 production 승인으로 바꾸지 않습니다. release-quality link와 G0–G4가 생성되기 전에는 seed/publication 대상이 아닙니다.

TOPIK Batch 5는 선택형 16개와 쓰기 4개입니다. listening 4개만 `audio_text_ko` 및 Google speech binding을 가지며, 나머지는 음성 대상이 아닙니다.

## Provenance와 release 감사

- 현재 문제·지문·보기·정답·해설·듣기 대본은 저장소 자체 저작입니다.
- 공식 JLPT/TOPIK 기출 문항·정답·지문·음원은 seed하지 않습니다.
- 외부 사전/코퍼스는 표기·읽기·뜻 검증에만 사용하며, source intake에는 URL, license, 취득 시각, SHA-256, attribution을 기록합니다.
- `content_source_assets`는 불변 증적, `learning_content_stable_refs`는 학습 객체 소유를 담당합니다.
- 로컬 `0026`은 `content_quality_audits`를 실제 `content_releases`에 연결합니다. 누락된 링크나 요구량 불일치는 publication을 차단합니다.
- 기존 TOPIK v2 audit 300개를 historical release/G0–G4에 연결하는 backfill은 guarded script로 존재하지만 production에는 아직 적용되지 않았습니다.

## 음성 감사

발음은 Google 브라우저 음성만 사용합니다. R2 발음 asset/key, 생성, 저장, 재생, fallback은 허용하지 않습니다. production R2 pronunciation 참조는 0건입니다. 로컬 `0027`은 provider `google-browser`와 state `ready|unavailable`만 허용하고 legacy audio binding 신규 쓰기를 차단합니다.

## 재현 명령

```bash
pnpm --dir packages/db exec tsx -e 'import { buildContentSeedPlan } from "./src/seed/content-manifest.ts"; console.log(buildContentSeedPlan().manifest.entries)'
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db question:quality
pnpm -F @nihongo-n3/db verify:audio:provenance
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
pnpm -F @nihongo-n3/db test
```

`verify:fresh`는 로컬 schema/운영 seed 재현을 검사합니다. 신규 140개는 dedicated draft/reviewer tests가 검증하며 실제 release seed는 별도 승인 단계입니다.
