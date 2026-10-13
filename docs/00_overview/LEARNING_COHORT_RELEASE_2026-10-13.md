# V7·별도160 통합 릴리스 — 2026-10-13

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

상태: **Production 차단**. 철회 P1은 수정·제한된 격리 회귀 확인을 완료했다. 아직 새 후보 전체 Preview E2E·전체 복귀·가족 동선·backup/predeploy는 미완료다. 기존a49 Preview 가청은 확인했지만 새 후보 가청으로 확대하지 않는다. Production 배포·원격 push는 실행하지 않았다. 갱신: 2026-10-13 KST.

## 승인 후속 — 호환 Worker 수정·격리 회귀 확인 완료

### 추가 요청 — 한국어·일본어 업데이트 모달, 아직 로컬 후보

2026-10-13 후속 요청으로 PWA의 자동 활성화/새로고침을 명시적 사용자 선택으로 교체했다. 홈·TOPIK 홈·공개 시작 화면에서 한국어/일본어를 함께 표시한다. 학습·로그인·메모 화면에서는 갱신을 보류하며, 다른 앱 탭이 있으면 위치와 무관하게 먼저 닫아야 한다. 동의 후에도 실제 새로고침 직전에 경로와 현재 탭의 QueryClient mutation을 재확인한다. 음성 코어·학습 API·콘텐츠·migration은 이 UI 변경으로 수정하지 않았다.

- 컴포넌트/스토어/등록 함수의 최초 단위20개와 실제 production 형식 빌드의 일반 갱신12개를 통과했다. 독립 Astra 검토에서 활성화 중 이동 경합과 사후 안내의 직접 reload를 찾아 같은 최종 guard로 보강했다. 버튼 색상·초기 ‘나중에’ 포커스도 실제 화면 확인 뒤 수정했다.
- 최신 실제 빌드 브라우저 검사 **24개 중22 통과/2 실패·exit1**: 일반 갱신/양언어/보류/키보드/다른 탭/활성화 중 이동/합성 IndexedDB `sync_queue` 행 보존20개와 구 버전 전환 WebKit2개는 통과했다. 구032→신버전 재진입의 Chrome PC/모바일2개는 새 모달 대신 구 bundle이 열려 실패했다. 제한 시간·검사를 약화하거나 실패를 삭제하지 않았다. 저장 요청 전체·실제 사용자 답안·물리 음성 검증으로 확대하지 않는다.
- 원본 `.artifacts/operations/pwa-update-2026-10-13/cohort-fUjZqk` 및 앞선 실패/성공 cohort를 보존한다. 격리 진단 `debug-legacy-XLgDiG`, `debug-cache-lYBbRR`에서 종료 후 window client0, 새/구 index 캐시가 함께 존재하며 재진입은 구 index를 반환하는 현상을 관찰했다. Chrome 또는 실행기 원인은 미확정이다. **이 최초 전환 검사 실패도 Production 차단 조건**이다.
- 원래a49 콘텐츠 출판 SHA와 새 앱 SHA를 구분하는 읽기 전용 `learning-cohort-deployment.ts`/계약/22회귀를 추가했다. 출판 원장·기존 승인 hash·failed를 고치지 않는다. 실제 CF GET collector는 Preview DB/Worker/Pages deployment의 API_ORIGIN 필드를 확인했으나, 새로운 앱 배포나 실제 새 deployment receipt를 생성한 것은 아니다.

새 코드가 포함된 정식 clean 5-release gate·새 Preview44·별도 전체 복귀·가족 동선·같은 배포의 실제 Chrome/가청/Network·현 schema backup/predeploy는 여전히 필요하다. 사용자 배포 승인은 이 조건을 통과했을 때만 유효하며 **이번 후속에서 Production·Preview 쓰기·원격 push는0**이다. 현재 변경은 로컬 작업 후보이며 이전0adb/145 커밋을 이 새 후보의 배포 SHA로 보고하지 않는다.

운영 전환 안내: 기존 자동갱신 앱은 새 모달 코드를 갖고 있지 않다. 처음 전환할 때 모든 앱 탭/창을 닫고 재진입해야 할 수 있다. 현재 Chrome 최초 전환 실패가 해결되기 전에는 이를 검증된 복구 절차나 완료된 사용자 업데이트 기능으로 공지하지 않는다.

후속 종료 검사: 미커밋 작업트리의 새 `quiz-compat-2026-10-13/cohort04`에서 OpenAPI·typecheck·단위 **716(Ops33/DB294/Web174/API215)**·build·음성 소스 계약·fresh0032가 모두exit0이다. 이것은 실제6명령 결과이며 clean5-release authorization나 실패한PWA24검사를 대체하지 않는다. 문서915paths/73Markdown/1092relative links/lifecycle/36DBrefs·diffcheck 통과, 종료ops **39pass/2warning/0fail**(미커밋29경로·알려진manifest drift)이다. 코어 음성4파일과migration diff0을 확인했다. 실제 새 Preview·Production·push는 실행하지 않았다.

최종 코드 후보 **`0adbfc07afaa0bfcad87faf2fc6d2306a8fb2214`**를 clean 로컬 커밋으로 고정했다. 같은SHA의 새 cohort02에서 OpenAPI·typecheck·전체단위 **675(Ops33/DB272/Web155/API215)**·build·음성 소스·fresh0032가 모두exit0이다. 기존 퀴즈·FSRS의 Chromium/WebKit **26/26, skip/fail/flaky0, retries0**도 새로 실행했다. 이26개 음성은mock이며 물리청취가 아니다. 전체 기존295와 신규 레슨44·새Preview는 이번C에서 재실행하지 않았다. 원본은 `.artifacts/operations/quiz-compat-2026-10-13/cohort02`와 `affected-e2e-cohort01`이다. 이 summary는6개 local command 결과이지 정식5-release publication profile/G0–G4 또는 production-predeploy가 아니다.

종료 문서 검사는904paths/73Markdown/1075relative links/lifecycle/DB refs·diffcheck를 통과했다. 코드커밋 직후 local ops40/1/0, remote ops51/1/1·exit1이며 유일한실패는 의도적미push(localsource0adb/origind626)다. 후속read-only baseline에서도 운영Worker/Pages/source/설정과 a49Preview는동일하다. 이번 결과 문서화는 코드SHA와 별도 후속 변경으로 남긴다.

사용자가 **수정하지 않은 직전 Worker 대신 철회 차단을 추가한 호환 Worker로 복귀**하도록 승인했다. 직전032b50dd 기반의 별도 clean 소스 `f3caa61a3160dd5f69f56b17ae0a3c55a0211807`을 로컬 branch `release/quiz-compat-2026-10-13`에 보존했다. 런타임 변경은 quiz·내부 version snapshot·publication helper와 read-only queue defer뿐이며 음성/학습 세션 코어는 유지했다. 현재 개발 후보에도 같은 quiz 수정과 후속0032를 반영했다. 운영/현재96c8594a Preview는 변경하지 않았다.

- fail-first: 새 API3회귀가 원래 코드의 submit200/detail200으로 실패했다. 수정 후 현재 API215/215, 호환 API200/200, DB19/19(실제 Wrangler SQL splitter 포함)이다. 서로 다른 답안 동시 제출은200/409 하나씩·winner detail/activity 한 세트를 확인했다. 형식/숫자문자열/명시null 버전/다른급수/혼합/REPLACE/snapshot 변조를 차단한다.
- `0032_quiz_publication_guards.sql`은5 trigger만 추가하고 테이블·기존 행을 변경하지 않는다. 현재 source root와 호환 소스의 raw SHA는 `7cecb1f17b5405218449e2b36560800eda32afd6cc93a9550db3ccd62ab6f3ca`로 같다. 이미 적용된0031 SHA는 불변이다. ledger0032 뒤에도 **table coverage profile0031/74개**는 유지하며 trigger/ledger를 별도 검증한다. backup restore helper의 정확 승인 upgrade는0031+0032다.
- 같은 격리 fd38 DB에만0032를 적용했다. quiz6행·활동9행·합성 SRS1/복습1을 포함한13개 학습 표 행 수/해시는 migration 전후 동일하다. 이후 호환 Worker로 전환해 retired submit409×2/detail410×2, 거부 요청 전후13표 hash 불변, canonical N3 submit/detail200·records/history/FSRS due200·기존 카드/복습hash 불변·quiz6행 유지·FK0을 확인했다. 별도 직접 조회에서도 레슨0/JLPT 공개0/TOPIK published-release items0,5release withdrawn이다. 구 Pages88ec97bd의 proxy는 호환SHA를 반환한다.
- 위 결과는 **기존 실패와 같은 terminal-withdrawn 환경의 제한된 회귀 재확인**이다. 비어 있는 study/TOPIK 진행 표의 비어 있지 않은 기록 보존이나 새후보 전체 복귀 gate를 증명하지 않는다. 독립 Astra 검토도 이 제한된PASS 판정을 확인했다. 원래 실패 `drill-rollback-quiz-result-cohort01.json`을 편집하지 않았다. 현재 격리 Worker는 다시read-only다.
- root 초기 작업트리 검사는 OpenAPI/typecheck/전체단위674/build/음성source/fresh 모두exit0이었다. 동시성 회귀 추가 뒤 API215/215를 별도 확인했다. 이 dirty 검사는 clean 최종 release gate가 아니다. 테스트용 audit link 열 수 오류·타입 narrowing 오류·합성 published bank의 다음 N2 테스트 오염을 교정한 최초 실패도 보존한다. fixture 공개를 해제했으며 테스트를 삭제/약화하지 않았다.

새 원본은 `compat-worker-*-cohort02`, `compat-0032-postflight-cohort01.json`, `compat-remote-verification-cohort01.json`, `compat-public-zero-postflight-cohort01.json`, `compat-worker-park-health-cohort01.json`이다. 새 migration/Worker 쓰기는 격리 환경에만 수행했고 Production/OAuth/원격Git 쓰기는0이다.

다음 단계는 현재 개발 후보의 clean SHA를 고정해 새 전체 local/Preview44·fresh 신규환경 전체 복귀·실제 가족·동일 후보 음성·현재 운영 backup/restore·predeploy를 수행하는 것이다. 출판 source/authorization의 a49를 새 runtime SHA로 몰래 바꾸지 않고 새 증적을 연결한다. 현재 사용자의 가청 증거는96c8594a/a49에 한정한다. 아직 Production-ready가 아니다.

## 승인 범위와 보존

사용자가 V7 440문항/220레슨, 별도160 v3, 네 메뉴 UX의 최종 검증·Production·동일 branch의 일반 push를 조건부 승인했다. 기존191개 미커밋 변경·동결본·불합격 리뷰를 보존한다. 과거 로컬-only 범위는 이번 승인 이전 이력이다.

canonical 6,501행·TOPIK practice v2·기존 학습/FSRS/XP/메모와 운영 OAuth를 변경하지 않는다. 음성 코어4파일은 수정하지 않는다. Google 우선·동일 언어 설치 음성 fallback·ko/ja 제한·R2 발음 금지다.

## 새로 확인한 기준선

2026-10-13 KST 작업 시작의 원격 읽기 전용 조회(Preview는 아래 후속에서 변경됨):

| 대상 | 확인 |
| --- | --- |
| Production D1 | `nihongo-n3-prod-v2`, ledger31/latest0030, 0031=0, rows_written0 |
| Preview D1 | `nihongo-n3-topik-preview`, ledger31/latest0030, 0031=0, rows_written0 |
| Production Worker | `aedcbd40-6605-44d2-8227-d145a186bef0`, maintenance off |
| Production Pages | `f62a8bdb-298e-446a-ab74-7d78ca47efd8`, Production branch `main` |
| 실제 앱 source | `032b50ddfea4051309ae95829520e6309e67a6ff` |
| 시작 로컬 ops | 39 pass / 2 warning / 0 fail; dirty191/manifest drift |

원격 baseline은 `.artifacts/operations/learning-release-2026-10-13/baseline-cohort01.json`에 비밀값 없이 보존했다. 이 조회는 새 Preview·가청·가족·배포 증거가 아니다.

후속 read-only `baseline-postrollback-cohort01.json`에서도 Production Worker/Pages ID·source·설정 hash는 동일하다. Preview는 Worker `b1fd8bdf-6c82-4697-ab01-250c989589b2`, Pages `96c8594a-ca26-4705-ae30-5eb8d4d42617`, source `a49b07662cd52e818fbd17704dbafe5be63d2c97`, D1 ledger0031로 변경했다. 운영 D1에는0031을 적용하지 않았다. 운영 OAuth 변경0이다.

## 구현 계약

- `learning-cohort-600-2026-10-13`의5개 release만 공개/철회한다. 기존 Preview-only CLI의 Production 거부는 유지하고 새로운 strict-target CLI를 별도로 둔다.
- coordinator의 단일 UPDATE와 DB trigger cascade로5개를 같은 SQL statement에서 전환한다. 다른 release의 직접 부분 공개는 거부한다.
- 기존 `0031`은 원격 미적용 확인 후 additive nullable seal/group 열을 보강했다. 현재 Preview와 격리 drill에는 적용됐으므로 **이제0031 수정 금지**다. 후속 DB 변경은0032로 분리한다. raw SHA `9dbbc23715c4fd78454ef712b8dc67ae84af511aa15b4182b5a0ae3068c65d33`.
- V7과160의 원본 hash/실제 두 리뷰는 각각 유지한다. 출판 authorization과 실행 후 verification receipt는 서로 다른 증적이다.
- `stage/publish/verify/withdraw`는 DB/Worker/Pages·config·candidate SHA를 고정한다. 쓰기는 동일 clean worktree와 scope/SHA token을 요구한다.
- Worker 배포는 `--maintenance-mode=off|read-only`가 필수이고 사후 health의 release/mode를 대조한다. 점검 중 queue는 ack/DB 쓰기 없이 batch를 defer한다. 실행 중 workflow·queue delivery의 실제 동결 확인은 별도 필수다.
- `d1:restore-drill --exact-schema-upgrade`는 백업 schema 그대로 복원한 뒤 승인된0031만 적용하고 기존 모든 regular table의 원래 열 hash를 대조한다. 운영 원문은 로컬 보호 경로에만 둔다.

## 실행 gate와 현재 결과

| gate | 상태 |
| --- | --- |
| helper 점검 모드/SHA/env | 신규 회귀 최초 실패 보존, 최신 교정 후6/6·독립 반례 차단 |
| queue/cron 점검 | 최초1실패/2통과 보존, 교정 후3/3 |
| strict target |4/4; 실제TOML 포함. 최초 명령/테스트 상대경로 실패를 보존하고 교정 |
| 통합5개 semantic seal·원자성·철회 | 신규23/23·기존V719/19·API208/208, 실제 새 로컬D1 실행·독립 두P1 재검증 통과; synthetic operator gate |
| 시각5개 기준선 검토/최종 전체 E2E | 의도된5개만 갱신. 최종 기존 suite265 pass/30 기존 WebKit 시각 policy skip/0 fail·flaky |
| 최종 전체 gate·fresh/upgrade/reseed | a49 후보 local-cohort03: 단위649·OpenAPI/typecheck/build/fresh·reviewed E2E44/44·합성 기존12종 보존·600/220 공개/철회 통과 |
| 새 Preview600/220 | 실제0031·stage/reseed/publish/verify 통과. 5 release,600문항/220레슨/880entries/600quality links/56ko speech |
| 새 Preview 원격 전체 E2E | **실패/미완료**: cohort03 31 pass/13 미실행·suite timeout; cohort04 18 pass/1 fail/25 미실행·suite timeout。전체44 통과 아님 |
| 별도 원격 복귀 연습 | 최초bare old Worker 실패 보존. 호환f3caa61 제한회귀409/410·보존은통과; **새0adb 전체 복귀 gate는미완료** |
| 같은 Preview 실제 Chrome/가청/Network0 | 통과: native Chrome ko/ja 각2 onend·현재 사용자 두 언어 가청 확인·재생 구간 HAR0건·audio predeploy exit0 |
| 같은 Preview 실제 가족 | **미실행**: 현재 사용자 답변 ‘아직 확인하지 않았습니다’ |
| 현 schema backup/restore·predeploy | 미실행 |
| Production·최종 push | 미실행 |

이전 readiness의235기능 통과와5시각 실패는 원본으로 보존한다. 이전614단위/44레슨 E2E를 새 변경의 통과로 재사용하지 않는다.

원격 레슨 검사 전용 `remote-reviewed-learning-lessons.spec.ts`는 Production URL을 거부하고 같은 SHA의 공개600/220 receipt를 요구한다. 11급수 전체 목록20개와 급수별 대표1레슨의 시작·제출·재전송·중단/재개·FSRS·기록을 검사한다. 이것을 전체220레슨 화면 인간 검수로 보고하지 않는다. 기존 로컬 전수220 API/대표 화면과 가족 관찰을 별도로 유지한다.

## 실제 실행 시계열·증적

1. 기존191개 변경과 실패/동결본을 보존하고 로컬 `c21d39a`를 고정했다. clean worktree의 collector 실패를 교정한 `a49b076`에서 새 local-cohort03이 통과했다. 단위 Ops33/DB253/Web155/API208 합계649다. 로컬 reviewed44와 기존265+30policy skip을 서로 다른 검사로 기록한다. root의 후속 변경은 E2E CJS 로더 경로 교정과 문서이며 runtime candidate는 여전히a49다.
2. dedicated Preview에0031/Worker/Pages를 배포하고5개 atomic publish 및 사후 verifier를 실행했다. 구 실패160의3개 release는 Preview에서만 철회·비공개로 전환했다. 구 문항/감사/학습 기록 및 실패 artifact는 삭제하지 않았다. 현재600은 V7 및 새160 v3다.
3. 새 Preview44 원격 suite는 완료하지 못했다. CJS `import.meta.url` 로더 오류를 조건/hash/assertion 변경 없이 교정했다. 실제 후속 두 run은 모두 exit1이다. cohort04 trace의 약993.65초 호출 공백과 미수집 register 응답은 실행기 중단 정황이며, 서버 오류 또는 노트북 sleep이 확정된 것은 아니다. timeout 확대나 미실행을 pass로 바꾸지 않는다(INC-QA-099).
4. 같은96c8594a의 native Chrome에서 두 언어 실제 onend를 관찰했다. Network All recording/clear 후 두 재생 구간의 sanitized HAR entries0, R2/legacy0이다. 다른 모든 앱 요청이0이었다는 뜻이 아니다. 사용자 새 답변으로 `chrome-audio-confirmed-cohort02.json`을 추가했으며 기존 pending01은 보존했다. `release:verify:audio-predeploy` exit0은 **음성 gate만** 통과다. 선택된 voice 이름은 관찰하지 않았다. 가족 pending 증적은 별도다.
5. 운영 사용자/OAuth/공유 queue/workflow/R2를 복사하지 않는 새 drill DB `fd38bf8d-23ce-4cec-8d0e-a98b63c38889`와 동명 Worker, Pages `nihongo-n3-learning-rollback`을 생성했다. 공개 콘텐츠만 복사하고600/220을 publish한 뒤 합성 계정의 새 N2 퀴즈와 canonical N3 퀴즈를 준비했다. migration bootstrap owner1을 learner0로 오판한 초기 실패 등 모든 실패는 보존한다.
6. `drill-withdraw-receipt-cohort01.json`으로5개 철회/공개0을 확인한 다음 실제032b50dd 소스 Worker read-only, 같은 소스 Pages `88ec97bd`로 복귀했다. Pages는 구 clean source에서 `VITE_API_URL=''`로 새로 build했고 isolated API_ORIGIN을 사용한다. 최초 배포 직후 health 전파 불일치는 보존하고 후속 read-only 실제확인(제출503/기록200)을 별도 저장했다.
7. 격리 Worker만 off로 전환해 재현했다. 이미 완료된 철회 콘텐츠 퀴즈 detail200/정답 노출, 대기 퀴즈 submit200/활동3건 증가다. canonical N3 제출200/기록200/FK0/합성 quiz3행 유지. **전체 기존 학습 기록·FSRS 검증 통과로 확대하지 않는다.** 이후 격리 Worker를 read-only로 다시 잠그고 철회 상태를 유지한다. 운영 학습은 중지하지 않았다.

핵심 원본은 root `.artifacts/operations/learning-release-2026-10-13/`의 Preview receipt, `chrome-audio-confirmed-cohort02.json`, `chrome-audio-network-cohort01.har`, family pending, `drill-withdraw-receipt-cohort01.json`, `drill-old-pages-build-cohort01.json`, `drill-rollback-quiz-result-cohort01.json`이다. 새 실패는 기존 `passed` 값을 수정하지 않고 별도 파일로 남겼다. `.artifacts`·비밀·합성 쿠키는 Git에 넣지 않는다.

## 차단 결함과 다음 결정

`INC-QUIZ-098`: 현재a49와 직전032b50dd의 generic quiz 경로는 저장된 `questions_json`을 publication 검사 없이 채점하고, detail GET도 정답을 반환한다.0031의 study_steps guard는 quiz_attempts를 보호하지 않는다. DB trigger는 쓰기를 차단할 수 있지만 구 Worker의 SELECT 응답까지 차단하지 못한다. 따라서 **수정하지 않은 구 Worker 복귀만으로 현재 요건을 만족할 수 없다.**

초기 제안은 사용자 승인 뒤 위 후속으로 실행했다. 모든 mixed quiz를 원자적으로 차단하며 canonical-only 기록은 유지한다. 새 SHA·Preview·전수 E2E·전체 복귀·가족 gate가 통과한 후에만 운영 백업/predeploy를 시작한다. 상세 출처가 없는 legacy NULL snapshot의 완료 행은 삭제하지 않고 history 집계를 보존하되 정답 상세410으로 제한한다.

최신 문서 검사는900 paths/Markdown73/relative1069/lifecycle13active·7retired absent/DB refs36·exit0이며 git diff check도 통과했다. 로컬 ops39pass/2warning/0fail(후속10개 미커밋·manifest drift)이다. 원격 ops는50pass/2warning/1fail·exit1이며 실패는 locala49/origind626의 **의도적 미push 상태**다. 이를 원격 전체 통과나 운영 장애로 보고하지 않는다. 이번 문서 후속은 아직 미커밋이며 원격push는 게이트 차단 상태다.

## 순서와 실패 대응

PWA 최초 전환 실패 해결 → 최종 scoped commit/clean worktree → 새 local full gate/기존+레슨 E2E → Preview → 별도 합성 원격 복귀 → 새 Preview 가족/실제 Chrome → 원격 branch 일반 push → 승인된 점검/queue·workflow 동결 → 실제72-table backup → exact restore/0031+0032 upgrade → predeploy →0031+0032/호환 Worker →600 draft/검증 →5개 공개 → remote verifier → Pages → smoke → 점검/큐 원상복구 → 문서 후속 push.

복귀 연습 및 실패 시에는 **5개 철회 → 문항·레슨 공개0 확인 → 승인·검증된 호환 Worker 복귀 → 직전 실제 Pages source 복귀 → 기존 기록/기능 확인** 순서다. 레슨만 숨기거나 화면 flag만 끄는 것은 복귀가 아니다. 공개0 미확인 시 구 Worker로 돌아가지 않는다. 데이터 손상이 없으면 additive schema와 정상 학습 기록을 유지하며 D1 전체 백업을 복원하지 않는다.

철회 환경은 `nihongo-n3-learning-rollback-20261013` 전용 DB/Worker와 `nihongo-n3-learning-rollback` Pages로 분리해 실제 생성·실행했다. 운영 사용자 백업·OAuth secret은 복사하지 않았다. terminal withdrawn 원장을 다시 공개하거나 실패를 성공으로 편집하지 않는다.

출시 후 D+1/D+7/D+30에는 두 학습자의 완료·중단·재개·지연 재확인·FSRS·speech를 관찰한다. 월1회 source 버전/부족 영역만 점검하며 자동 공개하지 않는다.
