# JLPT · TOPIK — 비용 제한형 개발 지침

## 최소 문맥과 판단

개인·가족용 React PWA + Hono Worker + D1 모노레포다. UI·문서는 소규모지만 인증, 계정/트랙 격리, 오프라인 저장, FSRS/XP, 출판 원자성은 데이터 손실 위험이 있다. 파일 길이가 아니라 변경 위험으로 모델과 검증을 선택한다.

1. 시작에는 이 파일과 `docs/00_overview/CURRENT_STATE.md`만 읽는다.
2. 필요한 문서는 `docs/README.md`에서 찾는다. 관련 source/schema/test와 해당 오류 ID만 읽는다. 전체 원장·전체 대화·전체 저장소를 매번 재독하지 않는다.
3. 운영·버그·정리·릴리스에는 `project-operations-steward`, 콘텐츠 출판에는 `content-release-automation`을 사용한다. 선택한 스킬의 필수 지침은 생략하지 않는다.
4. 현재 실행/원격 조회 → 코드/schema/test → CURRENT_STATE → 과거 기록 순으로 판단한다.

## 모델·위임

메인 희망값은 Astra/medium이다. 실행 중 모델을 바꿨다고 주장하지 않는다. 프로젝트 설정은 `.codex/config.toml`, 역할 설정은 `.codex/agents/`에 있다. UI·세션·provider가 덮어쓸 수 있으며 모델이 없으면 부모에게 반환한다. 조용한 상위 모델 대체는 금지한다.

| 작업 | 실행 방식 |
| --- | --- |
| 짧은 답변·한 파일·검색·기계적 비교 | 부모 직접 또는 스크립트; 위임 없음 |
| 확정 절차의 좁은 구현·영향 테스트 | terra_execution: gpt-5.6-terra / medium |
| 사실·대상 파일이 확정된 문서 작성 | sol_longform: gpt-5.6-sol / low |
| 스크립트로 어려운 정형 추출·반복 비교 | luna_mechanical: gpt-5.6-luna / low |
| 보안·동시성·트랜잭션·삭제/이관 위험 독립 검토 | astra_review: gpt-6-astra / high |

- 기본 하위 에이전트 0~1개. 독립 작업만 2개, 부모 포함 최대 3개. 재위임 금지.
- `fork_turns="none"`으로 목표·허용 파일·금지 사항·합격 기준·필요한 사실만 전달한다. 하위 에이전트는 원장을 일괄 재독하지 않는다.
- 같은 파일 병렬 수정·공유 checkout 병렬 build 금지. 부모는 위임 작업을 중복 수행하지 않는다.
- 모호성·새 위험은 부모에게 반환한다. 같은 실패를 반복 위임하지 않는다. max/ultra는 기본 사용하지 않는다.
- 결과는 결론/파일/검사/미확인 사항만 짧게 쓴다. 측정 없는 토큰 절감률은 주장하지 않는다.

## 변경과 검증

- 테스트는 `docs/00_overview/LOCAL_CICD_OPERATIONS.md`의 위험별 표를 따른다. 문서 변경에 전체 앱 gate를 돌리지 않는다.
- 버그: 재현 → 오류 ID → 회귀 테스트 → 수정 → 영향 테스트. 최종 배포 후보에서 필수 전체 gate를 실행한다.
- 같은 SHA·입력·환경의 유효 결과는 링크한다. 코드/의존성/설정/환경이 바뀌면 영향 검사를 다시 한다. 원인 없는 재시도로 실패를 숨기지 않는다.
- 작업 시작/끝 `pnpm ops:status`; 원격 현재 상태가 필요한 경우만 `pnpm ops:status:remote`. 실패·skip·mock·미실행을 pass로 바꾸지 않는다.
- 상태는 CURRENT_STATE, 절차는 CI/runbook, 사건은 오류 원장, 배포는 릴리스 원장에 한 번 기록하고 링크한다. 변경되지 않은 문서를 형식상 반복 수정하지 않는다.
- 사용자 변경을 reset/checkout/stash하지 않는다. 삭제 전 import·동적 경로·CLI·migration·DB 원본 참조를 확인한다. 입증되지 않은 dead code는 보존한다.

## 불변 조건과 배포

반복 QA는 Preview 고정 JLPT/TOPIK 일반 계정 2개와 macOS Keychain을 사용한다. 운영 가입 E2E·에이전트별 계정 증식·평문 비밀번호 저장은 금지한다. fresh 전수 검사는 별도 격리 DB를 사용한다. 세부 절차: `docs/00_overview/QA_ACCOUNT_OPERATIONS.md`.

학습 기록·FSRS·XP·계정/트랙 격리·기존 URL/API를 보존한다. 음성은 Google 우선, 같은 언어 설치 음성 fallback, ko-* / ja-*만 허용한다. R2 발음 경로 금지, legacy `/api/v1/audio/*`는 410 유지.

GitHub Actions는 비활성 placeholder다. Production은 현재 세션의 명시적 사용자 승인 + clean 후보 SHA + Preview + 현 schema backup/restore + rollback + predeploy 이후에만 변경한다. 필수 gate 실패 시 다음 단계로 진행하지 않는다. 비용 절감은 배포 gate 면제가 아니다. INC-DATA-024 해결 전에는 운영 content source/manifest로 원격 검증한다.

백업·release/rollback·실패 리뷰·intake/quality·복구 증적은 보존한다. 비밀·사용자 자료·`.artifacts` 원문은 커밋하지 않는다. 불필요한 캐시는 확인 후 복구 가능한 휴지통 이동을 우선한다.
