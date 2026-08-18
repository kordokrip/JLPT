# TOPIK I 자체 저작 Preview Candidate V1

기준일: 2026-08-09 KST. 상태: draft / local-only / 별도 사람 검수 대기.

이 파일과 data/topik-i-self-authored-preview-v1.json은 content release contract를 검증하기 위한 축소 candidate다. 현재 운영 TOPIK 1~6 owner curriculum의 source가 아니며, practice bank나 placement API의 runtime release를 선언하지 않는다.

## 경계

- 모든 candidate 문장·보기·정답·해설은 자체 저작이며 공식 TOPIK 기출·정답·지문·음원을 포함하지 않는다.
- candidate는 인간 검수와 release transition을 통과하기 전 draft 또는 automated_checked를 벗어나지 않는다.
- 외부 API, 외부 파일, remote D1/R2 write를 이 문서만으로 승인하지 않는다.
- N2/N1은 현재 자체 저작 Batch가 manifest에 연결되어 있다. 과거의 source-required 설명은 더 이상 적용되지 않는다.

## 검증 계약

candidate builder는 canonical JSON과 이 문서의 checksum으로 manifest를 만든다. verifier는 disposable local D1에서 빈 다국어 field, duplicate/FK, answer payload 노출, release status transition을 점검한다.

~~~sh
pnpm -F @nihongo-n3/db topik:preview:candidate:verify
pnpm -F @nihongo-n3/db content:contract:verify
~~~

실제 운영 범위·출처 정책·확장 순서는 [현재 상태](../00_overview/CURRENT_STATE.md), [콘텐츠 감사](../00_overview/CONTENT_AUDIT.md), [로드맵](../ROADMAP.md)을 따른다.
