# Runbook: JLPT · TOPIK 운영관리, 버그 및 릴리스 추적

**Owner:** Project Operations Steward Sub Agent

**Frequency:** 작업 시작·종료, 버그 수정, 리팩터링, Preview/Production 전후, 주 1회

**Last Updated:** 2026-09-06 KST

**Last Run:** 이 관리체계 도입 검증은 아래 History에 기록

## 목적

코드·문서·D1·Worker·Pages가 서로 다른 상태로 보고되는 일을 막고, 버그 수정과 리팩터링이 기존 학습·FSRS·음성 계약을 훼손하지 않게 관리합니다. GitHub Actions 대신 로컬 gate와 Cloudflare read-only 상태를 추적하며 Production 변경에는 기존 명시적 승인 절차를 유지합니다.

현재 Production 값의 단일 기준은 [현재 상태](CURRENT_STATE.md)입니다. 이 문서는 절차를, [오류 원장](ERROR_LEDGER.md)은 버그 상태를, [로컬 CI/CD 기준](LOCAL_CICD_OPERATIONS.md)은 gate를, [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)은 실행 이력을 관리합니다.

## 책임 구조

| 역할 | 책임 | 금지 |
| --- | --- | --- |
| Project Operations Steward | 기준 문서 선독, 상태 감사, 버그/리팩터링 gate, CI/CD 증적과 drift 추적 | 승인 없는 Production write/deploy |
| Feature Engineer | 최소 변경, 회귀 테스트, 데이터/API 호환성 유지 | 오류 원장 없이 재현된 결함을 완료 처리 |
| Content Release Steward | source/reviewer/quality, D1/Preview/backup/rollback gate | draft·실패 artifact 공개 |
| 사용자 | Production 승인, 실제 장치의 물리 가청 등 사람이 판정해야 하는 최종 확인 | 자동화 결과를 사람 확인으로 대체하지 않음 |

전담 Sub Agent의 영구 지침은 `AGENTS.md`와 `.codex/skills/project-operations-steward`에 있습니다.

## 필수 선행 문서

1. `AGENTS.md`
2. `docs/README.md`
3. `CURRENT_STATE.md`
4. `ERROR_LEDGER.md`
5. 이 runbook
6. `LOCAL_CICD_OPERATIONS.md`
7. `LOCAL_RELEASE_LEDGER.md`
8. `SUB_AGENT_HANDOFF.md`
9. 작업 관련 schema, route, source, test

콘텐츠 변경일 때만 `CONTENT_AUDIT.md`, `00_source_map.md`, `CONTENT_SOURCE_REGISTRY.md`와 source/quality/release 스킬을 추가로 읽습니다.

## 작업 시작 절차

```bash
pnpm ops:status
git status --short
git log -1 --oneline
```

**Expected result:** 필수 문서·운영 스크립트·Actions 비활성·오디오 계약이 통과하고, 알려진 `INC-DATA-024`와 의도한 작업 트리 변경만 warning으로 나타납니다. JSON 증적은 `.artifacts/operations/`에 저장됩니다.

**If it fails:** 제품 코드를 수정하기 전에 누락 문서, 현재 상태 불일치, Actions 활성화 또는 오디오 계약 위반부터 복구합니다. dirty worktree는 사용자 변경인지 확인하며 되돌리지 않습니다.

## 버그 관리 절차

1. 실제 증상, URL/route, 사용자 영향, 발생 시각과 재현 단계를 수집합니다.
2. `ERROR_LEDGER`에 `INC-<영역>-<번호>`를 추가하고 상태를 `open`으로 기록합니다.
3. 실패하는 최소 회귀 테스트를 먼저 추가합니다. mock, 실제 브라우저, 사람 확인을 구분합니다.
4. root cause를 코드·schema·network·배포 asset 중 두 경로 이상으로 교차검증합니다.
5. 최소 수정 후 단위 → 영향 E2E → 전체 관련 gate 순서로 실행합니다.
6. Preview와 실제 배포 URL에서 재현이 사라졌을 때만 `fixed`, Production 사후 검증 뒤 `closed`로 전환합니다.
7. `CURRENT_STATE`, 오류 원장, 관련 incident 문서와 릴리스 원장을 같은 커밋에서 갱신합니다.

복습 회귀에서는 로딩 중 skip, 기기/서버 시각 차이, 3D 카드의 숨긴 면 접근성, 포커스된 발음·평가 버튼의 기본 키보드 동작을 함께 확인합니다. 숨긴 뒷면을 누른 테스트 오류와 실제 음성 엔진 오류는 같은 원인으로 보고하지 않습니다. 최초 실패 로그와 수정 후 결과를 모두 보존합니다.

설정 저장에서는 서버 프로필 조회 중/오류와 확인된 미설정 상태를 구분합니다. 화면만 바뀌었다고 서버 저장 성공으로 판단하지 않고 PUT·독립 GET·reload를 대조합니다. 응답이 늦어도 요청 당시 계정·트랙의 cache에만 저장하며 다른 계정의 로컬 설정을 덮지 않아야 합니다. 기능 플래그 false의 기존 로컬 설정도 검사합니다. 기존 사용자 보존은 빈 테이블 비교로 끝내지 않고 양 트랙 설정·FSRS·진행률·일지·퀴즈·활동이 들어 있는 upgrade fixture를 검사합니다. 운영 backup export는 query 중단이 가능하므로 maintenance 승인 없이 강제 옵션을 사용하지 않습니다.

실제 Chrome의 연결 탭에 network API가 없으면 native Chrome 앱에서 작업용 Preview 탭을 선택하고 DevTools Network의 All·recording 상태로 새로고침→양언어 정상 종료를 관측합니다. Sanitized HAR를 ignored `.artifacts/operations`에 저장하고 UI 요청 수와 HAR 차이(확장 리소스 등), Console 경고/오류를 분리합니다. 다른 탭의 개인 정보·인증 내용을 증적으로 수집하지 않습니다. 사람 가청 답변은 질문의 URL·배포·source에만 연결합니다.

심각도는 `P0 학습 불가/데이터 손상`, `P1 핵심 기능 회귀`, `P2 일부 흐름 오류`, `P3 문서·운영도구 drift`로 분류합니다. P0/P1은 신규 콘텐츠와 구조 리팩터링보다 먼저 처리합니다.

## 리팩터링 관리 절차

1. 변경 전 API request/response, DB migration/FK, stable content ref, progress/FSRS transaction, 음성 정책을 계약으로 목록화합니다.
2. 동작 변경과 구조 변경을 한 커밋에 섞지 않습니다.
3. 호출자와 dead code는 `rg` 및 테스트로 교차확인합니다. 참조가 없다는 사실만으로 migration·rollback·evidence 파일을 삭제하지 않습니다.
4. 기존 테스트를 약화하지 않고 새 경계 테스트를 추가합니다.
5. `pnpm verify:ci`와 관련 Chromium/WebKit E2E를 통과시킨 뒤 문서를 동기화합니다.

## 로컬 CI 대체 gate

학습 UX 후보의 추가 계약은 [학습 경험 구현 계획](LEARNING_EXPERIENCE_PLAN.md)을 따른다. 공개 콘텐츠 재시드 없이 `0028`만 additive 적용하고, 해설 조회/완료/정답/FSRS rating을 각각 검사한다. 메모 충돌·응답 저장 실패·오프라인 pending을 성공으로 집계하지 않는다. 철회된 콘텐츠는 세션 snapshot에서 재노출하지 않고 명시적으로 `abandoned` 종료하여 기존 기록을 보존한다.

기기 간 충돌은 서버의 수락 기록을 우선하며 미수락 로컬 답/메모를 보존한다. `expected_track`이 인증 트랙과 다르면 409로 멈추고 명시적 reload를 안내한다. terminal 세션의 상태는 SQL 실행 시점에도 보호한다. 백업은 0027/65와 0028/70 profile을 구분하며 새 5개 테이블 누락을 허용하지 않는다(`INC-DATA-047`). Cloudflare 진단의 계정 식별자는 URL과 중첩 JSON/stderr 모두에서 가린다.

`d1:backup`은 실제 원격 schema를 export 전과 manifest 확정 전에 비교한다. `d1:restore-drill`의 `passed=true`만 읽지 말고 `schemaProfile`, `localSchemaProfile`, `coversLocalSchema`, `omittedTableCounts`도 확인한다. 구 65개 backup을 0028에 복원하면 새 다섯 테이블은 0행이어야 하고 `coversLocalSchema=false`다. `_cf_METADATA`는 확인된 Miniflare 생성 metadata만 제외하며 임의의 `_cf_*` 앱 테이블은 제외하지 않는다. 기존 blue/green transfer·사용자 정리 도구의 기본 65-table 계약은 이번에 변경하지 않았으므로 0028 학습 기록을 다루는 작업에는 사용하지 않는다. 해당 도구는 별도 upgrade 검증 후 사용한다.

실제 Chrome의 로컬 주소 접근 제한은 우회하지 않는다. 양언어 정상 종료·사용자 청취·Network 증거는 정확한 Preview별로 관리한다. a95437fc의 사용자 답변을 최신555fc0c4 확인으로 옮기지 않는다. 탭 연결을 복구해 onend를 확인했더라도 native Network 수집이 실패하면 요청 수는 미확인으로 남긴다. 음성 증거에는 Pages 배포 ID/source, lifecycle, 사람의 확인, network 관측 여부를 분리한다. 실제 Chrome 전체 network capture가 없으면 자동 mock E2E의 요청 0건으로 대신 채우지 않는다. 사용자 가청 확인을 Production 승인으로 해석하지 않는다.

원격 Preview에서만 나타나는 성능 회귀도 gate 실패다. `INC-PERF-049`처럼 성공 응답이 늦어 학습 시작 검사가 실패하면 실제 API 소요 시간과 직렬 DB 호출을 대조하고, 요청 수 회귀 테스트·최적화·동일 Preview 재측정을 수행한다. timeout 확대만으로 실패를 지우지 않는다. API만 바꾼 재검증에서는 Worker의 새 source와 유지한 Pages source를 각각 기록한다.

SRS 검증은 기기 시계가 서버보다 느린 조건도 포함한다(`INC-SRS-051`). 서버due의 정확한 스냅샷 권위와 로컬 평가 우선 보존을 검사하고, 클라이언트 표시를 맞추려고 FSRS날짜를 덮지 않는다. 늦은 응답의 적용은 IDB transaction에서 비교한다. mock 화면 테스트는 route가 실제 호출됐는지 검사하며 필요시 해당 mock 파일만 SW를 차단한다. 실제 학습·PWA 테스트나 음성 검사 전체에서 SW를 비활성화하지 않는다(`INC-QA-052`).

```bash
pnpm ops:verify
```

`ops:verify`는 `ops:status → verify:ci`를 실행합니다. `verify:ci`의 fresh D1 단계가 음성 provenance와 content contract/control plane을 포함하므로 같은 검사를 다시 실행하지 않습니다. `ready|unavailable` binding을 모두 허용하되 unavailable 사유는 필수입니다. 이후 변경 표면의 Chromium/WebKit E2E를 실행합니다. 콘텐츠 변경이면 source intake, 두 reviewer, question quality와 G0–G4를 추가합니다.

## 원격 read-only 관찰

```bash
pnpm ops:status:remote
```

다음을 조회하고 `.artifacts/operations/history/`에 timestamp JSON을 남깁니다.

- local HEAD와 origin branch
- 현재 Production Pages deployment/source
- Worker 100% traffic version
- D1 migration `0027` 도달 여부
- canonical Pages, `/audio-qa`, legacy audio `410`
- auth proxy의 HTTP 200, JSON content-type, `google_enabled=true`, `auth_mode=app-session`
- 원격 R2 발음 참조 `0`

`INC-DATA-024`가 열려 있는 동안 current HEAD 기반 `verify:remote`는 Production 정상 판정에 사용하지 않습니다. 위험한 `verify:remote:audio` 별칭도 fail-closed로 유지합니다. 콘텐츠 검증은 immutable release source SHA, manifest와 실제 seed run을 명시해야 하며 `verify:remote:audio:r2`는 R2 참조 0건만 검사합니다.

## Preview OAuth 설정 관리

운영 OAuth와 별도 `JLPT Preview` client를 사용합니다. Preview callback은 `https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/api/v1/auth/google/callback`, APP_ORIGIN은 branch alias `https://feature-topik-product-expans.nihongo-n3.pages.dev`입니다. 실제 SSO는 alias에서 시작·종료하며 immutable Pages와 host-only 세션 쿠키를 공유한다고 가정하지 않습니다. 로그인 시작의 `jlpt-ja|topik-ko` 선택은 서버 active track을 갱신하는 계약이고 기존 기록 삭제와 다릅니다.

클라이언트 생성/자격 증명 반출/등록의 명시 승인 및 정확한 전용 callback을 확인합니다. secret은 Preview Worker에만 등록하며 값은 출력·문서·Git에 기록하지 않습니다. secret-only 후보는 `versions secret bulk`로 먼저 만들고 이전 버전의 script etag/runtime/기타 binding을 대조한 뒤 활성화합니다. `versions deploy`의 non-versioned settings 동기화도 별도 관찰합니다. CLI는 반드시 apps/api cwd의 `--config wrangler.toml --env topik-preview`를 명시합니다. 상위 wrangler.jsonc 자동 탐색이나 운영 .dev.vars 복사에 의존하지 않습니다.

config=true/start302, 실제 Google callback→홈 재조회, 같은 계정 양 트랙 재로그인과 D1 연결 보존을 별도 gate로 기록합니다. 비어 있는 실제 QA 계정 비교는 비어 있지 않은 기존 학습 이력 보존 증거가 아닙니다. 현재 결과/버전은 릴리스 원장을 따릅니다.

## Production 릴리스

Production은 사용자가 현재 세션에서 명시적으로 승인했을 때만 다음 순서로 실행합니다.

```text
clean source commit/tag
→ local full gate
→ Preview와 실제 브라우저
→ D1 backup/checksum/restore drill
→ rollback Worker/Pages 기록
→ production-predeploy gate
→ 승인된 D1/Worker/Pages 변경
→ remote verifier/smoke/E2E
→ 문서 원장과 원격 Git 동기화
```

하나라도 실패하면 다음 단계로 진행하지 않습니다. Pages-only 변경은 D1 drift를 숨기기 위해 재시드하지 않습니다. 데이터 손상이 없으면 D1 전체 restore를 실행하지 않습니다. 운영 export는 테이블별 추출이므로 명시 승인한 점검 시간 동안 쓰기가 정지됐는지 확인합니다. HTTP read-only만으로 queue/workflow 정지를 가정하지 말고 활성 작업을 별도 확인합니다. 이번0028-only upgrade는 원격 pending이0028 하나인지 먼저 검사합니다. 새65-table backup의 local0028 drill은 coversLocalSchema=false이며 새70-table backup으로 표시하지 않습니다.

## 음성 불변 조건

- 같은 언어 Google 브라우저 음성 우선, 없으면 같은 언어 설치 음성
- 한국어 `ko-*`, 일본어 `ja-*`
- click task 안에서 즉시 `speak()`
- 성공은 실제 `onend` 이후 기록
- R2 발음 수집·생성·저장·조회·재생·fallback 0
- legacy `/api/v1/audio/*` `410 Gone`

## 파일 보존과 정리

### 반드시 보존

- `packages/db/drizzle-v2` migration 전체
- `.artifacts/d1-backups/audio-first-click-pwa-2026-08-24`
- `.artifacts/releases/audio-first-click-pwa-2026-08-24`
- `.artifacts/release/2026-08-19`
- `.artifacts/content-intake`, `.artifacts/content-quality`
- `.artifacts/recovery/audio-2026-08-23`
- 음성, R2 차단, FSRS, release-control 회귀 테스트

이 artifact는 비밀·사용자 데이터가 포함될 수 있으므로 Git에 넣지 않습니다. 보존 경로와 checksum만 원장에 기록합니다.

### 재생성 가능하여 정리 가능

- `.DS_Store`
- `dist`, `playwright-report`, `test-results`
- 목적을 다한 임시 `.wrangler` cache
- 최종 증적이 별도로 보존된 30일 초과 중복 CI trace

정리 전 `git ls-files`, 참조 검색, 크기와 최신 release 의존성을 확인합니다. Production backup, rollback, recovery bundle은 일반 cache 정리에 포함하지 않습니다.

## Troubleshooting

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `ops:status` 문서 불일치 | 현재 값이 여러 문서에 중복되거나 stale | `CURRENT_STATE`를 기준으로 README/분석/로드맵 역할을 분리 |
| current HEAD remote verifier 45건 실패 | repository-managed source hash drift | `INC-DATA-024` 확인, release-source-pinned verifier 사용, 임의 재시드 금지 |
| Pages source가 문서와 다름 | 잘못된 branch/cwd 배포 또는 stale PWA | Production deployment 목록, Functions 포함, asset와 실제 Chrome 확인 |
| 음성 mock은 통과하지만 무음 | user activation, voice fallback, stale service worker | 실제 Chrome lifecycle, 같은 언어 voice, 첫 click, PWA controller 교체 확인 |
| 원격 명령 인증/DNS 실패 | 실행 환경 또는 Cloudflare 인증 문제 | `blocked`로 기록하고 통과 처리하지 않음; 로컬 작업과 증적은 보존 |

## History

| 날짜 | 실행자 | 결과 |
| --- | --- | --- |
| 2026-08-24 | Project Operations Steward | 전담 Sub Agent/상태 점검 스크립트 도입. local `37/2/0`, remote read-only `47/2/0`, 전체 gate exit `0`. 문서별 production ID, auth JSON 계약, 로컬 복구 증적, 음성 provenance와 R2 0건을 구조적으로 검사. 독립 재감사 결과 commit 차단 결함 `0` |
