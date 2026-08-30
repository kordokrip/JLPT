# 학습 콘텐츠·플랫폼 로드맵

모든 배포의 선행 차단 조건은 [오류·회귀 차단 원장](00_overview/ERROR_LEDGER.md)을 따릅니다. 음성 P1 회귀는 2026-08-24 복구 배포를 완료했고, 현재 콘텐츠 Production의 운영 차단 항목은 `INC-DATA-024`의 immutable release manifest 검증 경로와 새 predeploy 증적입니다.

최종 점검: 2026-08-30 KST. 현재 Production 기준선, Preview 완료 후보, 이후 관찰 순서를 구분합니다.

## Production 완료 기준선

- D1 `nihongo-n3-prod-v2` migration `0000–0027`
- Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`
- Pages `https://9cc58a1f.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`, rollback `485b9f00-a8b1-4bbb-9001-a238651fb212`)
- web source SHA `2bd657e96d8a43c6d28efe414acd468c1abd0861`; Worker/content SHA `3485c6ef8addda3cd3e209730646c296175cf3c9`
- JLPT N2 Batch 1–5, N1 Batch 1–4, TOPIK owner Batch 1–5
- TOPIK practice v2 300문항 공개, v1 28문항 보존·비공개
- TOPIK v2 선택형 영역별 `15/15/15/15`, JLPT 정적 독해 정답 위치 편향 검사 통과
- R2 발음 D1 참조 0건, Google 우선 동일 언어 브라우저 음성 사용
- CI/CD 자동 게이트는 운영 정책상 비활성화했고, 증거는 로컬 MD 원장에서만 채택합니다.

## P1 Worker 교정 후보 — 2026-08-30

- TOPIK track status를 비공개 v1이 아니라 공개 v2 300문항으로 판정
- quiz result와 activity event의 원자성 보장, 부분 성공 fallback 제거
- TOPIK·source asset·legacy binding을 포함한 R2 참조 전수 gate와 CSP `media-src 'none'`
- 로컬 회귀 검증·Preview·명시적 Production 승인을 마치기 전에는 현재 Production이 교정됐다고 표시하지 않음

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

## 2026-08-23 Preview 완료 후보

- N2 `jlpt-n2-practice-v1` 60문항과 N1 `jlpt-n1-practice-v1` 60문항 구현 완료
- TOPIK owner Batch 6: 3–6급 각 10개, 총 40항목 구현 완료
- 두 독립 reviewer 160/160 승인, validator 통과, Preview quality link `60/60/40`
- Preview 기준 TOPIK owner 전 급수 30개·급수/영역별 6개
- Preview Worker `4c6846d8-7cde-4c2c-916b-533a2db6d76a`, 원격 smoke 21/21, Chromium/WebKit 각 14/14
- 음성 회귀 복구는 Pages `9cc58a1f-4772-4129-b90d-c819ca20d700`에 완료했고 Production 영향 기능 Chromium/WebKit `44 passed / 8 skipped / 0 failed`를 확인

이번 첫 증량은 확정 정책에 따라 `50/10/5` 미달과 무관하게 품질 gate로 준비했습니다. 다만 Preview의 과거 증적을 재사용하지 않고 현재 source의 production-predeploy, backup/restore와 source-pinned remote verifier를 새로 통과해야 합니다.

## 다음 실행 순서

1. **운영관리 기준선** — `project-operations-steward`가 작업 전후 local/remote status와 문서 drift를 기록합니다.
2. **manifest verifier 보강** — `INC-DATA-024`를 해결하도록 immutable release SHA/manifest를 명시하는 remote 검증 인터페이스를 구현합니다.
3. **7일 안정성 관찰** — activity accepted/duplicate, API error, speech outcome, published link 수를 확인합니다.
4. **데이터 바인딩 표본 확인** — N3 정답→activity, TOPIK complete→progress/card/activity, review→FSRS/activity를 원격 데이터에서 대조합니다.
5. **브라우저 회귀 유지** — Chromium/WebKit에서 strict-level weakest, 다음 행동, Google 우선 동일 언어 speech, `/api/v1/audio/` 0건을 재확인합니다.
6. **조건부 콘텐츠 Production 반영** — 새 backup/restore drill, production-predeploy G4, D1 seed, 호환 Worker, source-pinned postdeploy verifier를 수행합니다. UI 변경이 없으면 Pages는 유지합니다.
7. **D+1/D+7/D+30 관찰** — N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건을 재집계합니다. D+30 미달이면 Batch 7을 중단하고 진입 UX를 먼저 개선합니다.

상세 증적, 중단 조건과 재개 순서는 [2026-08-23 증량 릴리스 기록](00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)에 있습니다.

## 변하지 않는 완료 기준

- source evidence, 자동 validator, 서로 다른 두 reviewer, release-quality link, G0–G4가 모두 있어야 합니다.
- 다음 release도 fresh/upgrade/preview/production 단계 중 하나라도 실패하면 공개하지 않습니다.
- 발음은 Google 음성을 우선하고 같은 언어 기기 음성만 fallback하며, R2 저장·생성·재생·fallback은 만들지 않습니다.
- 공식 JLPT/TOPIK 기출 문항·정답·지문·음원은 저장하지 않습니다.
