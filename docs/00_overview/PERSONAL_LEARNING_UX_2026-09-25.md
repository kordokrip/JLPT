# 개인 학습 UX · 빠른 레슨과 기록 기반 동기부여

기준일: 2026-09-25 KST. 이 문서는 이번 변경 후보의 시계열·계약·검증 경계를 기록한다. 현재 Production 기준선은 [현재 상태](CURRENT_STATE.md)와 [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.

## 시계열

| 시점 | 확인·변경 | 판정 |
| --- | --- | --- |
| 작업 시작 | 로컬 `pnpm ops:status` 40 pass/1 known manifest warning/0 fail, 작업 트리 clean, HEAD `785d38c` | 확인 |
| 회귀 분석 | 기존 `/logs/streak`는 `daily_logs`와 KST만 사용해 새 세션 제출이 빠질 수 있었다. Push cron 문구는 한국어 고정이고 KST 시각 두 개를 사용했다. | 코드 경로 교차 확인 |
| 구현 후보 | 빠른 레슨, 개인 XP·성취, 서버 수락 학습일 기준 스트릭, 언어·시간대별 알림, 새 D1 migration `0029–0030`을 작업 트리에 추가한다. | Production 미반영 |
| 원격 사전 조회 | `pnpm ops:status:remote` 49 pass/2 warn/2 fail. Git은 로컬 branch가 원격보다 한 커밋 앞서 있고, D1 R2 참조 조회는 Cloudflare API `7403`으로 실패했다. | 원격 검증 미완료 |
| 로컬 코드 검증 | 생성 OpenAPI 일치, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm docs:check`, `pnpm release:verify:audio-contract`, `git diff --check`가 exit 0. DB 백업 profile 타입 오류를 최초 타입 검사에서 발견해 수정한 뒤 재검사했다. | 로컬 통과, 최초 실패 보존 |
| fresh D1 | `pnpm -F @nihongo-n3/db verify:fresh` exit 0. `0000–0030` 적용, seed·manifest·FK/FTS·품질 원장·콘텐츠 release contract/control-plane 통과. | 로컬 통과, 원격 적용 아님 |
| 빠른 학습 브라우저 | 새 한국어 JLPT·일본어 TOPIK quick 시작→중단→재개→제출→스트릭/XP→기록 Chromium/WebKit 4/4 pass. | 격리 로컬 DB와 브라우저 증거 |
| 모바일 브라우저 | 같은 quick 흐름을 4개 엔진/뷰포트에서 재실행해 8/8 pass. 시작 버튼 44×44px 이상과 첫 화면 가로 넘침 0도 검사했다. | 격리 로컬 DB, 실제 원격 계정 증거 아님 |
| 전 급수·음성 자동 회귀 | JLPT N5–N1, TOPIK 1–6급 저장·재개 22건과 익명 음성 QA 2건, Chromium/WebKit 총 24/24 pass. | 음성 QA는 mock lifecycle; 물리 가청·새 Preview Network 아님 |
| 원격 재조회 | `pnpm ops:status:remote` 50 pass/2 warn/1 fail. 이전 D1 `7403`은 재현되지 않았고 남은 실패는 미push 로컬 SHA와 원격 branch 차이. | 읽기 전용 통과 범위만 인정, Preview 검증은 아님 |
| 교차검토 보강 | Push 구독 endpoint를 다른 계정이 재등록해 기존 소유자의 언어/알림 설정을 바꾸는 결함을 fail-first `1 fail`로 재현했다. 소유자가 다르면 409를 반환하도록 수정했다. API 전체 `190/190`, 재타입검사·API dry-run build exit 0. | 로컬 회귀 통과 |

## 제품 계약

- `오늘`에서 열린 세션 재개를 우선하고, 새 세션에는 `quick`(목표 3–5분) 또는 기존 `daily`를 선택한다. 둘 다 사용자의 목표 급수와 공개 콘텐츠만 사용한다.
- `POST /api/v1/study/sessions`의 선택적 `mode` 기본값은 `daily`다. 기존 `request_id` 재전송과 하나의 열린 세션 규칙을 유지한다.
- 스트릭은 트랙별 수락된 학습 행동을 프로필 시간대로 날짜화하고, 과거 `daily_logs` 날짜를 보존한다. 조회·해설 열람·음성만으로 학습일을 만들지 않는다.
- XP는 초기에는 안내 세션의 수락된 단계에만 부여한다. learn 5, review 3, 최초 practice 3, retry 1이며 하루·트랙별 100 XP 상한이다. XP는 시험 급수 또는 실력 판정이 아니다. 서버에 확정 결과가 저장되는 기존 자유 퀴즈·FSRS·TOPIK owner는 스트릭에 포함하지만, TOPIK 자유 practice의 클라이언트 activity만으로는 확정 학습일을 만들지 않는다. XP 범위는 화면과 API에 명시한다.
- 알림은 opt-in 상태를 존중하고 선택한 UI 언어·프로필 시간대·오늘 학습 여부를 반영한다. 발음 경로는 변경하지 않으며 Google 우선 같은 언어 브라우저 음성, R2 발음 금지 계약을 유지한다.

## 배포 게이트와 현재 증거

| 게이트 | 요구 | 현재 |
| --- | --- | --- |
| 로컬 | 0028→0029→0030 upgrade, fresh D1, FK, 백업 profile 72개, API/Web/DB 테스트, OpenAPI·typecheck·build | 명령 종료 코드 0. 전용 upgrade/profile 테스트 통과 |
| 브라우저 | 양 트랙·전 급수, quick→제출→재개→기록, Chromium/WebKit 모바일, 일본어 문구·접근성 | 최종 양언어 quick 4엔진 8/8, 전 급수 기존 저장·재개+음성 mock 24/24. 전체 앱 E2E·스크린리더 실기 전수는 미실행 |
| 음성 | 실제 한국어·일본어 재생, R2/legacy 요청 0, 같은 배포 후보의 사람 가청 | 미실행 |
| Preview | 전용 D1 migration, 기존 사용자·콘텐츠 보존, 실제 로그인 및 smoke | 미실행 |
| Production | 현 세션 승인 범위, 최신 D1 backup/restore, 이전 Worker/Pages ID, predeploy 통과, 사후 smoke | 미실행 |

테스트가 실패하거나 원격 D1 접근 권한이 재발하면 Production은 기존 릴리스로 유지한다. 과거 음성 가청·Preview 테스트를 새 후보의 통과 증거로 옮기지 않는다.
