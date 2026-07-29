# TOPIK I 자체 저작 Preview Candidate V1

기준일: 2026-07-27 KST
상태: `draft` / local-only / 사람 검수 대기

## 선택 근거

P3의 첫 batch는 **TOPIK I**다. `topik_content_items`와 immutable
`content_releases` 계약, 정답 비노출 public API, local fresh-D1 verifier가 이미
있다. 반면 JLPT N2는 source intake template만 있고, 권리·원천·한국어 검수가 완료된
실제 source 파일이 없다. 따라서 N2는 source-ready가 아니며 이 batch에 포함하지 않는다.

이 후보의 모든 학습 문장은
[`topik-i-self-authored-preview-v1.json`](data/topik-i-self-authored-preview-v1.json)에
자체 저작 draft로만 기록한다. 공식 TOPIK 기출, 정답지, 대본, 음원은 사용하지 않는다.

## Source Inventory

| Source | URL | robots/terms/license 확인 | 재사용 범위 | retrieval | hash | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| 자체 저작 candidate input | repository source URL | 외부 수집 없음, 프로젝트 자체 저작 라이선스 적용 | local draft와 이후 승인된 release만 | 2026-07-27 | parser가 canonical input으로 계산 | `automated_checked` 후보 |
| TOPIK 공식 사이트 | `https://www.topik.go.kr/` | 이 단계에서 robots/terms/license를 요청·다운로드하지 않음 | 학습 item 원천으로 사용 금지 | 미수집 | 없음 | `blocked: rights` |
| JLPT N2/N1 intake template | [`N2_N1_SOURCE_INTAKE_TEMPLATE_2026-07-27.md`](../00_overview/N2_N1_SOURCE_INTAKE_TEMPLATE_2026-07-27.md) | 원천별 권리·검수 미완료 | seed/manifest 등록 금지 | 미수집 | 없음 | `blocked: rights` |

`blocked: rights` row에는 네트워크 요청을 보내지 않았다. 이후 외부 source가 필요할 경우
URL allowlist, host별 rate limit, conditional request, 식별 User-Agent, snapshot SHA-256,
R2 retention rule을 먼저 구현하고 source별 이용 조건을 사람이 승인한다.

## License Decision Log

| Decision | Scope | 이유 | 결과 |
| --- | --- | --- | --- |
| 허용 | 이 JSON의 신규 자체 저작 문장 | `LicenseRef-nihongo-n3-topik-original` 범위 | draft candidate만 생성 |
| 차단 | 공식 TOPIK 문항·정답·음원 | 공식 시험 콘텐츠의 복제·변형·배포 금지 | 다운로드/파싱/저장하지 않음 |
| 차단 | N2/N1 external intake | 원천 commit·라이선스·이중 검수 미완료 | `CONTENT_PATHS`/manifest에 넣지 않음 |

관련 라이선스 정책은 [ATTRIBUTIONS](../ATTRIBUTIONS.md#topik-자체-저작-콘텐츠)와
이 후보는 현재 일반 TOPIK 커리큘럼의 source가 아니다. 개인용 TOPIK 1~6 unit을
확장할 때에는 현재 source policy와 일반 curriculum seed를 우선한다.

## Immutable Manifest

`packages/db/src/seed/topik-i-preview-candidate.ts`는 입력을 key-sorted canonical JSON으로
해시한다. 다음 값은 verifier report에 기록하며 answer payload 본문은 report에 쓰지 않는다.

- input SHA-256: unit·item 원문 기반
- source SHA-256: unit·item normalized input 기반
- manifest SHA-256: source, parser version, expected row 수, item payload hash 기반
- parser: `topik-i-preview-parser-v1`
- release: `topik-i-self-authored-preview-v1`
- latest local manifest SHA-256: `b2a474140c91c5afdcedc8af53c5b8241cc772dc42bc3d0542c7b35f5f8c92eb`
- latest local source SHA-256: `4683c770efcf67360639f7f175c3eaa972b6e3cf2d062a78b9dbda6218c07f3b`

해시가 달라지면 새 immutable content version을 만들며 기존 release ID나 published item을
수정하지 않는다.

## Review Checklist

| Check | Current state | Release transition |
| --- | --- | --- |
| 저작자 실명/역할 확인 | 대기 | required before `human_reviewed` |
| 한국어 언어 검수자 서명·날짜 | 대기 | required before `human_reviewed` |
| 일본어 해설 검수자 서명·날짜 | 대기 | required before `human_reviewed` |
| 독립 2인 검수자 확인 | 대기 | required before `human_reviewed` |
| source/license/attribution/hash | automated validation 대상 | required before `human_reviewed` |
| duplicate/FK/빈 다국어/정답 payload | local verifier 대상 | G1 |
| API 정답·해설 비노출 | API test 대상 | G2/G3 |

`0014_content_release_review_signoffs.sql`은 reviewer 문자열이 존재해도 status가
`pending`이면 `automated_checked -> human_reviewed` 전이를 거부한다. 이 후보는 실제
사람 검수가 끝나기 전까지 draft/automated_checked에서 멈춘다.

## Coverage Matrix

이 batch는 수량 목표가 아니라 contract 검증을 위한 축소 범위다.

| TOPIK I 학습 영역 | Candidate items | State | Gap |
| --- | ---: | --- | --- |
| Listening | 2 | self-authored draft | 다양성·청감 QA 미완료 |
| Reading | 2 | self-authored draft | 어휘/문법 coverage 확장 필요 |
| Writing | 0 | 해당 시험 level의 candidate 범위 밖 | 없음 |
| 공식 시험 콘텐츠 | 0 | 금지 | 의도적으로 제외 |

## Local Verification

```sh
pnpm -F @nihongo-n3/db topik:preview:candidate:verify
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/api test -- routes.test.ts
pnpm -F @nihongo-n3/web test:run
pnpm verify:ci
```

Verifier는 disposable local D1에 `drizzle-v2` migration을 적용하고 draft release,
source/manifest checksum, row 수, 빈 다국어 field, duplicate/FK, published row 0,
그리고 pending sign-off의 `human_reviewed` 승격 차단을 확인한다.

## Gates

| Gate | State | Evidence |
| --- | --- | --- |
| G0 source/license/reviewer | blocked | 두 human reviewer sign-off 필요 |
| G1 local D1 verifier | pending execution | local report |
| G2 type/unit/build/OpenAPI | pending execution | `pnpm verify:ci` |
| G3 API/PWA Chromium/WebKit | pending execution | local test report |
| G4 backup/withdrawal/operator check | blocked | production release 전 별도 운영 승인 |

이 문서는 candidate를 public route나 remote D1에 연결하지 않는다.
