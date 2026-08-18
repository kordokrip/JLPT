# 2026-08-19 릴리스 기록과 다음 개발 계획

상태: **Production 배포 및 사후 검증 완료**.

## 현재 기준선

| 항목 | Production 값 |
| --- | --- |
| D1 | `nihongo-n3-prod-v2`, migration `0000–0027` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| Pages | `https://7b0e9050.nihongo-n3.pages.dev` |
| source release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |

| Release | 상태 | Quality links |
| --- | --- | ---: |
| `jlpt-n3-practice-v1-2026-08-19` | published | 120 |
| `topik-owner-batch5-2026-08-19` | published | 20 |
| `topik-practice-v2-2026-08-17` | published historical release | 300 |

배포 후 remote DB verifier와 TOPIK v2 verifier가 통과했습니다. Question quality는 332개 검사/실패 0건, R2 pronunciation 참조는 0건이며 Chromium·WebKit production E2E도 통과했습니다.

## 완료된 시계열

1. Production 기준선과 rollback 대상을 고정하고 D1 backup/restore 가능성을 확인했습니다.
2. Migration `0024–0027`을 적용해 activity event, JLPT practice bank, release-quality link, Google speech contract를 활성화했습니다.
3. 호환 Worker를 배포하고 activity API, strict-level `weakest`, TOPIK progress/FSRS 바인딩을 활성화했습니다.
4. Historical TOPIK v2 audit 300개를 release/evidence에 연결했습니다.
5. N3 120문항과 TOPIK owner 20항목의 두 독립 review, quality link, G0–G4를 확인하고 published로 전환했습니다.
6. Pages를 활성화하고 remote verifier, smoke, Chromium/WebKit production E2E를 통과했습니다.
7. Google 브라우저 음성과 `/api/v1/audio/` 요청 0건, R2 pronunciation 참조 0건을 확인했습니다.

## 1. 배포 직후 기준선 보존

현재 버전과 release 수량을 변경 불가능한 운영 evidence에 기록합니다.

실행 프롬프트:

```text
production을 변경하지 말고 2026-08-19 릴리스 기준선을 읽기 전용으로 감사하라. D1 migration 0000–0027, Worker 6bbe4bbd-b02d-42d3-9dfc-ad9187a86872, Pages https://7b0e9050.nihongo-n3.pages.dev, source SHA 3485c6ef8addda3cd3e209730646c296175cf3c9를 확인하라. release별 published 상태와 quality link 120/20/300을 기록하고 차이가 있으면 즉시 incident 후보로 보고하라.
```

완료 조건: 버전, migration ledger, release 상태, link 수가 이 문서와 일치.

## 2. 7일 데이터 바인딩 관찰

Activity 원문이나 개인정보를 조회하지 않고 집계와 관계 무결성만 확인합니다.

실행 프롬프트:

```text
최근 7일 activity summary와 서버 관계를 읽기 전용으로 검사하라. quiz_answered가 같은 N3 content ID에 연결되는지, TOPIK content_completed가 progress와 FSRS card에 연결되는지, review_rated가 review log와 다음 due에 연결되는지 표본 대조하라. event duplicate는 idempotency 결과로 별도 집계하고 track 간 데이터 누출이 한 건이라도 있으면 즉시 중단·보고하라.
```

완료 조건: orphan event 0, track mismatch 0, 중복 재전송이 중복 row를 만들지 않음.

## 3. 학습 추천 품질 관찰

TOPIK 다음 행동과 JLPT `weakest`의 실제 선택 결과를 확인합니다.

실행 프롬프트:

```text
production activity summary를 사용해 TOPIK next-action이 due review → incomplete owner → weakest area 순서를 지키는지 확인하라. JLPT weakest는 최근 30일 오답을 우선하되 요청 급수 밖 item을 반환하지 않는지 검사하라. random 요청은 strategy 필드가 없는 기존 wire shape와 동일한지 회귀 확인하라. 결과가 없을 때 다른 급수 fallback 대신 명시적 부족 응답이 나오는지 기록하라.
```

완료 조건: 추천 순서와 strict-level 불변 조건 위반 0건.

## 4. Google-only 음성 회귀

발음은 브라우저 Google 음성만 사용합니다. R2 발음 수집·생성·저장·조회·재생·fallback은 계속 금지합니다.

실행 프롬프트:

```text
Chromium과 WebKit production에서 JLPT 일본어와 TOPIK 한국어 음성을 재생하라. Google browser voice의 played/unavailable/error activity 결과를 확인하고 /api/v1/audio/ 네트워크 요청, R2 pronunciation key, legacy audio binding 신규 row가 모두 0인지 검증하라. report/evidence용 R2를 pronunciation 경로로 오인하지 마라.
```

완료 조건: 두 브라우저 통과, `/api/v1/audio/` 요청 0, R2 pronunciation 참조 0.

## 5. 30일 학습 지표와 다음 증량 결정

다음 임계값을 충족할 때만 콘텐츠 증량을 결정합니다.

- N3 quiz 응답 50건
- TOPIK owner 완료 10건
- TOPIK FSRS 복습 5건
- track/급수/영역별 정답률과 Google speech 성공/불가/오류율

실행 프롬프트:

```text
개인정보와 문제 원문 없이 30일 activity summary만 집계하라. N3 응답 50, TOPIK 완료 10, TOPIK review 5 도달 여부와 영역별 정확도/음성 성공률을 보고하라. 기준을 충족하면 N2 Batch 6, N1 Batch 5, TOPIK 급수별 증량 후보를 실제 취약도 순으로 제안하라. 30일 내 미달이면 콘텐츠 추가를 중단하고 학습 진입 UX와 next-action 노출을 먼저 분석하라.
```

완료 조건: 데이터 기반으로 “증량” 또는 “진입 UX 개선” 중 하나를 결정.

## 6. 다음 릴리스 공통 gate

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
다음 콘텐츠 release도 source intake → 자체 저작 → 서로 다른 두 reviewer → 자동 validator → exact release-quality links → G0–G4 → fresh D1 → snapshot upgrade → preview → backup/restore → 명시적 production 승인 → smoke 순서를 지켜라. 하나라도 실패하면 draft를 유지하고 publication하지 마라. Google 브라우저 음성 외의 발음 provider나 R2 pronunciation 경로를 추가하지 마라.
```

## 인수 체크리스트

- [x] Production D1 `0000–0027`
- [x] Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`
- [x] Pages `https://7b0e9050.nihongo-n3.pages.dev`
- [x] Release quality links `120/20/300`, 모두 published
- [x] Remote DB/TOPIK verifier 통과
- [x] Question quality `332/0`
- [x] Chromium/WebKit production E2E 통과
- [x] Google 브라우저 음성만 사용, R2 pronunciation 참조 0
- [ ] 7일 데이터 바인딩 관찰
- [ ] 30일 학습 지표 기반 다음 우선순위 결정
