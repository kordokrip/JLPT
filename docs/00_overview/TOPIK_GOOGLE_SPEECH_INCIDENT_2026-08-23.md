# JLPT·TOPIK 브라우저 음성 회귀 기록 — 2026-08-23

상태: **회귀 원인 확인 및 복구 구현 완료. Preview/실제 Chrome/Production 검증 결과는 이 문서의 릴리스 증적에만 기록한다.**

현재 오류 전체 목록과 강제 차단 조건은 [오류·회귀 차단 원장](ERROR_LEDGER_2026-08-23.md)을 단일 기준으로 사용합니다.

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

## 복구 계약

- 선택 순서는 `같은 언어 Google voice → 같은 언어 default voice → 첫 번째 같은 언어 voice → 목록이 비어 있으면 utterance.lang 기반 브라우저 해석`입니다.
- 한국어는 `ko-*`, 일본어는 `ja-*`만 허용합니다. 다른 언어의 기본 voice로 읽지 않습니다.
- 비동기 `voiceschanged`와 polling을 최대 2.5초 기다립니다.
- 재생 전에 `speechSynthesis.resume()`을 호출하고, 재생 시간에 비례한 timeout을 둡니다.
- `played`는 실제 utterance `onend` 뒤에만 기록합니다. 부재는 `unavailable`, 예외·`onerror`·timeout은 `error`로 기록합니다.
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
- Web 단위 테스트 `33 files / 90 tests` 통과. Google 이름이 없는 `Yuna(ko-KR)`, `Kyoko(ja-JP)` fallback과 빈 voice 목록의 `utterance.lang` 해석을 포함합니다.
- 동일 언어 fallback과 오류 UI 보강 뒤 Chromium/WebKit 영향 기능 E2E `28/28` 통과. TOPIK 학습·placement·owner, JLPT 퀴즈·청해와 R2 요청 0건을 포함합니다.
- API `8 files / 131 tests`, Web `33 files / 90 tests`, DB `112/112`, Ops `18/18`, OpenAPI `72 public / 12 admin`, production build 통과. API 성공 기록은 listener 자원 고갈 전 실행이며, 아래 현재 재실행 실패와 구분합니다.
- fresh D1은 migration `0000–0027`, canonical seed, FK/FTS, TOPIK practice 300, question quality 332/실패 0, content release contract/control-plane을 종료 코드 0으로 통과했습니다.
- 전체 데스크톱 E2E 첫 실행은 Chromium 전 범위를 통과했지만 WebKit에서 테스트 자원 관리 문제 2건이 발생했습니다. 실패 spec 새 실행은 `11/11` 통과했고, 반복 재현된 다중 page 자원 고갈을 한 page 순회 방식으로 수정했습니다. 수정 후 전체 WebKit·원격 Preview 결과는 확인 전까지 통과로 기록하지 않습니다.

## 릴리스 증적

- 잘못 배포된 Pages: `1c3bba90-8990-472b-8bf2-12a08759597f`.
- 이전 rollback Pages: `7b0e9050-f36c-42a3-aab9-7d09f70df2af`.
- D1 migration/seed와 Worker는 이 음성 복구에서 변경하지 않습니다.
- 새 Preview/Production 배포 ID, 실제 Chrome callback과 사용자 가청 결과는 확인 후 이 절에 추가합니다. 확인되지 않은 항목은 `완료`로 기록하지 않습니다.

### 현재 배포 차단 증거

- 이전 격리 터미널의 GitHub·Cloudflare DNS 실패는 현재 실행 환경에서 해소됐고 remote·DNS·Cloudflare OAuth 인증을 다시 확인했습니다.
- Chrome의 Cloudflare Dashboard 접근은 브라우저 보안 권한에서 허용되지 않아 실행하지 않았습니다. 보안 차단을 다른 브라우저나 간접 경로로 우회하지 않습니다.
- 따라서 이 복구본은 아직 Preview/Production에 쓰이지 않았으며 Production Pages는 위의 잘못 배포된 기준선을 유지합니다. 로컬 빌드 성공을 원격 배포 성공으로 보고하지 않습니다.
- 현재 원래 checkout의 `.git` 쓰기는 복구됐습니다. `verify:ci`와 Chromium·WebKit 기능 E2E를 통과한 변경만 원자적 commit으로 고정하며, 실제 push SHA를 확보하기 전에는 원격 반영으로 기록하지 않습니다.
- 실제 Chrome에서 현재 Production `/audio-qa`의 일본어·한국어 버튼을 각각 눌렀지만 성공·실패 UI 변화가 없었고 페이지 문구도 회귀 배포의 `Google-only` 상태였습니다. 자동화 isolated world의 `speechSynthesis=false` 결과는 앱 main world의 기능 근거로 재사용하지 않습니다.
- 동일 84개 변경 파일은 별도 writable clone의 안전 커밋으로 고정하고 검증된 bundle/patch를 `.artifacts/recovery/audio-2026-08-23/`에 보존했습니다. 원격 branch에는 반영되지 않았으므로 배포 증거가 아닙니다.
- 새 실행 환경의 로컬 재검증은 Ops `18/18`, DB `112/112`, Web `90/90`, API `131/131`, typecheck, build, OpenAPI, fresh D1, 문서 링크를 종료 코드 0으로 통과했습니다. Chromium·WebKit 전체 기능 E2E도 `128 passed / 2 skipped`로 통과했습니다.
- Worker 배포 명령은 현재 clean HEAD와 동일한 40자 `RELEASE_SHA`를 필수로 받고 Wrangler CLI 변수로 주입하도록 교체했습니다. 운영 기준선 SHA가 새 코드의 관측 release로 잘못 재사용되면 업로드 전에 실패합니다.
