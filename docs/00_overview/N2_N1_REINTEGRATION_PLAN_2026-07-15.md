# N2/N1 콘텐츠 재통합 계획

기준일: 2026-07-15 KST
상태: 계획 (콘텐츠는 `wip/n2-n1-content-2026-07-14` commit `1ae2401`에 격리)
게이트 기준: [ROADMAP](../ROADMAP.md) "N2/N1 정책" — 파일 존재 + provenance + 검수 완료 전 seed 등록 금지
실행 프롬프트: [CODEX_NEXT_PROMPTS_2026-07-15.md](./CODEX_NEXT_PROMPTS_2026-07-15.md) N6
구 문서: `N2_N1_CONTENT_UPDATE_GUIDE.md`(7/14)는 wip 브랜치에 보존되며, 그 안의 적용 커맨드는 R1 파이프라인 변경으로 **무효**다.

## 1. 결론

7/14 세션에서 생성한 N2/N1 전체 세트(한자 1,599자 · 어휘 4,605개 · 문법 265문형)는 유효한 자산이지만, R1이 seed 파이프라인 계약을 바꿨기 때문에 그대로 병합할 수 없다. 재통합은 **rebase → provenance 확정 → 검수 태그 0건 → manifest 등록 → 검증** 순서를 강제하며, 어느 단계도 건너뛰지 않는다.

## 2. R1 이후 달라진 계약 (구 가이드와의 차이)

| 항목 | 7/14 가이드 기준 | 7/15 현재 (R1) |
| --- | --- | --- |
| seed 등록 | `constants.ts` CONTENT_PATHS + `seed.ts` collect | + `content-manifest.ts` sourceCatalog·buildSeedDefinitions·expectedRows 필수 |
| sources 등록 | 수동 SQL (`migrate/n2-n1-sources.sql`) | drizzle-v2 다음 번호 migration으로 편입 (구 SQL 파일은 wip 브랜치에만 존재) |
| 파서 | `의미` 헤더만 인식 | `의미`/`뜻`/`한국어 뜻` 인식, **빈 뜻 실패**, naturalKeys로 소스 간 중복 차단 |
| seed-diff | 부분 diff seed | validation-only (D1 쓰기 없음) |
| 검증 | `pnpm db:verify` | `seed:diff` → `verify:fresh` (row/checksum·FTS parity·FK·중복·필수값) |
| 운영 반영 | wrangler 직접 실행 | GitHub `Content and D1 Change Control` workflow + Environment 승인만 |
| 레벨 계약 | schemas.ts 확장 필요 | 완료 — 타입은 N5~N1 지원, 콘텐츠 출시와 별개 |

## 3. 재통합 전제 조건 (전부 충족 필요)

1. **원본 파일**: 한자 2·어휘 5·문법 2 = 9개 MD가 rebase 후 `docs/05_n2`, `docs/06_n1`에 존재
2. **provenance**: tanos(CC-BY)·kanji-data/KANJIDIC2(CC-BY-SA)·한자음 테이블의 upstream 버전/commit을 `docs/ATTRIBUTIONS.md`와 각 MD 헤더에 기록
3. **검수 태그 0건**: `검수:AUTO` 2,674건 검증 + `검수:EN` 1,931건 한국어 번역 완료 (배치 200건 단위, 잔존 확인: `grep -c '검수:AUTO\|검수:EN' docs/05_n2/14*.md docs/06_n1/17*.md`)
4. **R1 required checks**: N2/N1과 무관하게 R1 릴리스 절차(N0~N2)가 진행 중이어야 하며, production seed는 prod-v2 안정화 이후

## 4. 기대 수량 (manifest expectedRows 기준값)

| 소스 | 테이블 | 수량 |
| --- | --- | ---: |
| 13 (N2 한자) | kanji | 367 |
| 14A/14B (N2 어휘) | vocab | 1,905 (dup 1 제외) |
| 15 (N2 문법) | grammar | 130 |
| 16 (N1 한자) | kanji | 1,232 |
| 17A/17B/17C (N1 어휘) | vocab | 2,699 |
| 18 (N1 문법) | grammar | 135 |

주의: naturalKeys 도입으로 N5~N3 기존 어휘와 표기·가나가 동일한 항목이 추가로 제외될 수 있다. 첫 seed:diff 리포트에서 실제 수량을 확정한 뒤 expectedRows를 그 값으로 고정한다.

## 5. 검증·완료 기준

```bash
pnpm -F @nihongo-n3/db seed:diff
pnpm -F @nihongo-n3/db verify:fresh
pnpm typecheck && pnpm test
pnpm -F @nihongo-n3/e2e test:chromium && pnpm -F @nihongo-n3/e2e test:webkit
```

완료 판정은 TECH_DEBT "완료 판정 규칙"을 따른다. 로컬 seed 성공만으로 완료를 선언하지 않으며, 운영 반영은 `Content and D1 Change Control`의 수동 seed operation과 Environment 승인으로만 실행한다. UI 노출(N7)은 재통합 검증 후 track status `content_release` 단계 추가와 함께 진행한다.
