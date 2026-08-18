# 학습 콘텐츠·플랫폼 로드맵

기준일: 2026-08-19 KST. production 완료, 로컬 검증 완료, 배포 대기를 구분합니다.

## Production 완료 기준선

- D1 `nihongo-n3-prod-v2` migration `0000–0023`
- Worker `693837d0-70e0-40b7-9f7e-72487321b6f7`
- Pages `9d8e6460-2e86-477c-8eb8-fc4c41491f4c`
- JLPT N2 Batch 1–5, N1 Batch 1–4, TOPIK owner Batch 1–4
- TOPIK practice v2 300문항 공개, v1 28문항 보존·비공개
- TOPIK v2 선택형 영역별 `15/15/15/15`, JLPT 정적 독해 정답 위치 편향 검사 통과
- R2 발음 D1 참조 0건, Google 브라우저 음성만 사용

2026-08-09와 2026-08-17 배포 ID·백업·rollback 기록은 [현재 상태](00_overview/CURRENT_STATE.md#production-릴리스-기록)에 보존합니다.

## 로컬 구현·검증 완료, 배포 대기

1. `0024`: privacy-minimized `learning_activity_events`와 idempotent batch 계약
2. `0025`: 자체 저작 JLPT 정적 문제은행 schema
3. `0026`: quality audit과 `content_releases`의 요구량/링크 및 publication gate
4. `0027`: `google-browser` 전용 speech binding, legacy audio binding 신규 쓰기 차단
5. 활동 API·Dexie offline queue·7/30일 summary와 TOPIK 다음 행동
6. 퀴즈 선택적 `weakest`; 기본 `random` 호환, 요청 급수 밖 fallback 금지
7. `jlpt-n3-practice-v1-2026-08-19` 120문항과 `topik-owner-batch5-2026-08-19` 20항목 초안 및 두 독립 review artifact
8. 기존 TOPIK v2 300문항을 historical release/evidence에 연결하는 guarded backfill

위 항목은 production에 배포되지 않았습니다. 콘텐츠의 저장 상태도 draft/unpublished입니다.

## 다음 실행 순서

1. **기준선 고정** — production backup/버전/Pages/manifest를 재확인하고 로컬 변경 범위를 동결합니다.
2. **로컬 전체 gate** — OpenAPI, typecheck, unit, build, fresh D1, quality, control plane, docs link를 다시 실행합니다.
3. **preview 검증** — production snapshot upgrade, preview D1 migration/seed, historical backfill dry-run, Chromium/WebKit smoke를 수행합니다.
4. **명시적 production 승인** — 백업/restore drill 뒤 additive migration과 호환 Worker를 먼저 반영합니다.
5. **콘텐츠 release** — 정확한 quality link와 G0–G4가 모두 통과한 release만 publication합니다. 실패한 항목은 draft로 유지합니다.
6. **Pages 활성화·smoke** — activity summary, strict-level quiz, TOPIK owner→FSRS, Google speech, `/api/v1/audio/` 0건을 확인합니다.
7. **사용량 기반 다음 결정** — N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건 이후 확장 여부를 판단합니다. 30일 내 미달이면 콘텐츠보다 진입 UX를 먼저 점검합니다.

상세 명령, 중단 조건, 단계별 실행 프롬프트는 [2026-08-19 다음 개발 계획](00_overview/NEXT_DEVELOPMENT_PLAN_2026-08-19.md)에 있습니다.

## 변하지 않는 완료 기준

- source evidence, 자동 validator, 서로 다른 두 reviewer, release-quality link, G0–G4가 모두 있어야 합니다.
- fresh/upgrade/preview/production 단계 중 하나라도 실패하면 공개하지 않습니다.
- 발음은 Google 브라우저 음성만 사용하며 R2 저장·생성·재생·fallback을 만들지 않습니다.
- 공식 JLPT/TOPIK 기출 문항·정답·지문·음원은 저장하지 않습니다.
