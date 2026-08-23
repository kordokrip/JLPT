# N2/N1 문제은행·TOPIK Batch 6 릴리스 기록 — 2026-08-23

상태: **구현·독립 리뷰·로컬·Preview 완료, Production 차단**.

## 범위

| release | 콘텐츠 | 수량 | Preview quality link |
| --- | --- | ---: | ---: |
| `jlpt-n2-practice-v1-2026-08-23` | N2 4모드×15 | 60 | 60 |
| `jlpt-n1-practice-v1-2026-08-23` | N1 4모드×15 | 60 | 60 |
| `topik-owner-batch6-2026-08-23` | TOPIK 3–6급, 급수별 5영역×2 | 40 | 40 |

N2/N1은 모드별 난이도 1–5를 각 3문항으로 배치했고 급수 전체 정답 위치는 `15/15/15/15`입니다. TOPIK 선택형은 급수별 `2/2/2/2`, 쓰기 8개는 다국어 rubric, 듣기 8개는 `audio_text_ko`와 `google-browser` binding을 가집니다.

## 고정 증적

- intake artifact SHA: `85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502`
- final draft SHA: `e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070`
- Reviewer A artifact SHA: `6189f62908e17e2f7384a7e6385b11000ad8db1b3f722a18daa36d3e43fdcf51`
- Reviewer B artifact SHA: `c679d3c10017ac2a4166afd1599d8b8468de665dbf178fc2c3c2f4eeb5f247a2`
- combined review SHA: `a4dfcd6b17e5ec058956c35f9e0379d1bf638ecfb239aa31e88cea7365b246e6`
- 두 reviewer는 서로 결과를 공유하지 않고 최종 160개를 각각 승인했습니다.

## 코드·API 변경

- N2/N1은 공개 정적 bank를 우선 사용하고 16–20문항 요청만 같은 급수 canonical로 채웁니다.
- `weakest`는 최근 30일 같은 급수 오답을 우선하며 다른 급수로 fallback하지 않습니다.
- 선택지는 세션에서 정답 위치가 회전하고 `answer`와 canonical listening의 정답 번역인 `script_ko`는 제출 전에 반환하지 않습니다.
- 기존 `POST /api/v1/quiz/generate` 요청·응답 형식은 유지합니다.
- Preview 실제 Batch 6 item으로 `완료 → progress → FSRS card → review log → activity event`를 검증했습니다.

## 검증 결과

- 레거시 정리 후 전체 CI: ops 8, DB 112, web 88, API 131, typecheck/build/OpenAPI 통과
- fresh D1 migration `0000–0027`, FK/FTS, content contract/control plane 통과
- 로컬 reviewed seed 160개 공개 및 재실행 idempotency 통과
- Preview 기존 기준선 누락을 canonical seed로 보강한 뒤 TOPIK owner 전 급수 30개·급수/영역별 6개 확인
- Preview TOPIK practice v2 300 audit ledger를 내용 변경 없이 복구하고 verifier 통과
- Preview question quality 332개, 실패 0; R2 pronunciation 참조 0; FK 0
- Preview Worker `0de3eaeb-b44c-4eda-b333-e75c639e39a1`, smoke 21/21
- 현재 UI와 Preview Worker/D1 조합 E2E: Chromium 14/14, WebKit 14/14
- 로컬 전수 영향 E2E: Chromium 17/17, WebKit 17/17

## 발견·수정한 회귀

1. Preview D1에 TOPIK owner Batch 1–4 기준선과 기존 practice v2 ledger가 누락되어 있었습니다. canonical parity seed와 v2 idempotent control-plane seed로 Preview만 복구했습니다.
2. Preview smoke가 Google OAuth 비활성 설정에서도 302를 강제했습니다. `/auth/config.google_enabled=false`이면 `/google/start` 503을 정상 계약으로 검사하도록 수정했습니다. Google OAuth와 Google 브라우저 음성은 서로 다른 기능입니다.
3. 퀴즈 E2E가 선택 상태 렌더링 전에 이동해 `4/5` 레이스를 만들었습니다. 생성된 question ID 유일성과 각 `aria-checked=true`를 기다리도록 강화했습니다.

## Production 차단 사유

실제 Chrome의 기존 탭과 새 탭에서 모두 `speechSynthesis=false`, Google 한국어·일본어 voice 0개였습니다. 따라서 두 언어 각각 최소 1건의 실제 `played` 기록을 만들 수 없었습니다.

문서·코드 정리 뒤 실제 로그인된 Chrome에서 Production TOPIK 학습 화면의 재생 버튼까지 다시 실행했지만 같은 환경 제약이 유지됐습니다. fixture나 합성 이벤트를 Production 승인 증거로 사용하지 않습니다.

Production D1 backup/seed, Worker 배포, Pages 재배포는 실행하지 않았습니다. 기존 Production 릴리스를 유지합니다. Google voice 제공 환경이 복구된 뒤 실제 `onend → played` 두 언어를 확인하고 production-predeploy gate를 새로 생성해야 합니다. R2 발음과 `/api/v1/audio/` fallback은 금지합니다.

## 저장소 최신화

- 완료된 과거 실행계획·이관 문서와 TOPIK I Preview 후보 전용 구현을 제거하고 현재 상태·감사·로드맵·이 릴리스 기록으로 문서 기준을 통합했습니다.
- 사용처가 없던 legacy R2 audio prefetch no-op과 그 전용 테스트를 제거했습니다. `410 Gone` API 차단과 R2 pronunciation reference 0 검사는 유지합니다.
- N2/N1/TOPIK Batch 6의 source, 독립 리뷰, validator, release-quality 및 growth-readiness 테스트는 배포 차단 근거이므로 유지합니다.

## 지표 정책

이번 첫 증량은 `N3 50 / TOPIK 완료 10 / TOPIK FSRS 5` 미달과 무관하게 품질 gate로 준비하는 확정 예외입니다. Production 반영 후 D+1/D+7/D+30에 같은 최근 30일 accepted event를 집계합니다. D+30에도 미달이면 Batch 7을 만들지 않고 학습 진입 UX와 next-action 노출을 먼저 개선합니다.
