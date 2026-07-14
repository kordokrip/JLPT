# JLPT 워크스페이스 통합 분석 보고서

기준일: 2026-07-15 KST
기준 브랜치: `refactor/tech-debt-r1`
기준 HEAD: `d88cb88`에서 시작한 미배포 작업 트리

## 1. 결론

이 저장소는 React/Vite PWA, Cloudflare Workers API, D1, R2, 공유 계약, Markdown 콘텐츠, Playwright, GitHub Actions를 포함하는 pnpm 모노레포다. 운영 중심은 계속 JLPT N5~N3이며 N2/N1 자료와 TOPIK 문제은행은 운영 콘텐츠가 아니다.

2026-07-15 리팩토링은 기능 추가보다 다음 기반을 먼저 정상화했다.

1. D1 스키마를 `packages/db/drizzle-v2`의 7개 migration ledger로 수렴했다.
2. 런타임 DDL과 위험한 diff seed를 제거하고 fresh migrate/seed/verify를 CI 관문으로 만들었다.
3. 공개 52 paths/56 operations, 관리자 7 paths/8 operations의 OpenAPI 명세와 생성 타입을 만들었다.
4. 앱 세션, Google OAuth bridge, Cloudflare Access 모드, read-only cutover를 독립 테스트했다.
5. R2 고정 오디오 우선 정책과 승인된 Google 배치 경로를 코드화했다.
6. `LearningTrackId`와 사용자×트랙 로컬 namespace를 도입하고 TOPIK foundation 화면만 열었다.

현재 production 배포 판정은 **HOLD**다. 이유는 GitHub billing lock 해제와 필수 Actions 성공이 확인되지 않았고, 새 `nihongo-n3-prod-v2` 생성·이전·승인 절차를 실행하지 않았으며, R2 오디오 키 4,954건이 비어 있기 때문이다.

## 2. 검증 스냅샷

| 항목 | 2026-07-15 결과 | 판정 |
| --- | ---: | --- |
| 패키지 타입 검사 | web/api/db/shared/content 통과 | 정적 관문 통과 |
| API 통합 테스트 | 3 files, 78 tests 통과 | 실행 관문 통과 |
| Web 단위 테스트 | 11 files, 33 tests 통과 | 실행 관문 통과 |
| Web/API build | Vite PWA, Wrangler dry-run 통과 | 빌드 관문 통과 |
| Dependency audit | 알려진 high 이상 취약점 0 | 감사 통과 |
| fresh D1 migrations | 7/7 적용 | ledger 검증 통과 |
| seed manifest | 13 sources, checksum·row count 일치 | 데이터 관문 통과 |
| 적재량 | vocab 3,300 / grammar 316 / kanji 542 / sentences 1,112 / sysprog 82 / curriculum 52 | N5~N3 기준 |
| FTS | vocab 3,300 / sentences 1,112 parity | 검색 인덱스 통과 |
| OpenAPI | public 52 paths, admin 7 paths | route coverage 통과 |
| 브라우저 회귀 | Chromium 65/65, WebKit 51/51 통과(시각 회귀 14건은 Chromium 전용으로 skip) | 로컬 browser matrix 통과 |
| R2 audio | `audio_r2_key` 4,954건 누락 | R2 릴리스 차단 |
| GitHub required checks | billing lock 해제·원격 성공 미확인 | production 차단 |

## 3. 실제 아키텍처

```text
apps/web        React 18 + Vite + PWA + Dexie + TanStack Query
apps/api        Hono/OpenAPIHono Cloudflare Worker
packages/db     Drizzle schema + D1 migrations + seed/verify/transfer tools
packages/shared API schema, DTO normalizer, FSRS, audio/study policy
packages/content docs metadata
docs            N5~N3 콘텐츠와 운영 문서
e2e             Chromium/WebKit Playwright 회귀
.github         검증, 보안 감사, 백업, 수동 배포 workflow
```

데이터 변경 흐름은 `docs -> parser -> content manifest -> canonical migrations -> D1 -> API -> generated contract -> Web/IDB` 순서다. production D1을 문서 변경만으로 자동 수정하는 경로는 제거했다.

## 4. A-Z 상태표

| 영역 | 상태 | 근거 | 남은 조치 |
| --- | --- | --- | --- |
| Architecture | 검증 | 모노레포 경계와 소유권 분리 | ADR 인덱스 추가 |
| Backend | 검증 | 78 API tests, Wrangler dry-run | preview smoke 전체 실행 |
| Content | 부분 | N5~N3 13 source manifest | provenance/오디오 완성 |
| D1 | 구현 | 7개 canonical migration | prod-v2 Blue/Green 미실행 |
| Edge | 부분 | Workers/Pages/D1/R2 설정 | Logpush/alerts 운영 확인 |
| Frontend | 검증 | build + 33 unit + Chromium/WebKit E2E | preview smoke |
| Governance | 개선 | 변경 제어 workflow, runbook | branch protection 확인 |
| Hooks/Cache | 검증 | content version + scope query key | TOPIK 콘텐츠 도입 시 재검증 |
| i18n | 부분 | ko/ja/en UI pack | TOPIK 영어 설명 검수 |
| Jobs | 부분 | weekly/push/FSRS jobs | optimizer 연결 여부 결정 |
| Knowledge | 부분 | 문서와 코드 연결 | 오래된 16주 파일명 정리 |
| Logging | 구현 | request/release/route/status/latency JSON | 알림·보존 정책 운영 설정 |
| Migration | 검증 | fresh 7/7, FK/FTS parity | prod-v2 ledger 생성 |
| Notifications | 부분 | Push API 존재 | 실제 VAPID smoke |
| Offline | 검증 | IDB account×track namespace, Chromium/WebKit E2E | production cache 모니터링 |
| Parser | 검증 | 의미 헤더·빈 뜻·중복 검사 | fixture 확대 |
| Quality | 부분 | local gates 통과 | GitHub required checks 필요 |
| Release | 차단 | workflow_dispatch + environment | billing/prod-v2/audio gates |
| Security | 부분 | session/OAuth/Access/read-only tests | secret rotation·Access 운영 결정 |
| TTS | 부분 | R2 first, approved Google batch | 30표본 QA와 4,954건 생성 |
| UX | 부분 | 핵심 feature module 분리 | TOPIK 실제 콘텐츠 미제공 |
| Versioning | 구현 | root pnpm manifest, release SHA log | release note 자동화 |
| Workflow | 부분 | 8 workflows | 원격 실행 성공 증명 |
| eXperimental | 격리 | VOICEVOX/FSRS URL 미설정 시 비활성 | 운영 연결 전 기능 취급 금지 |
| Yet-to-release | 차단 | N2/N1 WIP branch 격리 | 라이선스·원본 7개 확보 |
| Zenith | 계획 | JLPT 안정화 후 LearningTrack 확장 | R1 -> R2 -> R3 순서 유지 |

## 5. 핵심 구현 판정

### 5.1 D1과 콘텐츠

- 모든 일반 테이블은 `packages/db/src/schema.ts`와 `packages/db/drizzle-v2`가 소유한다.
- FTS virtual table과 trigger는 `0001_fts.sql`이 소유한다.
- OAuth table을 런타임에 생성하던 코드는 제거했다.
- `seed-diff.ts`는 변경 감지와 전체 parser 검증만 수행하며 D1을 쓰지 않는다.
- Blue/Green 도구는 allowlist 일반 테이블만 이전하고 OAuth state/token과 FTS row를 복사하지 않는다.
- 운영 binding은 아직 `nihongo-n3-prod`다. `prod-v2` 전환 전까지 canonical ledger의 운영 완료를 선언하면 안 된다.

### 5.2 API와 인증

- 모든 runtime route는 OpenAPI 문서 또는 승인된 internal 예외와 1:1로 비교된다.
- 공개 명세와 관리자 명세는 분리되고 관리자 명세는 app admin session으로 보호된다.
- Google OAuth는 Pages와 Worker origin이 다를 때 1회용 bridge token으로 세션을 생성한다.
- read-only cutover에서는 로그인, 회원가입, OAuth state/callback, sync 등 DB 변경 route가 503과 `Retry-After`를 반환한다.
- request log에는 PII 대신 request ID, release SHA, route, status, latency, auth mode만 기록한다.

### 5.3 Web과 LearningTrack

- 콘텐츠 API의 vocab/grammar/kanji 영역은 generated OpenAPI path/parameter 타입을 사용한다.
- 콘텐츠 버전이 바뀌면 IndexedDB mirror를 무효화한다.
- SRS, review, quiz, self-check, sync queue의 로컬 식별자는 `user:{id}|track:{track}`이다.
- TOPIK은 foundation-only다. 기존 JLPT route는 `jlpt-ja` compatibility façade이며 TOPIK 문제은행·채점은 아직 없다.

### 5.4 오디오

- 사용자 재생은 승인된 R2 object가 있으면 이를 먼저 사용하고, 없으면 명시적인 일본어 browser voice로 fallback한다.
- Worker의 공개 audio route는 R2 read-only이며 요청 시 유료 TTS를 생성하지 않는다.
- Google TTS 전체 배치는 `execute:true`, provider `google`, 관리자 인증, approval token을 모두 요구한다.
- R2 key는 콘텐츠·provider·model·audio version hash를 포함해 불변으로 생성한다.
- 현재 30표본 청감 QA와 전체 배치는 실행되지 않았다.

## 6. 이전 분석과의 정정

| 과거 결론 | 현재 사실 |
| --- | --- |
| OpenAPI generated client는 미래 작업 | 생성 타입과 일부 openapi-fetch façade 구현 완료 |
| userId만으로 로컬 데이터 격리 | userId와 LearningTrack 조합으로 격리 |
| 브라우저 TTS가 문자/청해 기본 | 승인된 R2 우선, browser Japanese voice는 명시적 fallback |
| 16주가 기본 과정 | 52주가 기본, 엄격한 4조건 통과 시에만 16주 추천 |
| diff seed가 변경 문서를 운영 반영 | diff seed는 검증 전용, production write 금지 |
| D1 migration 완료 | 로컬 canonical ledger는 완료, prod-v2 전환은 미완 |
| N2/N1 타입 지원이면 출시 가능 | 원본 7개·라이선스·검수 부재로 WIP 격리 |

## 7. 릴리스 결정

다음 조건이 모두 참이 되기 전 production 배포를 실행하지 않는다.

1. GitHub billing lock 해제와 Audit, CodeQL, Required Verification, E2E, Backup 성공.
2. `nihongo-n3-prod-v2` 생성, migration 7개 적용, 일반 테이블 이전과 restore drill 성공.
3. preview에서 password, OAuth callback, session 유지, admin, sync queue smoke 성공.
4. R2 릴리스이면 30표본 청감 승인과 `verify:remote:audio` 통과.
5. production environment 수동 승인.

관련 실행 문서는 [R1 Blue/Green Runbook](00_overview/R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)과 [기술부채 대장](00_overview/TECH_DEBT_2026-07-14.md)을 따른다.
