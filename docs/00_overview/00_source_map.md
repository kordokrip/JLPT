# 학습 원본·데이터 흐름 지도

## 최신 출판 연결 — 2026-10-13

운영0032에 V7 440문항/220레슨과 별도v3 160문항을 공개했다. 정확한 동결/source/review hash → G0–G4 → `learning-cohort-remote.ts`의5개 release 단일 공개 → D1 공개 카탈로그/버전 고정 세션 → 네 메뉴 학습 UI로 연결한다. canonical source3485/manifestd102와 신규 cohort는 별도로 검증하며 원문/불합격 리뷰를 재시드하지 않는다. 실제 현재 source37486f8·Pages6b8b8a19·600품질 링크와 학습 기록 보존 근거는 [최종 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)에 있다. 아래10월12일 후보/미공개 설명은 보존된 당시 상태다.

2026-10-12 후보는 V7 두 release의 question/unit/audio/lesson/cue/ref exact JSON seal과 Preview160 v3 immutable source/review를 사용한다. 기존 source facts/provenance를 보존하며 새 license 연구나 Preview 공개를 뜻하지 않는다.

문서 갱신: 2026-10-12 KST. 원본, builder, Production/Preview release와 학습 저장 경로를 연결합니다. 수치는 [콘텐츠 감사](CONTENT_AUDIT.md), 운영 상태는 [현재 상태](CURRENT_STATE.md)를 봅니다. 운영 migration은0000–0030이며 콘텐츠 source3485/manifestd102는 유지합니다.

## Production source map

현재 후보 경로는 공개220개념 → source06/86사실 → 실패 v4/v5/v6 보존 → V7 동결/A-B440승인 → `learning-path-reviewed-release.ts` exact profile → `learning-path-v4-draft.ts` draft/seal → `learning-path-reviewed-publish.ts` 정식local G0–G4 공개/철회 → 실제 Worker/UI다. 최종 cohort04 단위614·E2E44·fresh/reseed/합성12종 upgrade·local공개/재실행/철회가 통과했다. 별도160은 기존/v2 실패를 보존하고 새v3 A/B160승인 → `preview160-v3-quality.ts` → `preview160-v3-draft.ts`의543비공개행/reseed로 검증했다. 둘 다 원격에는 반영하지 않았다. 새 Preview/가족/현배포 음성·백업/Production은 후속이다. `collect-krdict-api-exact.ts`의 기존 취득 사실·응답 hash·sense를 재사용하며 새HTTP 취득으로 주장하지 않는다.

보존된 v1 실패 경로는 `content/learning-path-2026-10-11/{concept-specs,data}.ts` → intake v1/v2 → `content/reviews/learning-path-reviewer-{a,b}-2026-10-11.json` → structure/readiness → `seed/learning-path-draft.ts`다. 당시 lookup31·두 불합격으로 공개가 차단됐다. 이 v1을 현재V7이나 운영 source/별도160과 섞지 않는다. 실제 API `learning-lessons.ts` → Web `LearnerLessonLibrary` 연결과 버전별 증거는 [구현 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 따른다.

| 범위              | 원본                         | builder                                             | Production 상태              |
| ----------------- | ---------------------------- | --------------------------------------------------- | ---------------------------- |
| JLPT N5           | `docs/01_n5`               | `content-manifest.ts`                             | 어휘·문법·한자 공개        |
| JLPT N4           | `docs/02_n4`               | `content-manifest.ts`                             | 어휘·문법·한자 공개        |
| JLPT N3 canonical | `docs/03_n3`               | `content-manifest.ts`                             | 어휘·문법·한자 공개        |
| 공용 자료         | `docs/04_supplement`       | `content-manifest.ts`                             | 예문·직무·계획 공개        |
| JLPT N2           | `docs/05_n2`               | `n2-batch1.ts`–`n2-batch5.ts`                  | Batch 1–5 공개              |
| JLPT N1           | `docs/06_n1`               | `n1-batch1.ts`–`n1-batch4.ts`                  | Batch 1–4 공개              |
| TOPIK owner       | `docs/07_topik/02`–`05` | `topik-owner-curriculum-batch1.ts`–`batch4.ts` | 1–6급, 5영역 공개           |
| TOPIK placement   | `docs/07_topik`            | placement v2 builder                                | v2 공개                      |
| TOPIK practice    | `docs/07_topik`            | practice v2 builder                                 | v2 300 공개; v1 보존·비공개 |

TOPIK practice v2는 “공개 후보”가 아니라 2026-08-17 production 공개 상태입니다.

## 2026-08-19 Production release source map

| release                                  | 자체 저작 원본                                                      | builder/review                                                                            | Production 상태      |
| ---------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| `jlpt-n3-practice-v1-2026-08-19` (120) | `packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md` | `jlpt-n3-practice-bank-v1.ts`, `content-expansion-adversarial-review-1.ts`, `-2.ts` | 120 links, published |
| `topik-owner-batch5-2026-08-19` (20)   | 같은 source                                                         | `topik-owner-curriculum-batch5.ts`, 같은 두 review artifact                             | 20 links, published  |
| `topik-practice-v2-2026-08-17` (300)   | 기존 v2 evidence/audit                                              | `backfill-topik-practice-v2-release.ts`                                                 | 300 links, published |

세 release는 `0026` release-quality link와 G0–G4 evidence를 거쳐 production에 반영됐습니다. source release SHA는 `3485c6ef8addda3cd3e209730646c296175cf3c9`입니다. 이후 release도 같은 승인 경로를 사용합니다.

## 2026-08-23 Preview source map

| release                            | 자체 저작 원본                                             | builder/review                                    | 상태                                |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| `jlpt-n2-practice-v1-2026-08-23` | `packages/db/src/seed/jlpt-n2-n1-practice-content-v1.ts` | `jlpt-n2-n1-practice-banks-v1.ts`, Reviewer A/B | Preview 60 links; Production 미반영 |
| `jlpt-n1-practice-v1-2026-08-23` | 같은 source                                                | 같은 builder/reviewer                             | Preview 60 links; Production 미반영 |
| `topik-owner-batch6-2026-08-23`  | `packages/db/src/seed/topik-owner-curriculum-batch6.ts`  | Batch 6 builder, Reviewer A/B                     | Preview 40 links; Production 미반영 |

공통 intake는 `packages/db/src/content/next-content-expansion-intake.json`, 자체 저작 선언은 `next-content-expansion-source.md`, 품질/독립 리뷰 artifact는 `.artifacts/content-quality/next-content-expansion-*`입니다. Preview 검증은 [릴리스 기록](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)을 따릅니다.

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

## 학습 세션·보상·알림 map

`Today/StudySession → /learning/profile·/study/sessions → study_sessions/study_steps → learning-effects의 완료·FSRS·activity batch → study_reward_events → /learning/records·/learning/motivation`으로 연결합니다. 0028은 학습/메모/연결, 0029는 quick/daily·보상, 0030은 알림 언어·발송 claim을 추가했습니다. `push-reminders.ts → subscription 언어·프로필 시간대 → push_notification_deliveries → sw.ts`가 알림 경로입니다.

새 보상은 안내 세션의 서버 수락 결과에만 연결합니다. 기존 자유 quiz·owner·FSRS와 client speech telemetry를 중복 학습 성과로 합산하지 않습니다. 승인된 개념 연결은 별도 `content_learning_links`이며 아직 공개된 연결 행을 생성하지 않았습니다.

## Speech map

```text
audio_script_ja / audio_text_ko
  → content_speech_bindings(provider=google-browser)
  → 같은 언어 Google 우선 browser voice / 같은 언어 설치 voice fallback
  → played | unavailable | error activity event
```

R2는 이 경로에 존재하지 않습니다. 음성 binary, R2 key, R2 fallback을 생성·저장·조회하지 않습니다. legacy `/api/v1/audio/*`는 `410 Gone`, `content_audio_bindings`는 production `0027` 이후 신규 insert가 금지됩니다.

원본 본문을 바꾸면 source SHA와 manifest/version이 바뀝니다. 제목의 목표 수량 대신 seed plan과 fresh verifier를 최종 기준으로 사용합니다.
