# nihongo-n3 릴리스 로드맵

기준일: 2026-07-15 KST
원칙: JLPT N3 운영 안정화가 우선이며 R1, R2, R3를 독립 릴리스한다.

## 릴리스 순서

```text
R1 기반 정상화
  -> R2 N3 콘텐츠·오디오 품질
    -> R3 LearningTrack/TOPIK 기반
      -> TOPIK 검수 콘텐츠 별도 릴리스
```

앞 단계의 운영 관문을 통과하지 못하면 다음 단계 코드를 production에 함께 싣지 않는다.

## R1 기반 정상화

### 구현 완료

- 현재 N2/N1 작업을 WIP branch에 격리
- `drizzle-v2/0000`~`0006` canonical migration 구성
- 일반 table은 Drizzle, FTS는 SQL migration으로 소유권 분리
- runtime OAuth DDL 제거
- seed manifest row/checksum과 FTS/FK/필수값 검증
- 위험한 partial diff seed를 validation-only로 변경
- regular table Blue/Green, backup, restore drill 도구 추가
- read-only cutover route guard 추가
- public/admin OpenAPI 및 generated client type 추가
- route inventory와 OpenAPI coverage test 추가
- request ID/release SHA/route/status/latency/auth mode JSON log 추가
- fresh D1 기반 CI, manual production change workflow 추가

### 운영 전 남은 일

1. GitHub billing lock을 해제한다.
2. Audit, CodeQL, Required Verification, Chromium/WebKit E2E, Backup을 같은 commit에서 통과시킨다.
3. Cloudflare에 `nihongo-n3-prod-v2`를 생성한다.
4. 7개 migration을 처음부터 적용해 `d1_migrations`를 생성한다.
5. content phase를 복사하고 검증한다.
6. 10~15분 read-only에서 mutable phase와 유효 session을 최종 동기화한다.
7. preview smoke 후 Worker DB binding을 전환한다.
8. 30분 집중 smoke 후 쓰기를 재개하고 24시간 모니터링한다.

### R1 완료 정의

- blank DB와 prod-v2에 migration 7/7
- source/target 일반 table count 및 checksum 일치
- FTS rebuild와 parity 일치
- password login, Google OAuth callback, session 유지, admin, sync queue 성공
- 5xx, D1 error, auth failure 추세에 이상 없음
- old DB는 read-only 상태로 30일 보존

## R2 N3 콘텐츠와 오디오

### 구현 완료

- category를 vocab/grammar보다 먼저 seed
- manifest의 source별 row/checksum 검증
- 동음이의어 public route와 문서 노출 보류
- 코드와 콘텐츠 라이선스 문서 분리
- 공개 audio route를 R2 read-only로 고정
- Google batch에 admin, execute flag, approval token 요구
- content/provider/model/version hash 기반 immutable R2 key
- kana v2는 문자와 대표 단어를 한 번만 읽도록 생성 스크립트 변경
- 30문장 Audio QA에 Google 후보와 평가 기록 추가
- 52주 기본 과정과 조건부 16주 집중 과정 정책 추가

### 남은 일

1. Google TTS secret과 batch approval token을 승인된 production Worker version에만 설정한다. 현재 두 이름은 production·preview 모두 미설정이다.
2. Cloudflare/browser/Google/VOICEVOX 30표본을 동일한 `audio-qa-30-v1` 문장으로 평가한다. 현재 원격 후보는 Cloudflare 30/30, Google 0/30, VOICEVOX 0/30이다.
3. 청감표에 평가자, device, browser/OS, voice/model/version, 날짜와 120개 평가를 기록한다. 현재 사람 평가는 미수행이다.
4. R1 prod-v2 전환 후 승인된 Google provider로 N5→N4→N3 vocab/kanji/sentences를 level별 배치 생성한다. 구 production log table에는 필수 컬럼이 없어 실행 차단 상태다.
5. R2 object metadata와 D1 key를 검증한다. strict HEAD verifier 구현은 완료했고 실제 object 정합은 배치 후 확인한다.
6. `verify:remote:audio`에서 누락/비불변 key 0을 확인한다. 현재 production 결과는 5,085건으로 EXPECTED FAIL이다.
7. 승인 키가 없을 때 fabricated R2 경로를 만들지 않고 browser Japanese fallback을 사용하는지 Chromium/WebKit에서 확인한다. **완료**: 두 엔진 모두 quiz smoke 7/7, `ja-JP` utterance 1회, 서버 audio 요청 0회.

현재 fresh DB 공백은 4,954건이고 기존 production의 새 불변 규칙 불일치는 5,085건이다. 네 후보 청감 승인, prod-v2, level별 batch, strict 원격 게이트가 모두 끝나기 전에는 R2 완료를 선언할 수 없다.

### 동음이의어 출시 조건

- 출처·악센트·예문을 검수한 최소 30쌍
- 중복·FK 검증 0건
- UI와 공개 OpenAPI 동시 활성화
- attribution과 provenance 기록

## R3 LearningTrack와 TOPIK 기반

### foundation 구현 완료

- `LearningTrackId = 'jlpt-ja' | 'topik-ko'`
- 사용자 DB의 `learning_track`
- OAuth state의 선택 트랙 유지
- `/api/v1/tracks/:track/status`
- user×track IndexedDB/localStorage/React Query namespace
- 첫 접속 일본어/TOPIK 선택
- TOPIK foundation-only 화면
- 기존 JLPT route의 compatibility façade

### 현재 제한

- TOPIK 문제은행, 채점, 레벨 진단, 추천 과정은 없다.
- 서버 학습 table은 아직 JLPT compatibility route를 사용한다.
- TOPIK 화면은 출시 약속이 아니라 저장소·라우팅 경계를 검증하는 foundation이다.

### TOPIK 콘텐츠 릴리스 순서

1. 영어 설명을 기본으로 할 대상 사용자와 UI 언어 정책 확정
2. TOPIK level/section/content provenance 계약 설계
3. 별도 migration과 manifest 작성
4. 검수된 최소 문제은행으로 placement test 구현
5. track-aware API `/api/v1/tracks/topik-ko/...` 구현
6. 사용자×트랙 서버 데이터 격리 검증
7. Chromium/WebKit account×track E2E 통과
8. 별도 수동 승인으로 출시

## N2/N1 정책

N2/N1 타입 지원은 장래 계약을 위한 것이며 콘텐츠 출시 완료를 의미하지 않는다. 누락된 원본 7개, `AUTO`/`EN` 검수 상태, upstream commit과 라이선스를 해결하기 전 운영 seed에 넣지 않는다.

예정 경로는 다음과 같지만 파일이 실제 존재하고 manifest를 통과할 때만 등록한다.

```text
docs/05_n2/
docs/06_n1/
```

## 공통 릴리스 관문

```bash
pnpm audit --audit-level high
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
```

R2에는 추가로 다음을 요구한다.

```bash
pnpm -F @nihongo-n3/db verify:remote:audio
```

production 변경은 GitHub `production` Environment의 수동 승인과 workflow_dispatch로만 실행한다. 로컬 성공만으로 배포하지 않는다.
