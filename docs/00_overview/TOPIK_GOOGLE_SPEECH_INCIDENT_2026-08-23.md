# TOPIK Google 한국어 음성 장애 기록 — 2026-08-23

상태: **코드 수정 및 로컬 전수 회귀 검증 완료, Production 미반영**.

## 영향과 운영 증거

- Production TOPIK 학습 화면의 재생 버튼이 첫 클릭에서 `Google 한국어 음성을 사용할 수 없습니다`를 표시하는 현상을 실제 로그인 세션에서 재현했습니다.
- 2026-08-23 KST에 Production D1의 최근 30일 `learning_activity_events`를 개인정보와 문제 원문 없이 읽기 전용으로 집계한 결과는 다음과 같습니다.

| 지표 | 결과 |
| --- | ---: |
| TOPIK Google speech `played` | 0 |
| TOPIK Google speech `unavailable` | 13 |
| TOPIK Google speech `error` | 0 |
| N3 quiz 응답 | 0 / 50 |
| TOPIK owner 완료 | 0 / 10 |
| TOPIK FSRS 복습 | 0 / 5 |

따라서 2026-08-19의 테스트 통과 기록은 당시 fixture가 Google 음성을 즉시 반환하는 경우만 검증했다는 한계가 있습니다. 실제 Chromium의 비동기 `voiceschanged` 준비 과정과 첫 클릭을 검증하지 못했으므로, 그 기록을 실제 사용자 음성 성공의 증거로 재사용하지 않습니다.

## 원인

1. TOPIK `useKoreanAudio`가 첫 클릭에서 `speechSynthesis.getVoices()`를 한 번만 읽었습니다. Chromium이 Google 원격 음성 목록을 비동기로 채우기 전이면 빈 목록을 즉시 `unavailable`로 판정했습니다.
2. 중지 로직이 오래된 `HTMLAudioElement`만 정리하고 현재의 `speechSynthesis`를 취소하지 않았습니다.
3. `speechSynthesis.speak()` 호출 직후 실제 `onend`보다 먼저 `played` 활동을 기록해 성공률을 과대 집계할 수 있었습니다.
4. JLPT 공용 재생기도 임의의 일본어 시스템 음성이 먼저 보이면 준비 완료로 판정해, 뒤늦게 도착하는 Google 일본어 음성을 기다리지 않는 같은 계열의 결함이 있었습니다.

## 수정

- 공용 `google-browser-speech` 준비기를 추가해 Google 음성이 즉시 없으면 `voiceschanged`와 짧은 polling을 최대 2.5초 동안 함께 기다립니다.
- 한국어는 `ko-*`이면서 이름 또는 URI에 `google`이 있는 음성만, 일본어는 `ja-*`이면서 Google인 음성만 허용합니다.
- TOPIK 모든 재생 호출을 비동기 계약으로 통일하고 첫 클릭, 중지, 화면 이탈, 연속 재생의 경합을 취소합니다.
- 성공 활동은 실제 `onend`에서만 `played`로 기록하고, `onerror` 또는 예외는 `error`, API/Google 음성 부재는 `unavailable`로 기록합니다.
- R2 발음 수집·생성·저장·조회·재생·fallback은 추가하지 않았습니다. `/api/v1/audio/` 요청도 만들지 않습니다.

## 교차검증 결과

- TOPIK/JLPT 음성 단위 테스트: 10/10 통과. 비동기 Google 음성 도착, 비-Google fallback 차단, 실제 종료 전 성공 기록 금지, 오류 기록을 포함합니다.
- Web 전체 단위 테스트: 34파일 89테스트 통과.
- API 전체 테스트: 128테스트 통과.
- DB 전체 테스트: 83테스트 통과.
- Ops 테스트: 8테스트 통과.
- OpenAPI, 전체 typecheck, lint, production build 통과.
- `verify:fresh`: migration `0000–0027`, FK, manifest, TOPIK v2, 문제 품질, release control 통과.
- 기능 E2E: Chromium/WebKit에서 TOPIK 학습·진단·문제·해설·owner 완료→FSRS, 한글 문자 학습, JLPT 퀴즈·청해·N2/N1·SRS, 활동 집계 흐름 42통과/정책상 2건 skip.
- 전체 E2E 최초 실행: 기능 실패는 없었고 166통과/32 skip, TOPIK 대시보드의 오래된 모바일·태블릿 기준 이미지 3건만 실패했습니다. 현재 요구사항인 학습 언어 전환과 다음 학습 카드를 실제 이미지로 대조한 뒤 기준선을 갱신했습니다.
- 갱신 후 전체 E2E 재실행: Chromium·WebKit·모바일 조합 `169 passed / 32 policy skip / 0 failed`.

Web Speech API 또는 Google 한국어 음성이 실제 브라우저/운영체제에 없으면 정책상 재생은 `unavailable`로 종료합니다. 비-Google 시스템 음성이나 R2로 우회하지 않습니다. 자동화는 지연된 Google 한국어 음성의 선택과 재생 lifecycle을 Chromium/WebKit에서 결정적으로 검증하지만, 물리 스피커의 가청 출력 자체를 증명하지는 않습니다.

## 다음 조치

1. 갱신된 시각 기준선으로 전체 E2E를 다시 통과시킵니다.
2. 현재 Production Pages `7b0e9050-f36c-42a3-aab9-7d09f70df2af`를 rollback 기준으로 기록합니다.
3. Production 권한과 분리된 Pages preview에 배포해 앱/API smoke와 Google-only 음성 회귀를 확인합니다.
4. 이 세션에서 명시적인 Production 배포 승인이 있을 때만 Pages를 승격합니다. D1 migration/seed와 Worker 변경은 없습니다.
5. 배포 후 실제 사용자 Chrome에서 `played`가 기록되는지 관찰하고, `unavailable`이면 `/audio` 또는 R2 fallback을 추가하지 말고 Web Speech API와 Google 음성 설치 상태를 진단합니다.
6. N3 `50`, TOPIK 완료 `10`, TOPIK FSRS 복습 `5`를 모두 충족하기 전에는 N2/N1/TOPIK 콘텐츠 증량을 시작하지 않습니다.
