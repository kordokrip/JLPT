# 계정·요청 경계 보안 보강 — 2026-10-26

상태: 구현 및 로컬 영향 검증. Production 미반영. 담당 변경자: 강성호.

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
- 보안 스캔 ID `81a653d5-770e-4e37-ba00-29e2232ebd52`의 최초 보고서는 역사적 발견 증거로 보존한다. 그 보고서의 발견 상태를 편집해 새 배포 성공으로 바꾸지 않는다.

## 릴리스 조건과 복귀

최종 clean SHA 전체 gate → 격리 Preview Worker/Pages의 기존 로그인·학습·Browse·차단 검증 → 같은 후보 실제 Chrome ko/ja 및 가청 확인 → 현 schema0033/77표 백업·복원 → predeploy → Worker/Pages 배포 → 사후 검사. 현재 운영 OAuth 비밀은 변경하지 않는다. 구 Worker로 복귀하면 이번 방어도 제거된다는 점을 복귀 기록에 명시한다. 데이터 손상 없이 코드만 복귀할 때 D1 학습 데이터를 덮어쓰지 않는다.

현재 기준선: Pages `92c6e58b-f01f-47c6-b1e5-9df9762d3ab8`, Worker `69cffaa1-996d-42a7-9080-13c526203e86`. 최신 완료 여부는 [CURRENT_STATE](CURRENT_STATE.md), 실제 배포는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.
