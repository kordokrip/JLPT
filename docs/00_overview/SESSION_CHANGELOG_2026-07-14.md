# 기술부채 리팩토링 세션 변경 기록

분석 시작: 2026-07-14 KST
구현·재검증: 2026-07-15 KST
브랜치: `refactor/tech-debt-r1`
배포: 실행하지 않음

## 1. 작업 격리

검수되지 않은 N2/N1 변경은 `wip/n2-n1-content-2026-07-14`에 commit `1ae2401`로 보존했다. R1은 이전 정상 HEAD에서 별도 branch로 시작했다. 누락된 N2/N1 원본을 생성됐다고 가정하지 않았고 `AUTO`/`EN` 자료를 운영 seed에 넣지 않았다.

## 2. R1 변경

### D1

- `packages/db/drizzle-v2/0000`~`0006` 추가
- Drizzle 일반 table과 FTS SQL migration 소유권 분리
- runtime OAuth DDL 제거
- source manifest row/checksum 검증 추가
- category 선행 seed, parser 의미 헤더/빈 뜻 검증 추가
- validation-only `seed-diff`로 변경
- Blue/Green, backup, restore drill, migration guard 도구 추가
- read-only cutover middleware 추가

### API 계약·인증

- auth/track route OpenAPI 명세 추가
- public/admin OpenAPI 분리와 generated types 추가
- runtime route coverage 테스트 추가
- Google OAuth state에 learning track 저장
- cross-origin bridge token callback 통합 테스트 추가
- admin OpenAPI 보호 테스트 추가
- app-session / cf-access guardrail 테스트 유지

### CI·관측성

- `Required Verification` workflow 추가
- content push의 자동 production migration/seed 제거
- production 변경은 workflow_dispatch + Environment approval로 제한
- E2E D1을 독립 persist directory에서 migrate/seed/verify
- PII 없는 JSON request/release log 추가

## 3. R2 변경

- 공개 audio route를 R2 read-only로 전환
- R2 -> Japanese browser fallback 정책 통합
- Google 전체 batch approval gate 추가
- content/provider/model/version hash immutable key 추가
- 30문장 QA에 Google 후보 및 평가 저장 추가
- kana v2 script를 `문자。대표 단어` 한 번 재생으로 변경
- 동음이의어 public 노출 보류
- 코드·콘텐츠·오디오·시각 자산 attribution 분리
- 52주 기본 과정과 16주 추천 조건 구현

실제 Google batch와 R2 업로드는 실행하지 않았다. fresh DB 기준 `audio_r2_key` 4,954건이 비어 있다.

## 4. R3 foundation 변경

- `LearningTrackId = 'jlpt-ja' | 'topik-ko'`
- users/oauth_states track migration
- track status API
- 첫 접속 학습 언어 선택
- TOPIK foundation-only route
- user×track IndexedDB, localStorage, React Query namespace
- track switch API와 session restore
- Chromium account×track isolation E2E

TOPIK 문제은행·채점·추천은 구현하지 않았다.

## 5. 검증 기록

| 명령/검사 | 결과 |
| --- | --- |
| package typecheck 5종 | PASS |
| API test | 78 PASS |
| Web test | 33 PASS |
| API Wrangler dry-run | PASS |
| Web PWA build | PASS |
| dependency audit high | 0 known vulnerabilities |
| fresh D1 migrate | 7/7 PASS |
| manifest/checksum/row | 13 sources PASS |
| FTS parity | vocab 3,300 / sentences 1,112 PASS |
| FK/required/duplicate | 0 PASS |
| Playwright Chromium | 65 PASS |
| Playwright WebKit | 51 PASS, Chromium 전용 시각 회귀 14 SKIP |
| `pnpm verify:ci` | PASS |
| R2 audio strict gate | EXPECTED FAIL, 4,954 missing만 blocking |
| GitHub required Actions | BLOCKED pending billing resolution |

## 6. 구현 중 발견해 추가 수정한 회귀

1. session user query가 `learning_track`을 반환하지 않아 새로고침 시 JLPT로 되돌아갈 수 있던 문제
2. CI E2E에서 Google test credentials가 없어 OAuth start가 503이 되던 문제
3. E2E가 기존 `.wrangler` DB에 의존해 migration ledger 충돌이 나던 문제
4. 위험한 partial diff seed가 source column이 없는 table을 삭제하려던 문제
5. Wrangler 일반 vars에 secret 성격의 빈 키가 남아 있던 문제
6. OpenAPI production server URL과 16주 summary가 현재 기준과 다르던 문제
7. 청해 API가 `audio_r2_key`가 없어도 존재하지 않는 legacy R2 경로를 만들어 페이지 로드 404를 발생시키던 문제
8. E2E가 현재 12개월/52주 과정과 R2-first 정책 대신 과거 16주/browser-first 문구를 요구하던 문제
9. 관측 로그가 route template이 아닌 실제 path를 기록해 path parameter를 노출할 수 있던 문제

## 7. 원격 CI 확인

2026-07-15 KST에 `gh`로 최근 원격 실행을 읽기 전용 확인했다. Backup run `29348512843`과 CodeQL run `29226573527`은 runner step이 하나도 시작되지 않았고 `The job was not started because your account is locked due to a billing issue.` annotation으로 실패했다. Dependency Audit workflow는 `disabled_manually` 상태였다.

## 8. 배포 결정

production 배포를 수행하지 않았다. 로컬 Chromium/WebKit matrix는 통과했지만 GitHub billing lock, 원격 required Actions, prod-v2, R2 audio gate가 충족되지 않았기 때문이다. 다음 세션은 [Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)의 승인 조건에서 재개한다.
