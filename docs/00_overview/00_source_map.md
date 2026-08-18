# 학습 원본·데이터 흐름 지도

기준일: 2026-08-19 KST. 원본, builder, production release를 연결합니다. 수치는 [콘텐츠 감사](CONTENT_AUDIT.md), 운영 상태는 [현재 상태](CURRENT_STATE.md)를 봅니다.

## Production source map

| 범위 | 원본 | builder | Production 상태 |
| --- | --- | --- | --- |
| JLPT N5 | `docs/01_n5` | `content-manifest.ts` | 어휘·문법·한자 공개 |
| JLPT N4 | `docs/02_n4` | `content-manifest.ts` | 어휘·문법·한자 공개 |
| JLPT N3 canonical | `docs/03_n3` | `content-manifest.ts` | 어휘·문법·한자 공개 |
| 공용 자료 | `docs/04_supplement` | `content-manifest.ts` | 예문·직무·계획 공개 |
| JLPT N2 | `docs/05_n2` | `n2-batch1.ts`–`n2-batch5.ts` | Batch 1–5 공개 |
| JLPT N1 | `docs/06_n1` | `n1-batch1.ts`–`n1-batch4.ts` | Batch 1–4 공개 |
| TOPIK owner | `docs/07_topik/02`–`05` | `topik-owner-curriculum-batch1.ts`–`batch4.ts` | 1–6급, 5영역 공개 |
| TOPIK placement | `docs/07_topik` | placement v2 builder | v2 공개 |
| TOPIK practice | `docs/07_topik` | practice v2 builder | v2 300 공개; v1 보존·비공개 |

TOPIK practice v2는 “공개 후보”가 아니라 2026-08-17 production 공개 상태입니다.

## 2026-08-19 Production release source map

| release | 자체 저작 원본 | builder/review | Production 상태 |
| --- | --- | --- | --- |
| `jlpt-n3-practice-v1-2026-08-19` (120) | `packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md` | `jlpt-n3-practice-bank-v1.ts`, `content-expansion-adversarial-review-1.ts`, `-2.ts` | 120 links, published |
| `topik-owner-batch5-2026-08-19` (20) | 같은 source | `topik-owner-curriculum-batch5.ts`, 같은 두 review artifact | 20 links, published |
| `topik-practice-v2-2026-08-17` (300) | 기존 v2 evidence/audit | `backfill-topik-practice-v2-release.ts` | 300 links, published |

세 release는 `0026` release-quality link와 G0–G4 evidence를 거쳐 production에 반영됐습니다. source release SHA는 `3485c6ef8addda3cd3e209730646c296175cf3c9`입니다. 이후 release도 같은 승인 경로를 사용합니다.

## 런타임 데이터 map

```text
퀴즈/owner/Google speech
  → web Dexie activity queue
  → POST /api/v1/activity/events
  → learning_activity_events (production 0024)
  → GET /api/v1/activity/summary
  → due review → incomplete owner → weakest area
```

퀴즈 `weakest`는 최근 30일 오답을 보되 요청 JLPT 급수를 벗어나지 않습니다. TOPIK owner complete와 FSRS review event는 해당 서버 transaction과 함께 기록됩니다.

## Speech map

```text
audio_script_ja / audio_text_ko
  → content_speech_bindings(provider=google-browser)
  → browser Google voice
  → played | unavailable | error activity event
```

R2는 이 경로에 존재하지 않습니다. 음성 binary, R2 key, R2 fallback을 생성·저장·조회하지 않습니다. legacy `/api/v1/audio/*`는 `410 Gone`, `content_audio_bindings`는 production `0027` 이후 신규 insert가 금지됩니다.

원본 본문을 바꾸면 source SHA와 manifest/version이 바뀝니다. 제목의 목표 수량 대신 seed plan과 fresh verifier를 최종 기준으로 사용합니다.
