# 학습 지도 UI 릴리스 — 2026-10-14

## 현재 판정

후보 `887d2b2566fef6f09b183ca03fa4ba4b79b79bf2`를 Production Pages `2c0fea8d-a995-4ceb-9106-a7ba444ace82`에 배포했다(2026-10-14 01:00:27 KST). 코드 push 완료. 운영 Worker71e71638/source37486f8, D10032, 콘텐츠와 학습 기록은 유지한다. 백업·복원·점검 해제 후 Pages만 갱신했으며 운영 asset/route79, HTTP smoke7, 인증 proxy3, 고정 canonical392 검사가 통과했다. 실제 운영 음성 확인과 문서 후속 push는 아래 최종 기록으로 구분한다.

## 범위와 보존 계약

- 지도 홈, 레슨 단계, 완료 화면을 기존 학습·복습·기록 API에 연결한다.
- 오프라인 재개, 빈/완료 목록의 일반 quick 시작, 계정 전환 중 대기 저장, 이전 급수·영역 링크 전달을 보완했다.
- API·DB·공개 콘텐츠·FSRS·XP 산정·음성 코어는 변경하지 않는다. `apps/api`, `packages/db`, `packages/shared`는 운영 `37486f8` 대비 변경이 없다.
- 발음은 Google 우선·같은 언어 설치 음성 fallback, ko/ja 제한, R2·legacy 발음 경로 금지를 유지한다.
- 화면 문제가 있으면 Pages만 이전 운영 배포로 복귀한다. 콘텐츠 철회나 정상 학습 기록 삭제를 수행하지 않는다.

## 새 후보 검증

| 검사 | 실제 결과와 범위 |
| --- | --- |
| 전체 단위 | 772 통과: ops33 / DB296 / web228 / API215 |
| OpenAPI·typecheck·build·음성 계약 | 동일 clean 후보에서 통과 |
| fresh/upgrade/reseed | 0032까지, FK·콘텐츠·공개/철회·기존 합성 기록 보존 통과 |
| 기존 전체 브라우저 | 287 통과 / 기존 엔진별 시각 정책 제외30 / 실패·flaky0 |
| 로컬 reviewed 레슨 | 11급수 × 4엔진, 44/44 통과 |
| 실제 빌드 PWA 전환 | 현재 운영37486f8 → 신규 UI, 24/24 통과; 구 자동 갱신 회귀도 별도 보존 |
| 새 Preview reviewed 레슨 | 44/44 통과, 제외·실패·flaky·global error0 |
| 운영 canonical 읽기 전용 | 고정 source3485c6e / 기존 manifest, 392/392 통과 |
| 운영 상태 재조회 | 52 통과 / 기존 manifest 경고1 / 실패0 |
| 배포 파일 대조 | 75개: 공개74개는 승인 Preview 응답 byte 일치, `_redirects`는 clean source 일치 |

44개 검사는 급수별 대표 레슨 흐름과 공개 catalog 20개 조회를 확인한다. 모든 문항을 사람이 풀었다는 의미는 아니다. 엔진별 시각 정책 제외30은 통과 수에 포함하지 않는다.

## 실제 Preview와 사용자 확인

- Pages `9f046cc6-1866-467e-a3fd-5d803d24bce5`, source `887d2b2`.
- Preview Worker `9c1f20fe-08ca-4b7d-ad25-fce83128d13c`; backend 변경 없이 후보 provenance를 연결했다. 운영 Worker는 유지했다.
- 사용자가 같은 Preview에서 본인 N3와 가족 일본어 TOPIK3·4의 지도→시작→제출→중단·재개→복습→기록을 모두 정상 확인했다.
- 사용자가 한국어·일본어 모두 실제로 들었다고 확인했다. Chrome 실제 onend와 HAR의 R2/legacy 요청0도 별도 확인했다. 선택된 음성의 개별 이름은 단정하지 않는다.
- 확인 응답: `call_a5963d9c5ee249c6a3cdca96a5d03462`. 과거 Preview 확인으로 대체하지 않았다.

## 실패 기록과 운영 절차

1. 지도/대기 mutation/딥링크 결함은 `INC-UI-107–109`의 회귀 테스트 후 수정했다.
2. 중복 레슨 제목 선택자와 현재 수동 업데이트 버전에 맞지 않는 PWA 테스트 전제를 수정했다. 기존 실패 로그를 보존하고 전체 검사를 새로 실행했다. 검사 삭제·허용값 확대는 하지 않았다.
3. 첫 운영 준비 조회에서 Cloudflare7403으로 R2 guard 및 백업 사전 SELECT가 실패했다. 점검 모드 적용 전이므로 운영 학습은 중단되지 않았다. 실패 결과를 보존했으며, 전체 운영 재조회는52/1/0으로 통과했다.
4. 읽기 전용 SELECT만 7403/429/5xx에 최대3회 재시도한다. Worker·queue·Pages 쓰기나 export는 자동 재시도하지 않는다.
   두 번째 시도는 Cloudflare 내부 `_cf_KV`에 대한 count 조회가 `400/7500 not authorized: SQLITE_AUTH`로 거부되어 점검 적용 전에 중단됐다. 직접 읽기 전용 probe로 원인을 확인했다. 공급자 내부 테이블과 재생성하는 FTS virtual/shadow 데이터만 조회에서 분리하고 제품·OAuth·원장·sequence·canonical DDL 검사는 유지한다.
5. 새 백업은 현재 regular74개와 별도 보호된 schema·sequence·migration ledger·OAuth 보완 파일로 구성한다. 보완 파일의 보존과 regular74개 복원 검증을 구분한다.
   0032는 trigger-only migration이므로 regular-table 백업 profile 표기는0031이다. 이를0032 미적용으로 오인하지 않고 실제33개 migration ledger 및0032 trigger 복원 검사를 함께 요구한다.
6. 점검 종료 시 Worker `71e71638-aff1-44c5-a242-f1e276052413`와 원래 queue 상태를 복원한다. Production Pages 이전 대상은 `6b8b8a19-239c-4289-b570-f0ac5fd3fdd4`다.

## 백업·배포 실제 실행 결과

- attempt03은 즉시 health 판정과 Cloudflare10220 복귀 처리가 부족해 중단됐다. 별도 복구로 기존Worker·off를 확인했고 실패 기록은 보존했다(`INC-OPS-111`).
- attempt04에서 새74표 백업·파일 체크섬·정확한0032 복원·FK0·FTS·74표 기존 행 불변을 확인했다. 운영 동결 중 전후 데이터 hash가 일치했다. schema/sequence/ledger/OAuth 보완 파일은 별도 보존이며 이를 추가 복원 테스트로 과장하지 않는다.
- 복원 검사가 끝난 후 Worker71e71638·두 queue의 원래 상태·maintenance off를 확인했다. `production-0032-backup-map-20261014-04/result.json`이 실제 성공 증거다.
- `production-predeploy` 통과 후 동일 clean 후보의 Pages만 배포했다. 신규 migration·seed·콘텐츠 공개/철회·OAuth 자격 증명 변경은0이다.
- 지연 원인은 앱 테스트 실패가 아니라 새 운영 점검기의 설계·검증 부족이었다. 같은 후보의 기존 앱 검사를 불필요하게 반복하거나 새 리팩터링으로 범위를 늘리지 않는다.

증적은 로컬 보호 경로 `.artifacts/operations/map-release-2026-10-13/`에 보존한다. 자격 증명·백업 원문·사용자 행·HAR 원문을 Git에 넣지 않는다. Production 결과는 위 실제 ID와 검사 결과로 기록했다. 코드와 릴리스 문서 후속 커밋 `e447056`은 원격에 push했다. 이후 루트 README·코드 분석의 현재 배포 메타데이터도 동기화하며 런타임은 재배포하지 않는다.

## 운영 음성과 최종 경계

실제 Chrome의 운영 배포2c0fea8d에서 일본어·한국어 각각1회 정상 종료를 확인했다. 운영79개 파일/경로는 승인 Preview와 일치한다. 사람 가청은 같은 후보Preview9f046cc6에 대한 사용자 확인이며 새로운 운영 청취 확인으로 바꾸지 않는다. 완전한 R2/legacy0 HAR은 같은 후보Preview 증거다. 운영 native Network에서 새bundle을 확인했지만 사용자 활성 창 변경으로 운영 HAR 전체 수집은 마치지 않았으므로 운영 HAR0을 새로 확인했다고 주장하지 않는다.
