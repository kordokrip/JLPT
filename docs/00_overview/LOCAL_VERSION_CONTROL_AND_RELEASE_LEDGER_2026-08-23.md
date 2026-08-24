# 로컬 형상관리·릴리스 원장 — 2026-08-23

기준 시각: 2026-08-23 KST

이 문서는 GitHub 유료 CI/CD 기능에 의존하지 않고 JLPT·TOPIK의 형상, 검증, 배포와 rollback을 관리하는 운영 원장이다. 코드·테스트·Cloudflare 원격 결과와 다른 내용이 있으면 실제 명령의 종료 코드와 원격 deployment ID가 우선하며, 같은 변경에서 이 문서를 바로잡는다.

## GitHub 사용 범위

- 저장소: 공개 `kordokrip/JLPT`
- 용도: commit, branch, tag와 원격 백업
- GitHub Actions: 정책상 실행 금지 (`workflow_dispatch`는 문서 보관용 비상 호출만 허용)
- 자동 CI/CD, Actions artifact/cache, Actions 기반 Cloudflare 배포: 사용하지 않음
- `.github/workflows/ci.yml`: 실행 job을 `if: false`로 잠궜고, 배포·검증의 실질 근거는 로컬 MD 원장 사용
- Cloudflare 배포와 검증: 승인된 로컬 터미널에서만 실행

공개 저장소의 표준 GitHub-hosted runner는 공식 정책상 무료지만, 이 프로젝트는 형상관리와 릴리스 판정을 분리하기 위해 사용하지 않는다. GitHub 상태 badge나 workflow 결과를 릴리스 통과 증거로 사용하지 않는다.

## 로컬 형상관리 규칙

1. 변경 전에 `git status --short`, 현재 branch, HEAD와 원격 동기화 상태를 기록한다.
2. 사용자 변경을 reset, checkout, stash 또는 삭제하지 않는다.
3. 문서·코드·데이터·테스트를 하나의 원자적 commit으로 고정한다.
4. commit 후 `git show --check`, `git status --short`, `git rev-parse HEAD`를 기록한다.
5. 원격에는 검증된 commit과 명시적 tag만 push한다. 강제 push는 금지한다.
6. release tag는 `release/YYYY-MM-DD/<scope>` 형식을 사용한다.
7. 비밀값, `.env*`, D1 backup 원문, 실제 사용자 데이터와 Wrangler 인증 정보는 Git과 이 문서에 기록하지 않는다.

### GitHub 무료 계정 사용 원칙 (현재 운영 모드)

- 원격 Git은 최소 범위만 사용한다: **commit, branch, tag** 생성 및 `push` 동기화.
- PR, PR 기반 자동 검증, Actions 배포/배포 게이트는 사용하지 않는다.
- 로컬 형상기록이 최우선이다. 모든 release gate 결과(로그, 증거 경로, 배포 ID, rollback target)는 반드시 아래 항목에 md로 즉시 기록한다.
- Git 장애/권한 이슈가 있어 remote 반영이 지연되면, 로컬 원장에 `remote_sync_status: failed`로 남기고, 네트워크 복구 후 동일 SHA 기준으로 재동기화한다.

## 로컬 검증 순서

~~~sh
pnpm release:verify:audio-contract
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db verify:audio:provenance
pnpm docs:check
~~~

이후 Chromium·WebKit 영향 E2E를 실행한다. mock `onend`는 실제 가청 증거가 아니며, Preview URL에서 Chrome의 한국어·일본어 `real-page-onend`, 사용자 가청 확인과 `/api/v1/audio/`·R2 발음 요청 0건을 별도로 기록한다.

## 릴리스 기록 필드

각 릴리스는 다음 항목을 빠짐없이 남긴다.

| 항목 | 필수 값 |
| --- | --- |
| release | 날짜와 범위 |
| source | branch, 40자 Git SHA, tag |
| local gates | 각 명령의 종료 코드와 검사 개수 |
| audio | 한국어·일본어 callback, 가청 확인, R2/legacy 요청 수 |
| D1 | database, migration, manifest, backup, restore drill |
| Worker | 이전 version, 새 version/deployment, rollback version |
| Pages | 이전 production deployment, Preview deployment, 새 production deployment |
| smoke | Worker, auth proxy, Pages, remote DB/FK/FTS 결과 |
| status | draft, preview, published, rolled_back 중 하나 |

### 운영 설정 갱신(로컬-only SCM)

- SHA: `2fb05b321c33c8bd885703393ef82785c2012052`
- 범위: `.github/workflows/ci.yml` 실행 비활성화, CI/CD 회피 문서 추가
- 적용 내용: GitHub Actions 실질 게이트 배제 및 `GIT_FREE_MODE_OPERATING_MANUAL_2026-08-23.md` 원칙 반영

## 2026-08-23 음성 복구 릴리스

| 항목 | 현재 값 |
| --- | --- |
| release | `audio-recovery-2026-08-23` |
| source branch | `feature/topik-product-expansion` |
| 안전 복구 bundle ref | `4108edbd1f4c87b38963a904b1dd9d62ac9fcc2f`; 작업 유실 방지용, 정식 release SHA 아님 |
| 정식 source commit/tag | 1차 `a427af8c963660d9ebfdbec8c7cacf5e9858f749`; 익명 QA 후속 SHA/tag는 최종 gate 후 기록 |
| Actions | repository `enabled=false`; 자동 CI/CD 중단 |
| local gates | `verify:ci` exit `0`; Ops `18/18`, DB `112/112`, Web `90/90`, API `131/131`, fresh D1 완료 |
| browser gates | 전체 데스크톱·모바일·시각 E2E `171 passed / 32 skipped / 0 failed`; 익명 음성 QA 포함 영향 기능 `14/14`; 1차 Preview 실제 기능 `32 passed / 8 skipped / 0 failed` |
| Preview Worker | `48b49518-f374-4c59-a652-f73d136689f3`, release `a427af8...`, smoke `21/21` |
| Preview Pages | 유효 `7de4c852-82c1-4c24-a787-e504174702ea`; 잘못된 `367eb0f4-d336-4b63-8d3a-b073e7290ca8`은 Functions 누락으로 제외 |
| Production | 아직 회귀 Pages 유지; 새 deployment ID 없음 |
| status | `preview` |

배포가 진행될 때 이 표를 실제 commit, Preview/Production deployment ID, 음성 증적과 rollback 대상으로 갱신한다. 빈 값이나 `미확인`을 성공으로 해석하지 않는다.

## 2026-08-24 첫 클릭·PWA 추가 복구

| 항목 | 배포 전 값 |
| --- | --- |
| release | `audio-first-click-pwa-recovery-2026-08-24` |
| source branch | `feature/topik-product-expansion` |
| source commit/tag | gate 완료 후 고정 예정 |
| 변경 범위 | Pages web만 변경; D1 schema/data와 Worker 변경 없음 |
| 원인 | voice 준비 `await`로 사용자 활성화 소실 가능; 열린 설치형 PWA가 이전 JS 유지 |
| local gates | OpenAPI `72/12`, Ops `18/18`, DB `112/112`, Web `91/91`, API `131/131`, typecheck/build/fresh D1/content/audio contract 종료 코드 `0` |
| browser gates | 영향 Chromium/WebKit `40 passed / 2 skipped`; 전체 데스크톱·모바일·시각 `171 passed / 32 skipped`, 실패 `0` |
| actual Chrome before deploy | 현재 Production 일본어·한국어 `재생 중 → 정상 종료`, console error `0`; 물리 가청은 자동 판정하지 않음 |
| D1 safety | `.artifacts/d1-backups/audio-first-click-pwa-2026-08-24`; SHA-256 manifest와 `65` regular tables restore drill 통과 |
| rollback Pages | `485b9f00-a8b1-4bbb-9001-a238651fb212`, source `b8d41acb1cbd77da1a428ade0d07c27c910f84e3` |
| Preview/Production | 최종 deployment ID 대기 |
| status | `draft` |

배포 직전 source commit, 직전 Production Pages deployment, Preview와 새 Production deployment ID를 채운다. 배포 뒤 실제 Chrome lifecycle, 배포 asset, `/api/v1/audio/`와 R2 발음 요청 0건을 같은 행에 추가한다.

## 오류·rollback 연결

- 모든 오류와 배포 차단 조건: [오류·회귀 차단 원장](ERROR_LEDGER_2026-08-23.md)
- 음성 직접 원인과 실제 Chrome 판정: [TOPIK Google 음성 장애 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)
- 전체 Production 기준선: [현재 상태](CURRENT_STATE.md)
- 콘텐츠 증량과 G0–G4: [N2·N1·TOPIK 증량 릴리스](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)
