# 다음 개발·릴리스 실행 계획 — 2026-08-19

상태: **실행 대기**. 이 문서는 production 배포 완료 기록이 아닙니다. 현재 production은 D1 `0000–0023`, Worker `693837d0-70e0-40b7-9f7e-72487321b6f7`, Pages `9d8e6460-2e86-477c-8eb8-fc4c41491f4c`입니다. 로컬 `0024–0027`과 신규 140개 초안은 아직 배포되지 않았습니다.

신규 콘텐츠 release ID는 다음으로 고정합니다.

- JLPT N3: `jlpt-n3-practice-v1-2026-08-19`
- TOPIK owner Batch 5: `topik-owner-batch5-2026-08-19`

## 목표와 중단 원칙

목표는 현재 릴리스를 보존하면서 활동 측정, strict-level weakest 학습, release-quality 연결, Google-only speech 계약, N3/TOPIK 초안을 한 개의 검증 가능한 릴리스 흐름에 넣는 것입니다.

다음 중 하나라도 실패하면 production 변경을 중단합니다.

- backup/restore, migration/FK, OpenAPI/typecheck/unit/build/E2E
- activity idempotency/track 격리, strict-level fallback 차단
- source hash, 자동 validator, 서로 다른 두 reviewer, 정확한 release-quality 링크
- Google speech와 `/api/v1/audio/` 요청 0건
- G0–G4 evidence 또는 preview smoke

## 0. Production 기준선 동결

읽기 전용으로 현재 D1 migration ledger, Worker version, Pages deployment, Git SHA, manifest를 artifact에 기록합니다. 작업 트리의 사용자 변경을 삭제하거나 재설정하지 않습니다.

```bash
git status --short
git rev-parse HEAD
pnpm docs:check
```

실행 프롬프트:

```text
현재 production을 변경하지 말고 기준선만 감사하라. D1은 0023, Worker는 693837d0-70e0-40b7-9f7e-72487321b6f7, Pages는 9d8e6460-2e86-477c-8eb8-fc4c41491f4c로 예상한다. 실제 읽기 전용 결과와 차이가 있으면 즉시 중단하고, backup/rollback 식별자와 콘텐츠 manifest를 하나의 evidence artifact로 기록하라. 사용자 작업 트리는 보존하라.
```

완료 조건: 읽기 전용 결과가 문서 기준선과 일치하고 rollback 대상이 확정됨.

## 1. 로컬 schema·API·web 전체 gate

```bash
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db question:quality
pnpm -F @nihongo-n3/db verify:audio:provenance
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
pnpm docs:check
```

실행 프롬프트:

```text
로컬 코드만 검증하라. migration 0000–0027을 빈 D1에 순서대로 적용하고, 0025가 0026보다 먼저 적용돼도 성공하는지 확인하라. activity event의 idempotency·track 격리·요약, weakest의 요청 급수 밖 fallback 금지, random 요청의 기존 wire shape, Google-only speech를 schema/route/test 세 방향에서 대조하라. 한 검사라도 실패하면 고치기 전 원인과 영향 범위를 보고하고 production 명령은 실행하지 마라.
```

완료 조건: 모든 명령 성공, generated OpenAPI diff 없음, fresh FK/manifest/quality 실패 0건.

## 2. 콘텐츠와 독립 review 고정

JLPT N3 120개와 TOPIK owner 20개의 source hash, validator 결과, 두 독립 reviewer artifact가 동일 최종 draft hash를 가리키는지 확인합니다. source 객체의 publication 상태는 바꾸지 않습니다.

```bash
pnpm -F @nihongo-n3/db test
pnpm -F @nihongo-n3/db question:quality
```

실행 프롬프트:

```text
release jlpt-n3-practice-v1-2026-08-19와 topik-owner-batch5-2026-08-19의 140개 자체 저작 초안을 전수 감사하라. N3는 한자 읽기 60/듣기 60과 각 15/15/15/15, TOPIK은 1급 10/2급 10과 급수별 5영역×2를 확인하라. 선택지 중복, 정답 유일성, 3개 언어 필드, 답-해설 일치, source evidence hash, 두 reviewer의 독립성과 전체 coverage를 대조하라. JLPT is_published=0과 TOPIK release_state=draft를 유지하고 R2 문자열/키/binding이 있으면 실패 처리하라.
```

완료 조건: 140개 자동 검사와 두 review artifact 일치, 초안 상태 유지.

## 3. Snapshot upgrade와 preview rehearsal

production D1 backup을 만든 뒤 restore drill을 수행하고, 복원한 사본에 `0024–0027`을 적용합니다. historical TOPIK v2 release backfill은 먼저 local/preview dry-run으로만 실행해 300 audit 링크, G0–G4, 6개 성공 job의 정확한 개수를 확인합니다.

```bash
pnpm -F @nihongo-n3/db d1:backup -- --help
pnpm -F @nihongo-n3/db d1:restore-drill -- --help
pnpm -F @nihongo-n3/db release:backfill:topik-v2 -- --help
```

실제 target과 guard 인자는 각 스크립트 도움말 및 [content-release-automation skill](../../.codex/skills/content-release-automation/SKILL.md)로 확정한 뒤 실행합니다.

실행 프롬프트:

```text
content-release-automation의 순서를 적용하되 production publication은 하지 마라. production backup과 checksum을 만들고 격리된 DB로 restore drill을 수행하라. 그 사본에 0024–0027을 upgrade 적용해 FK와 기존 데이터 호환성을 검사하라. TOPIK v2 historical backfill을 preview에서 rehearsal하고 정확히 300 audit link, G0–G4 evidence, 성공 job 6개인지 검증하라. 기존 TOPIK v2 공개 상태와 v1 비공개 상태가 바뀌면 즉시 중단하라.
```

완료 조건: restore/upgrade/preview 성공, 기존 콘텐츠 수와 공개 상태 불변, backfill count 정확.

## 4. Chromium·WebKit preview E2E

```bash
pnpm -F @nihongo-n3/e2e exec playwright test \
  learning-activity.spec.ts quiz-modes.spec.ts topik-owner-curriculum.spec.ts \
  --project=chromium --project=webkit
```

실행 프롬프트:

```text
preview Worker/Pages에서 Chromium과 WebKit을 모두 검사하라. activity queue의 offline→retry→duplicate 수렴, 30일 summary, TOPIK next-action 순서, random/weakest, N3 strict-level 부족 오류, TOPIK complete→FSRS review를 확인하라. Google 일본어·한국어 voice를 사용하고 네트워크 감시에서 /api/v1/audio/ 요청이 정확히 0인지 기록하라. trace와 screenshot을 release evidence에 연결하라.
```

완료 조건: 두 브라우저 전부 통과, R2 발음 요청 0건.

## 5. Production 변경 — 명시적 승인 후에만

이 단계는 사용자의 별도 production 승인과 직전 단계의 evidence가 모두 있을 때 root release steward만 실행합니다.

순서:

1. 새 production backup과 restore 가능성 재확인
2. additive migration `0024–0027`
3. 구·신 클라이언트와 호환되는 Worker 배포
4. activity API smoke와 legacy audio `410` 확인
5. 기존 TOPIK v2 historical release/evidence backfill
6. `jlpt-n3-practice-v1-2026-08-19`, `topik-owner-batch5-2026-08-19`의 quality 링크와 G0–G4 생성
7. preview에서 검증된 신규 콘텐츠만 production publication
8. Pages 활성화와 전체 smoke

실행 프롬프트:

```text
사용자의 명시적 production 승인을 확인한 뒤에만 실행하라. 백업 식별자와 직전 Worker/Pages rollback ID를 먼저 출력하라. 0024–0027 → 호환 Worker → API smoke → TOPIK v2 historical backfill → jlpt-n3-practice-v1-2026-08-19 및 topik-owner-batch5-2026-08-19의 G0–G4/quality links → production publication → Pages → smoke 순서를 바꾸지 마라. 각 단계의 실제 row count와 evidence hash를 저장하라. 실패하면 신규 콘텐츠를 draft/rolled_back으로 유지하고 Worker/Pages를 직전 버전으로 복귀하라. 데이터 손상이 확인된 경우에만 D1을 restore하라. R2 발음 명령은 어떤 경우에도 실행하지 마라.
```

완료 조건: remote verifier, API/Pages smoke, activity/FSRS binding, Google speech, R2 요청·참조 0건 통과.

## 6. 출시 후 관찰과 다음 콘텐츠 결정

7일/30일 activity summary로 다음 값을 추적합니다.

- N3 quiz 응답 50건
- TOPIK owner 완료 10건
- TOPIK FSRS 복습 5건
- track/급수/영역별 정답률과 Google speech 성공/불가/오류율

실행 프롬프트:

```text
출시 후 개인 식별 정보나 문제 원문 없이 activity summary만 집계하라. N3 응답 50, TOPIK 완료 10, TOPIK review 5 도달 여부와 영역별 정확도/음성 성공률을 보고하라. 기준을 충족하면 다음 N2/N1/TOPIK 증량 후보를 제안하고, 30일 내 미달이면 콘텐츠 추가를 멈추고 학습 진입 UX와 next-action 노출을 먼저 분석하라.
```

## 최종 인수 체크리스트

- [ ] Production 기준선과 rollback ID 기록
- [ ] `0024–0027` fresh + snapshot upgrade 성공
- [ ] activity API/Dexie/summary/FSRS 바인딩 성공
- [ ] random 호환과 strict-level weakest 성공
- [ ] 140개 전수 validator + 두 review artifact 일치
- [ ] 두 release ID의 exact quality links + G0–G4 성공
- [ ] Chromium/WebKit 성공, `/api/v1/audio/` 0건
- [ ] Google 브라우저 음성만 사용
- [ ] production 승인과 배포 후 verifier/smoke artifact 기록
