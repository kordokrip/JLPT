# 로컬 형상관리·릴리스 원장 — 2026-08-23

기준 시각: 2026-08-23 KST

이 문서는 GitHub 유료 CI/CD 기능에 의존하지 않고 JLPT·TOPIK의 형상, 검증, 배포와 rollback을 관리하는 운영 원장이다. 코드·테스트·Cloudflare 원격 결과와 다른 내용이 있으면 실제 명령의 종료 코드와 원격 deployment ID가 우선하며, 같은 변경에서 이 문서를 바로잡는다.

## GitHub 사용 범위

- 저장소: 공개 `kordokrip/JLPT`
- 용도: commit, branch, tag와 원격 백업
- GitHub Actions: 저장소 수준 `enabled=false`
- 자동 CI/CD, Actions artifact/cache, Actions 기반 Cloudflare 배포: 사용하지 않음
- `.github/workflows/ci.yml`: 자동 trigger를 제거하고 `workflow_dispatch`만 남긴 비상용 절차. 저장소 Actions가 비활성화되어 현재 실행되지 않음
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

## 오류·rollback 연결

- 모든 오류와 배포 차단 조건: [오류·회귀 차단 원장](ERROR_LEDGER_2026-08-23.md)
- 음성 직접 원인과 실제 Chrome 판정: [TOPIK Google 음성 장애 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)
- 전체 Production 기준선: [현재 상태](CURRENT_STATE.md)
- 콘텐츠 증량과 G0–G4: [N2·N1·TOPIK 증량 릴리스](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)
