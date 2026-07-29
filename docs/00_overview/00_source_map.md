# 학습 원본 지도

학습 데이터의 기준은 실제 원본 문서와 seed 코드다. 과거 공개 릴리스·검수·운영 문서는 의도적으로 제거했으며, 이 문서는 콘텐츠를 찾는 최소 진입점이다.

| 범위 | 원본 | seed 기준 |
| --- | --- | --- |
| JLPT N5 | `docs/01_n5/` | `packages/db/src/seed/content-manifest.ts` |
| JLPT N4 | `docs/02_n4/` | `packages/db/src/seed/content-manifest.ts` |
| JLPT N3 | `docs/03_n3/` | `packages/db/src/seed/content-manifest.ts` |
| JLPT 공통 예문 | `docs/04_supplement/12_example_sentences.md` | `packages/db/src/seed/content-manifest.ts` |
| JLPT N2 | `docs/05_n2/` | `packages/db/src/seed/n2-batch1.ts`, `n2-batch2.ts`, `n2-batch3.ts` 및 후속 batch |
| JLPT N1 | `docs/06_n1/` | N2 구조를 복제하는 후속 batch |
| TOPIK | `docs/07_topik/` | TOPIK curriculum/placement seed |

모든 새 unit은 어휘, 문법, 예문, 읽기 또는 듣기, 확인 문제와 해설을 자체 저작으로 묶는다. 오디오는 provenance가 확인된 R2 binding이 준비된 경우만 재생한다.
