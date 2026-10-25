# 현재 구현 상태

갱신: 2026-10-26. 상세 이력은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)과 [통합 UI 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)에 보존한다. 과거 미배포/차단 문구는 현재 상태가 아니다.

## 후속 보안 후보 (2026-10-26)

`INC-SEC-129`: 가입 권한·Google 연결·OAuth 브라우저 바인딩/원자적 소비·CSRF·비밀번호 시도 제한·푸시 SSRF·관리자 출력·로그아웃 실패를 보강 중이다. 독립 검토에서 발견한 Preview 쿠키 호스트와 logout401 회귀도 수정했다. 아래 찾아보기 수정과 함께 검증하며 현재 Production은 유지한다. 범위·증거·편의성 경계는 [보안 보강 기록](SECURITY_HARDENING_2026-10-26.md)을 따른다.

## 후속 로컬 수정 — 찾아보기 탭 (2026-10-26)

`INC-UI-128`: 문법에서 어휘·한자·동음이의어 탭 클릭 시 두 URL 이동이 충돌하던 문제를 단일 이동으로 수정했다. 회귀7건은 수정 전 실패/수정 후 통과, Chromium/WebKit 모바일·PC의 실제 클릭·API 데이터 표시를 포함한 찾아보기12건도 실패/skip/flaky0으로 통과했다. 운영 `92c6e58b`에는 아직 미반영이며 이번 수정에 DB·API·음성 변경은 없다. 검증 결과는 [오류 원장](ERROR_LEDGER.md)의 해당 ID를 따른다.

## 완료 — 세부 학습 UI·문자 연습 (2026-10-25)

문자 화면의 설명 열 압축을 공통 컨테이너 레이아웃으로 수정하고 히라가나·가타카나·한자·한글에 5자 관찰/회상/문제/재시도 흐름을 적용했다. 자료 상세·기록 기간 선택·동작 감소도 보완했다. `6ecc203`은 단위858건·전체 브라우저303통과/30정책 제외/실패0, Preview 양트랙·양엔진·양테마·3폭 및 사용자 양언어 가청 확인을 거쳐 **Production Pages `92c6e58b`에 배포**했다. 사후 HTTP/호스트 격리188건·인증proxy3건·canonical392건·Worker smoke7건 통과. 승인된0033/77표 백업·복원 점검 뒤 기존 Worker와 학습 저장·queue를 복원했다. DB·음성·FSRS·XP는 유지한다. 검사 범위·제한·최종 결과는 [세부 UI 감사](DETAIL_UI_AUDIT_2026-10-25.md)를 따른다.

## 배포 기준선

### 완료: 지도 재개 안내 모달 (2026-10-14)

- 최종 후보 `d69456315812c807650e6a18ff797c5255e00e40`, clean worktree에서 빌드한 [Preview](https://2d1c6092.nihongo-n3.pages.dev)를 검증하고 **Production `1d102c82-5348-4e67-980f-db2d1d9ee558`에 반영**했다. 원격 작업 branch도 같은 SHA로 push했다.
- 상시 재개 안내를 계정·트랙·세션별 한 번 닫을 수 있는 모달로 교체하고 카드 상단 겹침을 제거했다. Worker·DB·음성·학습 저장 로직은 변경하지 않았다.
- 단위854건, OpenAPI/typecheck/build/fresh0033 통과. 전체 브라우저 최초233통과/58실패/30정책 제외 후, 모달 내부 버튼 선택과 검토한 간격 시각 기준선4개를 수정하고 표준 포트에서 실패58건 전부 재검증했다. 합산291통과이며 단일 전체 green 실행으로 표현하지 않는다. 두 후보 사이 앱·패키지·스크립트 바이트는 동일하고 테스트만 다르다.
- 초기 clean worktree에 역사적 TOPIK 증적4개가 빠진 실패와, 잘못된 cwd로 Functions가 누락된 첫 Preview는 보존한다. 원본 증적 복사 후 전체 gate 통과, `apps/web` cwd에서 재배포하여 API JSON 연결·85개 배포 파일 HTTP 일치를 확인했다. 초기 `5d362292`는 출시 후보가 아니다.
- 최종 Preview의 활성 Chrome에서 ko/ja 각각 정상 종료1회·오디오 재생 표시·Network 기록 중 요청0 및 사용자 **최종 Preview에서 두 언어 모두 들림**을 확인했다. 고정 QA2계정×Chromium/WebKit의 실제 Preview29항목·최종 predeploy 통과. 운영 사후 HTTP178/178·인증proxy3항목·canonical392/392, Worker 버전/설정 불변을 확인했다. 운영 브라우저 추가 음성 검사는 사용자 브라우저 전환으로 중단했으며 Preview 증거와 구분한다.
- 증적: `.artifacts/operations/resume-modal-release-2026-10-14/`. Pages 복귀 대상은 직전 `4d0589d0`이며 UI 복귀에 D1 백업을 복원하지 않는다.
- 최종 운영 상태51통과/2경고/0실패, 운영 Worker smoke7/7 및 postdeploy gate 통과. 경고는 보존한 문서·설정 작업 트리와 기존 manifest 차이다. 배포 코드 push 완료와 아직 커밋하지 않은 문서·모델 설정 변경을 구분한다.

Production은 `92c6e58b-f01f-47c6-b1e5-9df9762d3ab8`이다. 위 2026-10-14 절은 과거 기록이며 아래는 2026-10-25 Pages-only 배포 후 원격 재조회 값이다.

| 항목 | 값 |
| --- | --- |
| D1 migration | `0000–0033` |
| Worker | `69cffaa1-996d-42a7-9080-13c526203e86` (maintenance off) |
| Pages | `https://92c6e58b.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`) |
| web source SHA | `6ecc203ddce31fe373ed17527dafad25f615463e` |
| Worker release SHA | `78ee09a5ddec3254454fe14f174c03e5051f90d0` |
| content source SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| manifest | `content-v3-d102868e3d43b9b3c1a4` |

D1 일반 테이블77개. Pages Production branch는 `main`, Git 작업 branch는 `feature/topik-product-expansion`. 문서·운영 정책 정리 커밋 `d7aae08`을 push했으며 runtime SHA `6ecc203`과 구분한다. 최종 local40통과/remote52통과, 각각 기존 manifest 경고1/실패0이다. 마지막 릴리스는 점검 off·background writer 복원·학습 저장 활성으로 종료했다.

## 구현된 제품

- JLPT N5–N1·TOPIK 1–6급, ko/ja/en UI. 네 메뉴: 오늘·학습·복습·기록.
- 지도·quick/daily 세션·중단/재개·서버 수락 기록·FSRS·개인 XP·메모·오프라인 대기 저장.
- V7 440문항/220레슨 + 별도 v3 160문항 공개. 기존 canonical·N3 정적120·TOPIK practice v2 300 보존, TOPIK owner420. [콘텐츠 감사](CONTENT_AUDIT.md).
- 사진 프로필·계정 테마/강조색·시간대별 알림·연간 기록. 인증 D1 사진 저장, R2 미사용.
- React/Vite PWA, Hono/OpenAPI Worker, Drizzle/D1, Web Push·Google OAuth.
- 음성 Google 우선·동일 언어 설치 음성 fallback, ko/ja만 허용. R2 금지·legacy410.

## 직전 페이스리프트 릴리스 검증 범위 (보존)

단위835·OpenAPI/typecheck/build/fresh0033 통과. 브라우저 최초289통과/30정책 제외/2실패 후 정확한 2건을 표준 포트에서 재검사해 통과했다. 합산291이며 단일 전체 green으로 표현하지 않는다. 최종 Preview32/32·PWA24/24, Preview495f752d 실제 Chrome ko/ja 종료·Network R2/legacy0·사용자 양언어 가청을 확인했다.

현 schema77표 backup/restore·predeploy 후 Pages-only 배포. 사후 canonical392/392·Worker smoke7/7·인증proxy3·HTTP89/89 통과. 운영 Chrome 종료/Network0과 사람 청취는 별개다. 증거: `.artifacts/operations/ui-facelift-release-2026-10-14/`. 이는 이번 문서 정리에서 새로 실행한 기능 테스트가 아니다.

## 남은 사항·복귀

- 지도 겹침 안내의 1회 모달과 세부 문자 반응형 개선은 각각 2026-10-14, 2026-10-25 배포에 포함됐다.
- Preview 재사용 일반 계정 2개 생성·재로그인 확인. Keychain 비밀 보관, DB salted hash, Production 가입 E2E 차단. [QA 계정 운영](QA_ACCOUNT_OPERATIONS.md).
- 운영 synthetic 36명 삭제 완료: 회원 38→2, 테스트 도메인 0. 새 0033/77표 backup/restore·FK0, OAuth 보충 포함 79표를 로컬 삭제 결과와 대조했다. 기존 Worker/Pages 유지·queue 복원·maintenance off·인증 proxy 3개 검사를 확인했다. 계정 정리 시점에는 UI 모달 미배포였고, 후속 `d694563` 배포에 포함됐다. 증적 `.artifacts/operations/qa-account-cleanup-2026-10-14/production-0033-backup-qa-cleanup-20261014-01/`.

- INC-DATA-024: HEAD와 운영 canonical manifest 차이. immutable content source를 고정해 검사하고 재시드로 경고를 숨기지 않는다.
- 실제 기기 푸시 수신·최신 UI 두 학습자 관찰은 사용자 유예 항목이며 자동 검사로 완료 처리하지 않는다.
- canonical 구 PWA 업데이트는 다른 앱 탭 때문에 보류한 기록이 있다. 사용자 탭/캐시를 임의 삭제하지 않는다.
- 이번 UI 복귀 Pages는 `1d102c82-5348-4e67-980f-db2d1d9ee558`이다. 현 Worker/D1/학습 기록을 유지하며 UI 문제에 DB 백업을 복원하지 않는다. 새 배포 전 실제 활성/복귀 버전을 다시 조회한다.

## 이번 유지보수

2026-10-25: 실제 배포 결과로 현재 안내를 갱신하고 과거 미배포 문구의 충돌을 수정했다. 미참조 빈 폴더2개·재생성 가능한 작업 폴더 build·OS 메타데이터를 해시 확인 후 휴지통으로 이동했다. 회귀 테스트·시각 기준·현재 테스트 결과·설계 원본·DB/릴리스 증거는 보존한다. 정리 대상과 복구 위치는 [정리 기록](REPOSITORY_MAINTENANCE_2026-10-14.md)의 2026-10-25 절에 기록한다.
