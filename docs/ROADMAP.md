# 학습 콘텐츠·플랫폼 로드맵

기준일: 2026-08-19 KST. 현재 production 완료 상태와 이후 관찰 순서를 구분합니다.

## Production 완료 기준선

- D1 `nihongo-n3-prod-v2` migration `0000–0027`
- Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`
- Pages `https://7b0e9050.nihongo-n3.pages.dev`
- source release SHA `3485c6ef8addda3cd3e209730646c296175cf3c9`
- JLPT N2 Batch 1–5, N1 Batch 1–4, TOPIK owner Batch 1–4
- TOPIK practice v2 300문항 공개, v1 28문항 보존·비공개
- TOPIK v2 선택형 영역별 `15/15/15/15`, JLPT 정적 독해 정답 위치 편향 검사 통과
- R2 발음 D1 참조 0건, Google 브라우저 음성만 사용

2026-08-09와 2026-08-17 배포 ID·백업·rollback 기록은 [현재 상태](00_overview/CURRENT_STATE.md#production-릴리스-기록)에 보존합니다.

## 2026-08-19 Production 완료

1. `0024`: privacy-minimized `learning_activity_events`와 idempotent batch 계약
2. `0025`: 자체 저작 JLPT 정적 문제은행 schema
3. `0026`: quality audit과 `content_releases`의 요구량/링크 및 publication gate
4. `0027`: `google-browser` 전용 speech binding, legacy audio binding 신규 쓰기 차단
5. 활동 API·Dexie offline queue·7/30일 summary와 TOPIK 다음 행동
6. 퀴즈 선택적 `weakest`; 기본 `random` 호환, 요청 급수 밖 fallback 금지
7. `jlpt-n3-practice-v1-2026-08-19` 120문항과 quality link 120개 published
8. `topik-owner-batch5-2026-08-19` 20항목과 quality link 20개 published
9. historical `topik-practice-v2-2026-08-17`과 quality link 300개 published

배포 후 remote DB/TOPIK verifier, question quality 332개·실패 0건, R2 pronunciation 참조 0건, Chromium/WebKit production E2E가 통과했습니다.

## 다음 실행 순서

1. **7일 안정성 관찰** — activity accepted/duplicate, API error, speech outcome, published link 수를 확인합니다.
2. **데이터 바인딩 표본 확인** — N3 정답→activity, TOPIK complete→progress/card/activity, review→FSRS/activity를 원격 데이터에서 대조합니다.
3. **브라우저 회귀 유지** — Chromium/WebKit에서 strict-level weakest, 다음 행동, Google speech, `/api/v1/audio/` 0건을 재확인합니다.
4. **사용량 기반 다음 결정** — N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건 이후 확장 여부를 판단합니다. 30일 내 미달이면 콘텐츠보다 진입 UX를 먼저 점검합니다.
5. **다음 증량** — 사용 지표를 충족한 뒤에만 N2 Batch 6, N1 Batch 5, TOPIK 급수별 증량의 우선순위를 정합니다.

상세 명령, 중단 조건, 단계별 실행 프롬프트는 [2026-08-19 다음 개발 계획](00_overview/NEXT_DEVELOPMENT_PLAN_2026-08-19.md)에 있습니다.

## 변하지 않는 완료 기준

- source evidence, 자동 validator, 서로 다른 두 reviewer, release-quality link, G0–G4가 모두 있어야 합니다.
- 다음 release도 fresh/upgrade/preview/production 단계 중 하나라도 실패하면 공개하지 않습니다.
- 발음은 Google 브라우저 음성만 사용하며 R2 저장·생성·재생·fallback을 만들지 않습니다.
- 공식 JLPT/TOPIK 기출 문항·정답·지문·음원은 저장하지 않습니다.
