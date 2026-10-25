# 계정·요청 경계 보안 보강 — 2026-10-26

상태: `8d57e1b4f177769dd0c0bf2579aa02f9584599d5` 구현·전체 로컬·Preview·사용자 가청·새 백업/복원·predeploy를 거쳐 Production Worker/Pages 배포 및 사후 gate 통과. 소스 push 완료, 결과 문서는 별도 커밋으로 동기화한다. 담당 변경자: 강성호.

## 범위와 보존

사용자 승인: 취약점 검사·수정·검증 후 Production 반영. 기존 학습 접근성을 유지한다. DB migration·콘텐츠 재시드·음성·FSRS/XP 산정 변경은 없다. 먼저 작성한 찾아보기 탭 수정 `INC-UI-128`도 후보에 포함한다.

검토는 인증/세션, Pages 프록시, 쓰기 출처, 푸시, 오프라인 review 입력 및 관리자 출력 경계에 집중했다. 전체 저장소·의존성·운영 인프라의 모든 취약점 부재를 보증하는 전수 침투시험은 아니다. 운영 사용자에게 공격을 실행하지 않았다. Google 제공자 HTTP와 푸시 수신은 로컬 검사에서 mock이며 실제 제공자 성공과 구분한다.

## 확인된 경계와 수정

| 경계 | 수정 | 편의성·호환성 |
| --- | --- | --- |
| 공개 가입 관리자 권한 | `ADMIN_EMAIL` 일치만으로 관리자 부여 금지 | 기존 관리자/사용자 역할 유지, 보호된 bootstrap 유지 |
| Google 계정 사전 선점 | `sub` 우선 조회, 이메일만 같은 비연결 계정 자동 병합 금지, `email_verified === true` | 이미 연결된 Google/비밀번호 로그인 유지; 충돌 시 기존 비밀번호 안내 |
| OAuth 로그인 CSRF·재사용 | 동일 출처 cookie+DB state, cross-origin bridge cookie 결합, 원자적 `UPDATE ... RETURNING` 소비 | hash Preview는 state 생성 전 고정 Preview 호스트로 이동; 배포 도중의 구형 로그인만 재시작 필요 |
| 쿠키 기반 쓰기 CSRF | Pages의 Origin 덮어쓰기 전 검증 + Worker 독립 검증 | 정상 same-origin 및 헤더 없는 비브라우저 클라이언트 유지; 운영에서 Preview Origin 거부 |
| 비밀번호 대입 | IP·정규화 계정 hash별 기존 rate limiter, 인증 본문 16KiB | 영구 계정 잠금·CAPTCHA 없음; 한도 초과 429/60초 재시도 |
| 푸시 URL SSRF | HTTPS 제공자·키 형식·크기 검사, 저장/발송 두 경계, redirect 수동 거부·10초 제한 | 기존 소유권/암호화 유지, 새 R2 도입 없음 |
| 저장형 HTML 삽입 | sync review payload 런타임 검증, 관리자 숫자 선별·타입 방어·실행 차단 CSP | 잘못된 오프라인 항목은 완료 처리하지 않음; 기존 학습 행 삭제 없음 |
| 로그아웃 실패 은폐 | D1 revoke 오류 전파, 실패 시 재시도 안내, 서버 401은 로컬 해제 | 네트워크/5xx 실패를 성공처럼 숨기지 않음; 늦은 응답의 계정 덮어쓰기 방지 |
| 공유 리포트 버킷 | 비운영 리포트 경로 namespace 분리 | 운영 리포트 경로·자료는 그대로 보존 |

푸시 제공자 범위는 [Chromium 상수](https://chromium.googlesource.com/chromium/src/+/refs/tags/148.0.7734.4/components/push_messaging/push_messaging_constants.cc), [Mozilla Autopush](https://mozilla-services.github.io/autopush-rs/http.html), [Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [Microsoft WNS 주소](https://learn.microsoft.com/en-us/mem/intune/fundamentals/intune-endpoints)로 확인했다. 등록 허용은 실제 기기 수신을 보장한다는 뜻이 아니다.

## 증거·검토

- 로컬 증적: `.artifacts/operations/security-hardening-2026-10-26/` (비밀·원문 보고서 Git 제외).
- 초기 인증 회귀: `auth-before.log`의 보안 16개 중 12개 실패. 수정 후 인증·브리지·요청 출처 묶음24개 통과.
- 관리자 과거 악성 duration의 raw HTML 출력은 격리 D1에서 재현했다. 초기 sync 검사의 누락된 `client_id`/migration 및 happy-dom의 Origin 제거는 테스트 환경 오류였으며 수정 로그를 보존한다. 실패를 앱 취약점의 실행 증거로 혼동하지 않는다.
- 독립 소스 검토에서 Preview 쿠키 호스트/로그아웃401 회귀 두 건을 발견해 수정했다. 해당 후속 API12개·logout10개, 전체 typecheck와 음성 계약 통과.
- route 전체 시험은 시간 누적 IP quota와 분리된 성공 limiter fixture를 사용한다. 실제 차단 분기는 별도 `request-security.test.ts`로 검사한다. 정상 푸시 등록 fixture는 유효한 P-256 공개키로 교체했다.
- 운영 구독 읽기 전용 대조에서 기존 Safari 키의 padded Base64를 확인했다. Base64url만 받는 초기 후보는 배포하지 않았으며, 두 정상 인코딩을 검증하도록 수정했다. 기존 구독 재등록이나 데이터 변환은 하지 않는다.
- 전체 브라우저 실행의 합성 가입도 독립 사용자별 로컬 IP로 분리한다. 수백 가입이 한 IP 제한을 소진한 실패는 보존하며, 실제 동일 계정의 31번째 요청 차단은 별도 E2E로 유지한다. 운영의 제한을 늘리거나 우회하지 않는다.
- 보안 스캔 ID `81a653d5-770e-4e37-ba00-29e2232ebd52`의 최초 보고서는 역사적 발견 증거로 보존한다. 그 보고서의 발견 상태를 편집해 새 배포 성공으로 바꾸지 않는다.
- 스캔 도구 사용량은 과거 문맥을 포함한 부분 집계(total8,860,519/input8,831,994/cached8,525,184/output28,525, 누락 thread77)다. 이번 작업만의 비용이나 절감률로 해석할 수 없으며, 현재 세션 전용 사용량은 분리 측정되지 않았다.

## 릴리스 조건과 복귀

### 최종 후보 검증 (2026-10-26)

README·문서 안내·코드/API 지도·현재 상태·오류·릴리스·변경 이력·CI/CD·운영 runbook·Sub Agent 인수인계의11개 문서를 개정했다. 문서 작업 중 runtime/테스트 소스는 변경하지 않았고 배포는 같은 clean 후보 `8d57e1b`를 사용했다. 배포 전 문서 catalog1000경로·80문서/1200상대링크·lifecycle·diff 검사를 통과했다. `documentation-resume-remote.json`의51통과/2경고/실패0과 이전 Worker/Pages 값은 배포 전 이력이다. 아래 최초 종료 수치도 해당 실행 시점의 기록이며 최종 배포와 구분한다.

- `final-security-local.log`: OpenAPI·typecheck·단위/운영/DB920건·build·fresh0033·콘텐츠/음성 계약 및 control-plane 통과.
- `final-security-e2e.json`: 단일 전체 실행309통과·30정책 제외·실패0·flaky0. 제외30건은 Chromium 고정 시각 비교의 다른 엔진 중복 실행이다. 초기 IP quota 누적 실패는 별도 로그에 보존한다.
- Preview Worker `685de6fe-8b25-4fc1-814f-cf9a2a59d22b`, Pages [4fd8c218](https://4fd8c218.nihongo-n3.pages.dev), 모두 위 후보 SHA. 86개 배포 파일/Functions 연결 확인.
- `preview-qa-v5-result.json`: 고정 JLPT/TOPIK 계정2개 × Chromium/WebKit, 로그인·로그아웃·일반 사용자 관리자 접근 차단·외부 출처 쓰기 차단·OAuth 시작 경로·찾아보기4탭·문자 회상·3폭/양테마·복습/기록·재개 모달 **47항목 통과**. Google 제공자 로그인 완료와 실제 푸시 수신까지 검사한 것은 아니다.
- 운영 스크립트의 잘못된 관리자 URL, 데스크톱 버튼 보조 표기 누락 및 문자열 치환 문법 오류는 실패 artifact로 보존한다. 제품 코드 변경 없이 실제 경로/기존 UI 계약에 맞춰 검증 스크립트만 수정했다.
- `compatibility-final.json`: 운영 계정/구독 읽기 전용 대조, 기존 푸시 구독의 검증 불합격0·원격 쓰기0. `canonical-pre.json`: 운영 고정 콘텐츠392/392 통과.
- `native-audio-observation.json`: 같은 Preview 실제 Chrome ko/ja 정상 종료 각각2회. Network 기록을 비운 뒤 양언어를 각각1회 다시 재생했고 전체 요청0(R2·legacy0)을 확인했다. 사용자는 질문 `call_9fd6a90e6ff545acbb5251379f63293c`에 **두 언어 모두 들림**으로 답했다. `human-acceptance.json`은 이 Preview·SHA에 연결되며 과거 확인을 재사용하지 않는다.
- 배포 전 초기 운영 검사: 로컬39통과/2경고/실패0, 원격51통과/2경고/실패0(`remote-predeploy-branch.json`). 경고는 당시 후속 문서4개 미커밋과 알려진 manifest 차이이다. 별도 detached worktree의 branch 검사 실패도 보존한다. 배포는 `/private/tmp/jlpt-security-release-20261026-gPFtDt`의 clean 후보에서 수행했다.

### Production 실행 결과 (2026-10-26)

1. 실제 운영0033/77표를 쓰기 동결 상태에서 새로 백업하고 exact-schema 로컬 복원·행 수/해시·FK0·FTS를 검증했다. OAuth 보충 자료는 비공개로 보존했다. 원격 snapshot 전후 불변, migration/콘텐츠 쓰기0. `production-0033-backup-security-20261026-01/result.json`은 `passed:true`, `recovery:restored`, `queues_restored:true`다. 점검을 해제한 후 배포했다.
2. 백업 후 첫 상태 검사는 `pnpm` PATH 누락으로 실행 실패했다. 기존 명시적 `npx --yes pnpm@11.4.0 exec` 경로의 새 `remote-predeploy-after-backup-v2.json`이 통과했다. 최초 실패 파일을 보존하며 운영 장애로 해석하지 않는다.
3. `predeploy-result.json` 통과 후 Worker **`bdeec858-143b-456b-8fe2-c8ea1e40d055`** → Pages **`df4bb452-b588-4f57-ba4f-630378d43529`**에 배포했다. 두 runtime source는 `8d57e1b`, Pages branch는 `main`, canonical은 https://nihongo-n3.pages.dev 이다. OAuth/VAPID 자격 증명·D1 schema·콘텐츠는 그대로 유지했다.
4. 사후 HTTP/호스트 격리 **188/188**, 인증 proxy **3/3**, 고정 source canonical **392/392**, Worker smoke **7/7**, migration ledger/R2 발음 참조0을 확인했다. 첫 `remote-post.json`은 문서가 이전 배포 ID를 가리켜3개 불일치로 실패했다. Cloudflare 실제 값으로 문서만 갱신한 새 `remote-post-v2.json`과 `postdeploy-result.json`이 통과했다. 첫 실패와 `postdeploy-attempt-1.json`은 보존했다.
5. `production-runtime.json`: 정확한 Worker100%·Pages SHA, health200/maintenance off, queue2개 원상 복원 확인. `post-native-audio.json`: 새 운영 배포의 실제 Chrome ko/ja 종료 각1회. 이 사후 화면 검사는 새로운 사람 청취나 운영 Network0 증거가 아니다. 운영 Network UI는 확보하지 못했고, 같은 후보 Preview의 실제 Network0·사용자 가청 증거와 구분한다.

검사 범위를 넘어 모든 취약점이 없다고 보증하지 않는다. 실제 Google 제공자 로그인 완료·실기기 푸시 수신은 이번 사후 검사에서 실행하지 않았다. 문서 후속 커밋은 runtime 재배포 없이 동기화하며 검증된 소스/의존성 변경0을 확인한다.

최종 clean SHA 전체 gate → 격리 Preview Worker/Pages의 기존 로그인·학습·Browse·차단 검증 → 같은 후보 실제 Chrome ko/ja 및 가청 확인 → 현 schema0033/77표 백업·복원 → predeploy → Worker/Pages 배포 → 사후 검사. 현재 운영 OAuth 비밀은 변경하지 않는다. 구 Worker로 복귀하면 이번 방어도 제거된다는 점을 복귀 기록에 명시한다. 데이터 손상 없이 코드만 복귀할 때 D1 학습 데이터를 덮어쓰지 않는다.

복귀 기준선: Worker `69cffaa1-996d-42a7-9080-13c526203e86` → Pages `92c6e58b-f01f-47c6-b1e5-9df9762d3ab8`. 새 배포/학습 이후의 정상 데이터를 전체 백업으로 덮어쓰지 않는다. 최신 운영 값은 [CURRENT_STATE](CURRENT_STATE.md), 실제 배포는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.
