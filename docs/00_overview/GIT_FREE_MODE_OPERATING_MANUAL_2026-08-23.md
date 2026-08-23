# Git 무료 계정 운영 모드 — 2026-08-23

기준일: 2026-08-23 KST  
목적: GitHub 유료/CI/CD 자동화를 쓰지 않고도 복구·배포 트래킹을 끊김 없이 운영한다.

## 핵심 원칙

- GitHub는 현재 운영에서 **원격 상태 보존용 저장소**로만 사용한다.
- GitHub Actions, PR gate, 자동 배포 트리거를 사용하지 않는다.
- 모든 검증 명령, Smoke 결과, artifact 경로, deployment id, rollback 대상은 로컬 md 원장에 즉시 기록한다.
- `git` 관련 권한/연결 이슈가 발생해도 로컬 작업은 계속 진행한다.

## Git 실패 폴백 절차

`git` 명령이 권한 또는 네트워크로 실패하면 아래 절차로 전환한다.

1. 작업 브랜치에서 이어서 진행한다.
2. 변경 요약을 각 원장(md)에 즉시 기록한다.
3. 가능한 범위에서 로컬 commit은 허용되나, 원격 동기화는 보류한다.
4. 원격이 회복되면 동일 작업 범위를 기준으로 `git status`, `git log -1`, `git rev-parse HEAD`를 재확인하고 재푸시한다.
5. remote 동기화가 실패한 기간은 반드시 릴리스 원장에 `remote_sync_status: blocked`로 남긴다.

## 로컬 원장 필수 리스트

- `00_overview/LOCAL_VERSION_CONTROL_AND_RELEASE_LEDGER_2026-08-23.md`  
  - 릴리스 단위의 gate 결과, D1/Worker/Pages, rollback target, 최종 상태를 관리
- `00_overview/ERROR_LEDGER_2026-08-23.md`  
  - 실패·차단 원인과 조치 근거를 기록
- `00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md`  
  - 2026-08-23 증량 후보의 품질/배포 시퀀스 상태
- `00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md`  
  - 음성 회귀/복구 증적과 동일 언어 fallback 정책 검증
- `README.md`  
  - 운영 기준 링크와 최소 검증 명령의 기준점

## 금지 항목

- 자동화된 “CI 성공=배포 승인” 판단은 금지
- Actions 결과 화면을 문서보다 상위 근거로 사용 금지
- `/api/v1/audio/` 또는 R2 발음 경로를 배포 승인 근거로 사용 금지

## 최소 실행 루틴 (CI/CD 대체)

- `pnpm verify:ci`
- `pnpm docs:check`
- `pnpm -F @nihongo-n3/db question:quality`
- `pnpm -F @nihongo-n3/db content:contract:verify`
- `pnpm -F @nihongo-n3/db content:control-plane:verify`
- Chromium/WebKit E2E 핵심군
- `scripts/r1-preview-smoke.mjs` 또는 `release:verify:audio-predeploy` 결과를 증적에 첨부
