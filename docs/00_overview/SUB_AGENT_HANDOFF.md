# Sub Agent 운영 인수인계

최종 점검: 2026-09-07 KST

이 문서는 새 Sub Agent가 과거 대화의 완료 보고를 신뢰하지 않고 현재 저장소를 재구성하기 위한 짧은 진입점이다. 상세 수치와 배포 식별자는 반드시 [현재 상태](CURRENT_STATE.md)와 `pnpm ops:status:remote`에서 다시 확인한다.

## 시작 순서

1. 루트 `AGENTS.md`
2. `docs/README.md`
3. `CURRENT_STATE.md`
4. `ERROR_LEDGER.md`
5. `OPERATIONS_MANAGEMENT_RUNBOOK.md`
6. `LOCAL_CICD_OPERATIONS.md`
7. `LOCAL_RELEASE_LEDGER.md`
8. 작업과 직접 관련된 schema, migration, route, source, test

운영 감사·버그·리팩터링·정리에는 `.codex/skills/project-operations-steward`를 사용한다. 콘텐츠 publication에는 `.codex/skills/content-release-automation`도 읽는다.

## 현재 기준선

| 범위 | 현재 사실 |
| --- | --- |
| Production DB | D1 migration `0000–0028`(29개); canonical과 TOPIK practice v2 300, N3 practice 120, TOPIK owner Batch 5까지 공개, 재시드 없음 |
| Preview 후보 | N2 60, N1 60, TOPIK owner Batch 6 40; Production 미반영 |
| Pages | Production `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`, canonical `https://nihongo-n3.pages.dev` |
| Worker / source | `c2901280-4c10-4671-bc61-dc262c88c692`; Worker·Pages 배포 commit `a7d5d87946334fe8c7970b8f124853aaba443955`, 검증 runtime `793b671a5c7503017041bbaee4e8de7edb492e20`와 apps/packages/lock 동일 |
| 콘텐츠 / 결함 | content source `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4` 유지. 031–033 수정은 운영 반영됐으며 상태 판정은 오류 원장의 사후 증거를 따른다. `INC-DATA-024`는 source-pinned verifier로 관리 |
| rollback | Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`, Pages `9cc58a1f-4772-4129-b90d-c819ca20d700`; 데이터 손상 없으면0028·학습 기록 보존 |
| CI/CD | GitHub Actions 비활성; 승인된 로컬 gate와 MD 원장이 release evidence |

## 코드·데이터 지도

### 현재 학습 UX — Production 반영

최종 Preview 기능은181 pass/6 로컬 fixture skip/0 fail이며 시각60개는 별도 제외다. 같은 runtime의 로컬458개·fresh0028·전체 브라우저217/30/0 증거와 구분한다. 사용자가 최신 Preview555fc0c4의 한국어·일본어 가청을 확인해 실제 Network/onend 증거와 함께 strict predeploy를 통과했다. 과거 질문의 답을 옮긴 것이 아니다.

Production 사후 Worker 공개 smoke7개·auth proxy3개, 익명 음성 양 엔진2개(mock), release-pinned verifier392개·FK/FTS·R2참조0, 기존 학습21테이블 hash 보존을 확인했다. 실제 Chrome canonical에서 양언어 onend 각1회도 관측했지만 Production의 새 사람 청취 확인으로 쓰지 않는다. 최종 Git push는 아직 미실행이며 문서/운영 상태 동기화 검증 뒤 진행한다. 이미 통과한 동일 runtime의 전체 테스트·Preview OAuth 설정·가청 승인을 처음부터 반복하지 않는다. 새 코드/설정 변경은 영향 gate를 다시 판단한다.

증적은 `.artifacts/operations/learning-production-2026-09-07-*`, `production-postdeploy-pinned-2026-09-07.json`과 릴리스 원장을 따른다. 운영 OAuth는 기존 클라이언트를 유지하고 Preview 전용 자격 증명은 운영으로 복사하지 않았다.

### 배포 전 순차 이력 — 아래 미완료·승인 대기는 당시 상태

**2026-09-07 배포 전 백업 이력:** 운영 점검 승인을 받았고 임시 동일-code Worker232ec50d/Queue정지→65개 백업→원래Worker6bbe4bbd/Queue복귀를 실행했습니다. `.artifacts/operations/production-backup-2026-09-07-{execution,postcheck,restore,ops-remote}.json`을 참조합니다. 첫 wrapper의 health mismatch exit1은 보존했고 후속 off/configtrue·설정동일 확인과 실제 local0028 복원(FK0·FTS일치·새5개0행)은 exit0입니다. 백업은 schema0027이며70-table 백업이 아닙니다. 당시 미완료였던 가청·신선도·predeploy와 배포의 후속 결과는 상단 현재 상태를 따릅니다.

**2026-09-06 OAuth 후속 포인터:** Preview Worker는87f8fbf5로 변경됐습니다(앱source793b671/Pages555fc0c4 불변). 별도 `JLPT Preview` client의 전용 callback과 secret 두 개만 연결했습니다. 실제 Chrome JLPT Google 로그인·홈 재조회, TOPIK 선택 후 재로그인 및 D1 계정 id/role/Google 연결·FSRS 설정 hash 동일을 확인했습니다. 실제 계정의 학습17테이블은 모두0행이라는 한계가 있습니다. provider mock 로컬14개는 별도 통과이며 원격187개 최종 재실행은181 pass/6 로컬 fixture skip/0 fail,23.3분·exit0입니다. 시각60개는 별도 제외입니다.

555fc0c4 실제 native HAR14개HTTPS200/동일origin+UI확장2개, 양언어onend1/1, R2/legacy0, Console경고2·오류0을 확보했습니다. 새 가청/확인자 대기로 strict gate2누락exit1입니다. 조건부 Production·최종push 승인은 받았으나 점검 시간·backup/restore·최종 gate 완료 전에는 실행하지 않습니다. 아래 b02f3674/SSO503/Network 미확인 설명은 이전 이력입니다. 최신 결과는 릴리스 원장의 OAuth 후속과 `preview-oauth-*`, `preview-google-preservation-*`, `stability-preview-actual-audio-network.json`을 확인합니다.

**OAuth 연결 전 기준선(위 OAuth 후속 포인터가 우선):** 앱 source는 로컬 commit `793b671a5c7503017041bbaee4e8de7edb492e20`, Preview Pages `555fc0c4-24cc-49de-b846-38aee2f59b31`, 당시 Worker `b02f3674-6a59-47c8-818a-2397bcd295fd`다. 둘 다 deploy exit0이고 D1 추가 migration/seed는 없다. Preview FK0·migration0028, Worker smoke21 pass/0 fail/관리자1 미실행, 실제 HTTP A중단→B생성→A재전송의 ID 보존을 독립 확인했다. 원격 Git은5311ab7이며 최종 push는 전체 gate 뒤에 한다. 다음 네 문단은 OAuth 연결 전의 실행 이력이다.

새 Preview의 auth/settings14건은11/0/3(exit1): SSO503 두 건과 지연 테스트 WebKit interception0 한 건이다. 후자는 해당 describe에만 `serviceWorkers:block`을 적용해 실제 응답·interception1·PUT/GET/reload 검사를 유지했다. 이후 원격 `settings-preferences.spec.ts`와 `settings-theme.spec.ts` **14 pass / 0 skip / 0 fail**이다. 일반 설정·테마는 SW를 허용하며 앱 runtime은 변경하지 않았다. SSO 실패를 제거/skip하거나 전체 원격 통과로 합산하지 않는다.

555fc0c4의 첫 실제 Chrome 관측은 UI 연결 오류로 중단됐지만 10:06 UTC 새 탭 후속에서 양언어 onend각1회·voice10/10·탭 콘솔0을 확인했다. native Network는 `cgWindowNotFound`로 미확인, 새 URL 가청도 대기다. `stability-preview-actual-audio.json`의 strict gate는4개 누락·exit1이다. 이전 중단 artifact와 구분하며, d51a81ed HAR와 질문 URL a95437fc의 사용자 가청 답변을 새 배포에 재사용하지 않는다.

최신 원격 기능187건은 **178 pass / 6 로컬 fixture skip / 3 fail**,23.6분·exit1이다(`stability-preview-full-functional.log`). 시각60개는 별도 제외다. 실패는 실제 Google start503 양 엔진2건과 WebKit 자연 검색 fixture 우회1건이다. full-session4건은 pending/fail0·최대 write3,428ms이며 전 급수 저장·재개도 검사했다. 후속 부분 재검사와 이 전체 실패를 합쳐 전체 통과로 만들지 않는다.

자연 검색 mock 누락은 counter0 fail-first 후 해당 사례만 SW 제어해 원격 양 엔진4개를 통과했다. 앱/배포 source793b671은 그대로이며 전체178/6/3은 별도 실패 기록으로 유지한다. 남은 순서는 Preview OAuth 전용 설정/실제 로그인 및 최신 음성 증거 확보→원격 gate 재검증→승인된 maintenance의 새 Production backup/restore→릴리스 gate→Production→smoke→최종 push다. 전체 검증 전 파일 삭제·콘텐츠 증량은 하지 않는다. Production read-only48/2/3은 미push SHA와 기존 TOPIK/CSP 두 실패로 Preview187건과 다른 집계다. 최신 실행 파일과 rollback 전체ID는 릴리스 원장에 있다.

#### 이전 검증 이력 (현재 포인터 아님)

**당시 작업 시작점:** HEAD5311ab7 위 미커밋 안정성 수정본에 INC-AUTH-054(트랙 저장 실패), LEARN-055(종료 세션 request_id 재전송), SET-057(프로필 조회 중 설정 저장·늦은 계정/트랙 응답)을 수정했다. 당시 전체 로컬 gate **458개**, 전체 브라우저 **217 pass / 30 시각 정책 skip / 0 fail**, 각각 exit0이다. `settings-final-full-gate.log`와 `settings-final-local-e2e.log`를 보존한다. API의 실제 local OAuth bridge 테스트는 provider 응답 mock이며 실제 SSO로 간주하지 않는다. 이 문단은 원격 반영 전 이력이다.

현재 Preview 원격78건은73/4/1(exit1, SW단발 오류)이다. Google 설정 표시2개는 교정 후 통과, 실제 start2개는503 실패다. Preview callback/secret의 별도 설정 전에는 실제 SSO 검사를 통과시킬 수 없다. 로컬 Google 설정은 Production callback이므로 임의 복사하지 않는다. 새 Production backup은 승인된 maintenance window를 확인한 후에만 실행한다. 목표의 전체 검증 완료 전 삭제·최종 push·Production은 진행하지 않는다.

실제 Chrome Network는 **native App 대상**으로 작업 탭을 선택하고 DevTools를 열어 관측할 수 있었다. d51a81ed의 양언어 onend1/1, R2/legacy 요청0과 sanitized HAR16개를 확보했다(09:39 UTC). Console에는 SW/module preload 경고6개가 있어 과거 dev.logs0과 구분한다. 사람 가청은 아직 a95437fc에만 확인됐고 d51a81ed 질문은 미응답이다. 새 artifact `srs-preview-actual-audio-network.json`은 strict gate2개 누락/exit1이다. 다른 source에 재사용하지 않는다.

**최신 후속:** Pages `d51a81ed-2561-4900-899f-022b99d67679`/source`5311ab7`, Worker `6f0c0e41`/source`0b20e39`. 아래94dfb05 서술은 최초 UX 기록이다. 복습clock-skew·양면 접근성/키보드 후속은로컬440개 gate·전체브라우저211 pass/30 skip/0 fail 통과, commit/push·Pages-only Preview배포 완료다. 최종원격과실제음성증거는최신릴리스원장을확인하며과거a95437fc가청을d51a81ed에재사용하지않는다.

먼저 [LEARNING_EXPERIENCE_PLAN](LEARNING_EXPERIENCE_PLAN.md)의 실제 검증/미실행 표를 읽는다. UX source `94dfb05`는 feature branch에 commit/push하고 전용 Preview에 반영했다. Production 배포로 오인하지 않는다. 원격 세션 시작 지연 `INC-PERF-049`를 추가 수정·재검증 중이다.

별도 Agent 교차검토에서 `INC-LEARN-043`, `INC-DATA-044/046`(다른 기기의 선행 제출·종료·트랙 변경)과 `INC-OPS-045`(진단 식별자 가림), `INC-DATA-047`(0028 backup profile)을 추가해 회귀를 수정했다. 후속 전체 브라우저는 `207 passed / 32 skipped / 0 failed`다. expected_track 불일치 409를 메모 revision 충돌이나 제출 성공으로 바꾸지 않는다. `/audio-qa` 정상 종료 관측 보강(`INC-QA-048`) 이후의 최종 gate는 계획/릴리스 원장의 최신 결과를 확인한다.

Preview D1에 0028만 적용했으며 기존 콘텐츠 집계·공개 상태·quality link가 before/after 일치하고 FK 0이다. Pages `a95437fc-8411-4151-9519-ab0d8fb92905`는 source94dfb05를 유지한다. 현재 Worker는 성능 후속 `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63`/source0b20e39로, 직전1fec0907을 복귀 기준으로 보존한다. 실제 Chrome의 양언어 정상 종료와 사용자 청취 확인은 동일 Pages의 증거지만 전체 network capture는 없다. 초기 Preview E2E는 지연으로 중단했고 후속 검증 결과는 최신 원장을 확인한다. 최초 UX 이전 Worker0d17ba30/Pages885aae1f도 별도 복귀 기준이다. Production에는 어떤 변경도 하지 않았다.

### 현재 코드·데이터 진입점

- shared 계약: `packages/shared/src/learning-experience.ts`.
- additive DB: `packages/db/drizzle-v2/0028_learning_experience.sql`, Drizzle의 다섯 learning/study 테이블.
- API: `apps/api/src/routes/learning-experience.ts`; `lib/study-content.ts`의 typed content/publication/strict-level, `lib/learning-effects.ts`의 완료·FSRS 공통 batch, `lib/quiz-questions.ts`의 기존 출제 계약.
- 웹: `Today`, `StudySession`, `LearningRecords`, `LearnHub`, `QuestionsHub`; `features/study/StudyComponents.tsx`의 메모 CAS·speech; `i18n/study.ts`의 ko/ja/en 조작 문구.
- 테스트: `learning-experience-migration.test.ts`, API `learning experience contract`, `e2e/learning-experience.spec.ts`, 메모 지연 응답·result 소유권 웹 테스트.
- 콘텐츠↔개념 approved link는 아직 생성하지 않았다. 새 연상문·이미지·문항 생성/공개 작업이 아니므로 기존 문제를 개념 맞춤 출제로 과장하지 않는다.
- `최초 응답`은 세션 `practice` 제출 수이지 평생 처음 접한 고유 문항 수가 아니다. 힌트 사용량·홈 진입→시작 시간·재개 성공률은 아직 구현된 운영 지표가 아니며, `revealed`는 개념/복습 해설 열람만 나타낸다.
- backup/restore는 명시적 0027/65·0028/70 profile이다. 이번 배포 전65개 Production backup의 local0028 restore는 FK0·새5개 테이블0행으로 통과했지만 `coversLocalSchema=false`다. migration 이후 생긴 새 학습 기록까지 포함한 백업은 아니다. 기존 transfer/사용자 정리 도구는 별도0028 검증 전 사용하지 않는다.
- 자유 SRS의 시계 차이 결함은 `useSRS.ts`와 `lib/srs-due-snapshot.ts`에서 서버due 스냅샷과 IDB 현재값을 대조해 수정한다. 서버시각을 맞춘다며 FSRS날짜를 덮거나, 늦은due응답이 낙관평가를 덮게 바꾸지 않는다. hook단위와 실제1분clock-skew E2E를 함께 확인한다. 원격에서 발견한 mockrecords 실패는SW interception 문제로 제품 저장 오류와 구분한다.
- SRSCard 양면 접근성과 전역 키보드 단축키는 `INC-SRS-053`으로 추적한다. 음성 테스트는 실제 뒤집기 이후 재생해야 하고, 카드 준비 전 false를 반환해 skip하면 안 된다. `.artifacts/operations/learning-experience-2026-09-06-srs-final-e2e.log`는209 pass/30 skip/2 fail인 중간 실패 증거이며 최종 통과로 인용하지 않는다.
- `VITE_LEARNING_EXPERIENCE`는 build-time 화면 플래그이며 Worker 전체 rollback 대체물이 아니다. `0028`은 이전 Worker가 무시하는 additive 테이블이다.

- `apps/web`: React PWA, Dexie queue, 퀴즈·TOPIK·FSRS UI, Google 우선 동일 언어 browser speech.
- `apps/api`: Cloudflare Worker/Hono, 인증·track guard, 학습 API, OpenAPI source.
- `packages/shared`: Zod API schema, DTO, FSRS와 공통 정책.
- `packages/db`: Drizzle schema, 로컬·Production migration `0000–0028`, seed, quality/release verifier.
- `docs/01_n5`–`docs/07_topik`: 코드가 읽는 학습 source-of-truth가 포함된 영역. 삭제 전에 문자열 참조·manifest source·checksum을 대조한다.
- `e2e`: Chromium/WebKit 제품 흐름과 발음의 server/R2 요청 0건 검증.

핵심 데이터 흐름은 `source → deterministic seed → D1 → Worker API → Query/Dexie → UI`다. 사용자 학습 변경은 `quiz/complete → progress 또는 attempt → FSRS → learning_activity_events`의 track 격리를 유지해야 한다.

## 절대 불변 조건

- 발음은 같은 언어의 Google 음성을 우선하고, 없으면 같은 언어의 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*` 외 voice를 사용하지 않는다.
- R2 발음 수집·생성·저장·조회·재생·fallback은 금지한다. legacy `/api/v1/audio/*`와 관리자 발음 생성 경로는 `410 Gone`을 유지한다.
- R2 원격 verifier는 9개 표면을 독립 count한다. 이를 compound `UNION ALL`로 합치면 Production legacy view 확장으로 D1 planner 제한을 넘을 수 있으므로 되돌리지 않는다.
- 다른 JLPT 급수나 학습 track으로 fallback하지 않는다. 정답은 제출 전 노출하지 않는다.
- Production write/deploy에는 현재 세션 승인과 Preview, backup/restore, rollback, predeploy gate가 필요하다.
- 실패·미실행·mock 결과를 통과라고 쓰지 않는다. 실제 Chrome lifecycle과 물리 스피커 가청은 별도 증거다.

## 작업 종료 보고 형식

- Confirmed: 현재 명령·코드·원격 조회로 확인한 사실
- Changed: 수정 파일과 계약 영향
- Validation: 실제 실행 명령, 종료 코드, pass/skip/fail
- Preserved: 사용자 변경과 backup/release evidence
- Blocked: 미실행 또는 외부 조건
- Next safe unit: 승인 없이 이어갈 수 있는 최소 다음 작업

작업 종료에는 `pnpm ops:status`를 다시 실행하고, 코드·DB·API·배포 상태가 달라졌다면 현재 상태·오류 원장·runbook·릴리스 원장을 같은 commit에서 갱신한다.
