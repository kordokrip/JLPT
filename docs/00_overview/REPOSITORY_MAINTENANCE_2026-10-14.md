# 문서 통합·에이전트 비용 관리 — 2026-10-14

## 2026-10-25 후속 정리 — 배포 후 문서 동기화

사용자 요청에 따라 현재 문서와 폴더 안내를 정리했다. **`6ecc203`은 Preview 양언어 가청·배포 gate 후 Pages `92c6e58b`에 출시**했다. 정리 검증과 배포 검증은 구분한다. 최신 상태는 [CURRENT_STATE](CURRENT_STATE.md), 출시 검사는 [세부 UI 감사](DETAIL_UI_AUDIT_2026-10-25.md)에만 유지한다. 아래 2026-10-14 결과는 당시 이력이다.

- 현재 안내의 "모달 미배포" 충돌을 후속 배포 이력으로 바로잡고 README·문서 색인·변경/릴리스 원장·인수인계에서 새 후보로 연결했다. 역사적 실패/리뷰·출처 문서와 DB 직접 입력 원본은 삭제하지 않았다.
- 폴더 역할은 [PROJECT_INVENTORY](PROJECT_INVENTORY.md), 전체 추적 경로는 생성형 catalog로 통합한다. 앱 import·CLI·migration 경로를 꾸미기 위해 이동하지 않았다.
- 검증한 정리 대상: `apps/web/dist`(재빌드 산출물), `output/.DS_Store`(OS 메타데이터), `_design`, `guidelines`(빈 폴더). Git 추적 파일0·symlink0, 빈 폴더 확인, 이동 직전·직후 파일별 SHA-256 비교를 통과했다.
- 총 **7,068,326 bytes**를 `/Users/sunghokang/.Trash/JLPT-maintenance-20261025-uSHK73/`에 원래 상대 경로로 이동했다. 삭제는 복구 가능하며 영구 삭제하지 않았다. `apps/web/dist`는 `pnpm -F @nihongo-n3/web build`로 재생성할 수도 있다. 배포용 clean worktree와 봉인된 Preview 산출물은 건드리지 않았다.
- 회귀 테스트는 "테스트용 파일"이라는 이유로 지우지 않았다. 현재 `e2e/test-results`, 시각 기준선, `.artifacts`의 백업/실패/출판/복귀 증거, `.superdesign` 원본, `.wrangler` 로컬 D1, `node_modules`, 사용자 PPT와 환경 설정은 보존했다. 확증 없는 dead code 삭제는0건이다.
- 이동 명세·각 파일 hash·복구 상대 경로는 `.artifacts/operations/detail-ui-2026-10-25/cleanup-generated.json`에 보존한다. 복구할 때는 새 대상이 없는지 확인하고 명세의 각 경로만 되돌린다.
- 기존 미커밋 문서/모델 설정은 보존하며, 정리 때문에 앱 코드·DB·API·학습 기록을 변경하지 않았다. 문서 정리만으로 새 전체 앱 gate나 가청 확인을 반복하지 않는다.
- 정리 후 검증: catalog992경로·Markdown79파일·필수 운영 문서13개·퇴역7경로 부재·DB 직접 원본 참조36개 통과. `git diff --check` 통과, 시작/종료 ops는39통과/2기존 경고/실패0. 경고는 보존한 미커밋 변경과 알려진 manifest 차이다. 제한된 읽기 전용 독립 문서 대조에서 확인한 모달 배포 상태 모순1건을 수정했다.
- 출시 후 문서 후속 커밋 `d7aae08`에 기존에 준비된 운영 문서·역할 TOML을 함께 정리하고 push했다. TOML5파일/4역할 모델·effort와 위임 상한2를 재검증했다. 앱 source와 후속 문서/정책 변경을 분리하며 실제 실행 모델의 자동 전환을 입증한 것으로 표현하지 않는다. 최종 clean 상태에서 local40/remote52통과, 각각 기존 manifest 경고1/실패0이다.

## 범위와 기준

사용자 요청: 현재 문서 정리·불필요 파일 제거·기술 위험에 맞는 모델/테스트 재설정. 시작 Git clean, 기준 커밋 eae03f4a1475bf3a418604401ea5f39c8a16ce68. 이번 작업은 로컬 문서/에이전트 설정만이며 앱·DB·콘텐츠·음성·Production·push는 변경하지 않는다.

전체 Git 관리 Markdown79개를 경로/역할과 DB 직접 참조로 분류했다. 운영 안내는 현재화하고, 학습 원본·출처·날짜별 실패/출판 증거·시안 계약은 보존한다. 모든 문서를 의미 재검수했다거나 모든 코드를 dead-code 분석했다고 주장하지 않는다.

## 통합

- CURRENT_STATE는 현재 배포/미확인/복귀만, README와 코드 분석은 현재 기능/구조만 유지한다.
- docs 색인의 중복 미배포 문단, 오래된0030/0031 고정 안내와 미공개 후보 표를 제거/수정했다. 콘텐츠 감사·원본 지도·로드맵을 공개600문항/220레슨·schema0033과 정합화했다.
- runbook/CI/인수인계의 같은 릴리스 복사본을 제거하고 상세 원장으로 연결한다. 과거 오류/릴리스 본문과 실패 artifact는 삭제하지 않는다.
- 삭제된 중복 설명의 원문은 위 Git 기준 커밋에서 복구할 수 있다. DB가 읽는36개 직접 문서 참조와 적용된 migration은 보존한다.

## 모델·실행 정책

프로젝트 config와4역할 TOML: Terra medium 구현, Sol low 확정 문서, Luna low 정형 비교, Astra high 위험 검토. 기본 위임0~1개, 최대2개·재위임 금지. 전체 대화 대신 제한된 handoff. 스크립트로 가능한 작업은 LLM보다 스크립트 우선.

시작 읽기는 AGENTS+CURRENT_STATE. 개발 중 영향 검사, 최종 앱 배포 후보 전체 gate. 문서-only에는 DB/E2E/새 가청 확인을 요구하지 않는다. 독립 Astra 검토1개가 지적한 활성 flag/Preview 격리/명시 승인·clean SHA·실패 중단 조건을 복구했다.

공식 [Codex subagents 설정](https://learn.chatgpt.com/docs/agent-configuration/subagents)을 참조했다. 설정 파일은 후속 세션용이며 현재 세션 모델을 바꾸지 않는다. 전역 메인 모델은 프로젝트 희망 Astra와 다른 값이고, 로컬 CLI는 전역 catalog 필드 누락으로 시작 실패(INC-OPS-119). 전역 파일은 보존했으며 TOML 문법 통과를 실제 모델 활성화/가용성 검증으로 표현하지 않는다. 유료 모델 호출을 반복해 가용성을 시험하지 않았다.

## 정리 경계

앱의 미사용 코드라는 충분한 근거가 없는 파일, 기존 테스트/시각 기준, .wrangler, .artifacts 백업·복귀·실패 리뷰는 보존한다. 삭제량을 늘리기 위해 보호 자료를 제거하지 않는다.

`docs/.DS_Store`(8,196 bytes), `output/.DS_Store`(6,148 bytes)를 `/Users/sunghokang/.Trash/JLPT-maintenance-20261014.yLY62i/`의 `docs.DS_Store`, `output.DS_Store`로 이동했다. 두 파일은 Git 비관리 macOS 메타데이터이며 복원 가능하다. 모델 로딩 진단용 임시 빈 catalog는 실패 후 제거했고 실제 설정에서 참조하지 않는다.

## 검증

- 시작 ops:status:40통과/기존 manifest 경고1/실패0.
- 독립 검토:4역할 모델/effort·위임 상한·개발/배포 분리 확인, 안전조건3건 보완.
- Python3.11 TOML 검사:5파일·4역할 model/effort 정확 일치·하위 상한2 통과. 기본 python3는 tomllib 미지원으로 첫 검사 실패했고3.11로 재검사했다.
- `pnpm docs:catalog`/`pnpm docs:check`:982경로,77 Markdown·1,143 상대 링크, 필수13문서·퇴역7경로 부재·DB 직접36원본 참조 통과.
- `git diff --check`:통과. 앱/apps·packages·e2e·scripts·Actions 변경0. 원격 조회·전체 앱/DB/E2E·실제 모델 호출·배포·commit/push는 미실행이며 문서/config 변경의 통과 근거에 섞지 않았다.
- 종료 `pnpm ops:status`:39통과/경고2/실패0. 경고는 이번 미커밋 파일과 기존 manifest drift다.
- 시작 필수 읽기를 기존 운영 묶음 약1,700줄에서 AGENTS+CURRENT_STATE90줄로 제한했다. 토큰 절감률을 측정한 값은 아니다. 나머지는 작업에 필요한 문서만 읽는다.
- INC-DOC-120은 문서/독립 검토 완료. INC-OPS-119 전역 catalog 장애는 미해결이다. 설정 문법만 확인했으며 새 CLI 세션의 실제 모델 활성화를 완료했다고 주장하지 않는다.
