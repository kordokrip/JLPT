# JLPT·TOPIK 브라우저 음성 회귀 기록 — 2026-08-23

상태: **2026-08-24 추가 원인까지 복구하고 source `2bd657e...`를 Preview와 Production에 배포했다. 로컬 전체 검증, Production Chromium/WebKit 영향 기능, 실제 Chrome 한국어·일본어 lifecycle을 통과했다. 물리 스피커 가청 여부는 자동 증거와 구분한다.**

현재 오류 전체 목록과 강제 차단 조건은 [오류·회귀 차단 원장](ERROR_LEDGER.md)을 단일 기준으로 사용합니다.

## 책임과 잘못된 이전 판정

- 정상 동작하던 `Google 음성 우선 → 같은 언어 기기 음성 fallback`을 리팩터링에서 제거하고, voice 이름 또는 URI에 `Google`이 포함된 경우만 허용한 것이 직접 원인입니다.
- 자동 E2E에 `Google Korean`·`Google 日本語` fixture를 주입하고 즉시 `onend`를 발생시킨 결과를 실제 가청 재생처럼 보고한 것도 잘못입니다.
- 실제 Production 집계는 당시 TOPIK `played 0 / unavailable 13 / error 0`이었고, 사용자는 한국어·일본어 모두 재생되지 않는 현상을 확인했습니다. 이 상태에서 “검증 완료”라고 보고하고 Pages를 배포한 판정은 오류였습니다.
- Google Cloud TTS 자격 증명이나 사용자의 별도 승인이 필요하다고 설명한 것은 원인을 잘못 외부화한 것입니다. 이 장애는 새 서비스를 도입할 문제가 아니라 제거된 browser fallback을 복구할 문제였습니다.

## 원인 교차검증

Git 이력과 현재 코드를 대조했습니다.

1. 정상 버전 `8485f9a`는 Google voice를 우선한 뒤 기본 같은 언어 voice와 첫 번째 같은 언어 voice를 허용했습니다.
2. 회귀 버전 `3485c6e`는 `name + voiceURI`에 `google`이 없는 voice를 모두 거부했습니다.
3. macOS Chrome이 노출하는 `Yuna`, `Kyoko` 같은 한국어·일본어 시스템 voice는 정상적인 Web Speech voice지만 이 필터를 통과하지 못했습니다.
4. TOPIK `useKoreanAudio`와 JLPT 공용 `audioPlayer`가 같은 잘못된 가정을 사용했기 때문에 TOPIK만이 아니라 발음·청해·퀴즈·복습 전체가 영향을 받았습니다.
5. fallback 복구 뒤에도 click handler가 voice 목록을 최대 2.5초 기다린 다음 `speak()`를 호출했습니다. 이 `await`는 Chrome/WebKit의 사용자 활성화 구간을 소진해 첫 클릭이 무음이 될 수 있었습니다.
6. 설치형 PWA는 서비스 워커 업데이트를 사용자 확인에 맡겨, 새 Pages가 존재해도 이미 열린 앱이 이전 회귀 JS를 계속 실행할 수 있었습니다.

## 복구 계약

- 선택 순서는 `같은 언어 Google voice → 같은 언어 default voice → 첫 번째 같은 언어 voice → 목록이 비어 있으면 utterance.lang 기반 브라우저 해석`입니다.
- 한국어는 `ko-*`, 일본어는 `ja-*`만 허용합니다. 다른 언어의 기본 voice로 읽지 않습니다.
- `voiceschanged`와 polling은 다음 재생을 위한 background warm-up에만 사용합니다. 현재 클릭에서는 Promise를 기다리지 않고 즉시 `speechSynthesis.speak()`를 호출해 사용자 활성화를 보존합니다.
- 재생 전에 `speechSynthesis.resume()`을 호출하고, 재생 시간에 비례한 timeout을 둡니다.
- `onstart`가 8초 안에 오지 않으면 시작 실패로 처리해 영구적인 `재생 중` 상태를 막습니다.
- `played`는 실제 utterance `onend` 뒤에만 기록합니다. 부재는 `unavailable`, 예외·`onerror`·timeout은 `error`로 기록합니다.
- 서비스 워커는 즉시 등록하고 online/visibility 때 update를 확인합니다. 이미 이전 worker가 제어하던 PWA만 `controllerchange` 때 한 번 reload하며, 첫 방문자의 초기 설치는 reload하지 않습니다.
- JLPT 발음·청해도 실패를 조용히 무시하지 않고 화면의 오류 상태로 표시합니다.
- R2 발음 수집·생성·저장·조회·재생·fallback과 `/api/v1/audio/` 요청은 계속 0건이어야 합니다.
- API의 `kind: "google"`, D1의 provider `google-browser`는 기존 클라이언트·데이터 호환을 위한 식별자입니다. 런타임 의미는 `Google 우선 same-language browser speech`이며 Google 이름 강제 조건이 아닙니다.

## 검증 원칙

자동 테스트는 코드 선택·lifecycle·R2 미사용 회귀를 검증하지만 물리 스피커의 가청 출력을 대신 증명하지 않습니다. 따라서 다음 증거를 분리합니다.

1. 단위 테스트: Google이 없어도 같은 언어 voice로 재생, 다른 언어 차단, `onend` 전 성공 기록 금지.
2. Chromium/WebKit E2E: 한국어·일본어 전체 학습 표면, 오류 UI, `/api/v1/audio/` 요청 0건.
3. 실제 Chrome: mock 없이 Web Speech API 존재, 한국어·일본어 voice 각 1개 이상, 각 utterance `onend` 1회 이상.
4. 사용자 가청 확인: 실제 장치에서 두 언어가 들린 사실. 이 항목은 자동 callback 결과와 구분해 기록합니다.

`pnpm release:verify:actual-audio -- --input <evidence.json>`은 mock 금지, 양 언어 voice/재생 수, Google 우선 정책, 같은 언어 fallback 허용, 사용자 가청 확인, R2 fallback 금지와 불변 release SHA·deployment ID 결합을 검사합니다.

## 현재 자동 교차검증

- Web/API/DB/Shared typecheck 통과.
- Web 단위 테스트 `33 files / 91 tests` 통과. Google 이름이 없는 `Yuna(ko-KR)`, `Kyoko(ja-JP)` fallback, 빈 voice 목록의 즉시 `speak()`, 첫 클릭 사용자 활성화 보존을 포함합니다.
- 동일 언어 fallback과 오류 UI 보강 뒤 Chromium/WebKit 영향 기능 E2E `28/28` 통과. TOPIK 학습·placement·owner, JLPT 퀴즈·청해와 R2 요청 0건을 포함합니다.
- API `8 files / 131 tests`, Web `33 files / 90 tests`, DB `112/112`, Ops `18/18`, OpenAPI `72 public / 12 admin`, production build 통과. API 성공 기록은 listener 자원 고갈 전 실행이며, 아래 현재 재실행 실패와 구분합니다.
- fresh D1은 migration `0000–0027`, canonical seed, FK/FTS, TOPIK practice 300, question quality 332/실패 0, content release contract/control-plane을 종료 코드 0으로 통과했습니다.
- 전체 E2E는 데스크톱 Chromium·WebKit, 모바일, 시각 회귀를 포함해 `171 passed / 32 skipped / 0 failed`로 종료 코드 0을 확인했습니다. skip은 project 범위와 의도적으로 비활성화된 환경 fixture입니다.
- 익명 `/audio-qa` 양언어 호출·오류 UI·R2 미사용을 포함한 영향 E2E는 Chromium·WebKit `14/14`를 통과했습니다.
- 2026-08-24 수정 뒤 음성·퀴즈·복습·TOPIK owner 영향 E2E는 Chromium/WebKit `40 passed / 2 skipped / 0 failed`, 전체 데스크톱·모바일·시각 E2E는 `171 passed / 32 skipped / 0 failed`입니다. 최초 영향 E2E에서 2건이 이전의 “voice를 기다린 뒤 첫 재생” 계약을 기대해 실패했고, 제품 계약을 즉시 첫 재생으로 수정한 뒤 전체를 재실행해 종료 코드 0을 확인했습니다.
- 첫 Preview `efbc8db5-f9fd-444d-8d27-d433372002aa`에서는 새 방문자도 강제 reload하는 PWA 복구 코드 때문에 browse/quiz 원격 검사가 중단됐습니다. Production에는 반영하지 않았고, 기존 controller가 있는 PWA만 갱신하도록 범위를 축소한 새 SHA/Preview에서 전부 재검증합니다.
- 범위 축소 뒤 Web unit `34 files / 93 tests`, 음성·PWA·offline·퀴즈·복습·TOPIK owner Chromium/WebKit `50 passed / 2 skipped / 0 failed`, 전체 데스크톱·모바일·시각 `171 passed / 32 skipped / 0 failed`로 다시 통과했습니다.
- 최종 Preview 실제 기능 세트는 최초 `33 passed / 8 skipped / 1 failed`였습니다. 실패 1건은 Chromium N2 browse의 synthetic registration/home readiness timeout이었고 같은 단일 검사를 즉시 재실행해 통과했습니다. skip은 격리 로컬 DB fixture와 환경 제한입니다.
- Production에서는 음성 단독 Chromium/WebKit `2/2`, JLPT N1/N2·퀴즈·청해·SRS·TOPIK owner→FSRS·PWA·offline 영향 기능 `44 passed / 8 skipped / 0 failed`를 통과했습니다.

## 릴리스 증적

- 복구 source commit: `2bd657e96d8a43c6d28efe414acd468c1abd0861` (`feature/topik-product-expansion`, 원격 push 완료).
- 폐기한 Preview: `efbc8db5-f9fd-444d-8d27-d433372002aa`. 첫 방문자 강제 reload를 발견해 Production에 반영하지 않았습니다.
- 최종 Preview: `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0` (`https://d53c3b4f.nihongo-n3.pages.dev`).
- Production: `9cc58a1f-4772-4129-b90d-c819ca20d700` (`https://9cc58a1f.nihongo-n3.pages.dev`, canonical `https://nihongo-n3.pages.dev`).
- rollback Pages: `485b9f00-a8b1-4bbb-9001-a238651fb212`.
- Production asset: `assets/index-DprkUCgI.js`; `/audio-qa`와 auth proxy `200`, legacy `/api/v1/audio/test` `410`.
- 실제 Chrome Production `/audio-qa`: 일본어·한국어 모두 클릭 0.3초·2.8초 뒤 `재생 중`, 이후 `onend` 정상 종료, alert `0`, console error `0`.
- 원격 R2 발음 참조는 vocab/kanji/sentences/reading/audio log 합계 `0`입니다.
- D1 migration/seed와 Worker는 이 Pages 전용 복구에서 변경하지 않았습니다. Worker는 `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`를 유지합니다.
- Production D1은 실제 콘텐츠 source `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4`, 운영 seed run에 고정한 remote verifier `280/280`을 통과했습니다.

## 사후 확인과 남은 공개 항목

- 실제 Chrome lifecycle은 성공했지만 물리 스피커로 소리가 들렸는지는 자동화가 판정하지 않습니다. 사용자 장치의 가청 확인과 실제 `played` telemetry는 별도 사후 증거로 남깁니다.
- 현재 HEAD로 새 manifest를 생성해 운영 D1과 직접 비교하면 15개 repository-managed 문서의 음성 정책 문구 변경 때문에 차단 검사 45건이 실패합니다. DB를 재시드해 숨기지 않고 `INC-DATA-024`로 기록했습니다. verifier가 immutable release SHA/manifest를 명시적으로 입력받도록 후속 보강합니다.
- 동일 복구 변경은 `.artifacts/recovery/audio-2026-08-23/`의 bundle/patch에도 보존했지만, 공식 증적은 원격 commit과 위 Cloudflare deployment ID입니다.
