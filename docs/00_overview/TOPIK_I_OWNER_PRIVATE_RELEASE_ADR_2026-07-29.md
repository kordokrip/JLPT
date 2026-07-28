# ADR — TOPIK I owner-private release v2

기준일: 2026-07-29 KST
상태: Phase 1 local implementation

## 결정

`topik-i-self-authored-preview-v1`은 변경하지 않는다. 자체 저작 TOPIK I 2 unit/4 item의 동일 학습 payload를 새 immutable `topik-i-self-authored-owner-private-v2`로 생성한다.

이 candidate는 public `published` lifecycle을 사용하지 않는다. owner-private policy에는 `author-ksh`의 자체 저작·공식 TOPIK 비복제·비공개 사용·4 item self-review attestation hash와 날짜만 둔다. owner의 D1 user ID는 seed, manifest, R2 evidence, log에 넣지 않는다.

운영 배포 뒤 admin session 사용자가 release ID와 manifest SHA-256으로 한 번 claim할 때만 Worker가 현재 session의 `userId`를 private publication record에 저장한다. claim request body는 user ID를 허용하지 않는다.

## 접근 및 종료 통제

- private content/solution query는 SQL에서 `owner_user_id = c.get('userId')`, matching manifest, `owner_published` state를 동시에 확인한다.
- non-owner, unauthenticated, wrong-track, withdrawn request는 body·answer·manifest·release existence를 반환하지 않는다.
- private API response는 `Cache-Control: private, no-store`, `Pragma: no-cache`, `Vary: Cookie`를 반환한다. PWA는 이 endpoint를 `NetworkOnly`로 처리하고 Dexie/offline queue에 저장하지 않는다.
- claim 뒤 item, unit, source, release identity, policy는 DB trigger로 수정·삭제할 수 없다. kill switch는 only `owner_published -> withdrawn` forward transition이다.
- public `content_releases` transition, reviewer sign-off trigger, G0~G5 gate, `operatorOnlyPublishInstruction()` 및 public published-only query는 변경하지 않는다.

## 공개 승격

owner-private release는 일반 사용자 대상 publish가 아니다. 향후 공개하려면 독립 한국어·일본어 검수, 새 immutable standard-public candidate, G0~G5를 별도로 수행한다.
