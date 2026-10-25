# 세부 학습 UI·문자 연습 개선 — 2026-10-25

상태: **`6ecc203` 검증·Git push 후 Production Pages `92c6e58b` 배포 및 사후 gate 완료**. 기존 문서/모델 설정 변경은 보존했다. Worker·DB·콘텐츠·음성 코어·FSRS·XP는 변경하지 않았다.

## 문제와 변경

`INC-UI-126`: `/characters`의 바깥 800px 제한 안에서 viewport 기준 320px 보조 열과 280px 문자 열이 동시에 활성화됐다. 남은 설명 열이 한 글자 너비로 압축되는 구조였다. TOPIK 문자 화면에도 같은 중첩 구조가 있었다.

- JLPT/Hangul을 같은 `CharacterLesson`으로 통합했다. 실제 카드 컨테이너가 660px 이상일 때만 두 열로 전환하며, 좁으면 문자→설명→행동 순으로 배치한다. 고정 보조 열과 중첩 main을 제거했다.
- 공통 버튼·색상·카드 토큰을 사용한다. 모바일 문자 크기를 줄이고 그룹 선택은 접어 첫 학습 접근을 단축했다. 한국어·일본어·영어 조작 문구를 제공하며 학습 대상 문자는 바꾸지 않는다.
- 어휘/문법/한자 상세의 flex 자식 최소 너비·줄바꿈, 기록 기간 선택의 자체 스크롤, 사이드 메뉴의 애니메이션 감소 설정을 보완했다.
- 한자 조회의 로딩·빈 목록·실패/다시 시도를 구분하고 급수 전환 시 위치를 초기화한다.

## 문자 학습 방식

한 번에 최대 5자: **관찰 → 가리고 회상 → 구별 문제 → 틀린 문자 재확인**. 쓰기와 보지 않고 쓰기는 선택 단계다.

- 기존 읽기·뜻·예시를 재사용한다. 한글 음절은 자모 조합을 함께 표시한다.
- 같은 덱에 존재하는 유사 모양을 나란히 비교한다. 개인 연상은 실제 어원으로 설명하지 않는다.
- 첫 선택을 고정하고 정답/오답 피드백 뒤 다음으로 이동한다. 최초 응답과 재시도 결과를 분리한다.
- 기존 계정/트랙별 기기 저장 진도를 유지한다. 저장 실패 시 다음 문자로 진행하지 않고 오류를 알린다. 그룹 내 임시 결과는 새로고침하면 초기화된다. 서버 FSRS·XP·학습 완료로 새로 집계하지 않는다.
- 쓰기 캔버스는 테마별 잉크 색·포인터 캡처·비율을 보완했다. 크기/위치 연습일 뿐 손글씨 인식·획순 채점이 아니며 오해를 주는 점수 표시는 제거했다.

### 참고한 공식 안내

| 자료 | 적용 범위 |
| --- | --- |
| [Tofugu 히라가나](https://www.tofugu.com/japanese/learn-hiragana/) | 소그룹, 모양과 소리 연결, 회상. 원문 예문/이미지를 복사하지 않음 |
| [WaniKani SRS](https://knowledge.wanikani.com/wanikani/srs/) | 재확인과 지연 복습을 구분. 이번 변경에 새 간격 반복 스케줄러를 만들지는 않음 |
| [Duolingo 문자 학습](https://blog.duolingo.com/learning-other-writing-systems/) | 소리와 문자 연결, 한글 자모/음절 구성 |

특정 학습 효과나 모든 사람에게 가장 효율적이라는 주장을 하지 않는다. 실제 학습 적합성은 사용 후 확인한다.

## 반응형 검사 범위

`e2e/detail-responsive.spec.ts`에 라우트 목록과 실제 데이터 연결/fixture 범위를 명시했다. 각 일반 라우트를 390·768·1440·2560px, 밝음·다크에서 검사한다.

| 화면군 | 검사 범위 |
| --- | --- |
| 공개 | 시작·로그인·가입·음성 점검·404 |
| 주요 메뉴 | 오늘·학습·문제 별칭·기록·설정·복습·통계 |
| 자료 | 어휘·문법·한자·동음이의어 목록, 로컬 API에서 얻은 ID의 상세, 직접 단어 추가 |
| 문제·학습 | 퀴즈 4모드·실제 생성/제출 결과·청해 상세·독해 목록/상세·활성 안내 세션 |
| 선택 학습 | 문자·장기 계획·주차 상세·자가진단 |
| TOPIK | 일본어 UI의 홈·진단·학습·문자·복습·진행·기록·설정. 일부 읽기 API는 fixture |
| 권한 | 일반 계정의 관리자 경로 보호. 관리자 내부 전체 화면은 이번 신규 검사 대상이 아님 |

실제 DOM의 가로 넘침, 렌더링 완료, 문자 설명 열 너비를 확인했다. 문자 200% 글자 확대·키보드와 조회 실패/빈 상태도 검사했다. 대표 모바일/PC 이미지에서 설명 압축 해소와 일본어 조작 표시를 직접 확인했다. 모든 화면의 모든 상태·대비·보조기기 사용성까지 검증됐다는 뜻은 아니다.

## 결과와 증거

- Chromium/WebKit 확대 묶음: **44 통과, 실패/skip/flaky 0**. 라우트 폭·테마 검사는 각 테스트 내부에서 반복된다.
- 초기 실패는 제목 선택자, 변경된 단계 버튼 선택자 등 검사 계약 문제를 수정했다. 일본어 UI 대신 해설 언어만 바꾸던 검사도 바로잡고 재실행했다. 이전 결과를 일본어 UI 증거로 사용하지 않는다.
- 최종 웹 단위 테스트 **62파일/269건 통과**, TypeScript 포함 웹 build 통과, browser audio contract 통과. 단위 테스트에는 첫 응답 고정·최초/재시도 분리·마지막 부분 그룹·기기 저장 실패가 포함된다.
- 문서 검사: 파일 목록992경로·상대 링크1164개·lifecycle 통과. `git diff --check` 통과. 시작/종료 ops는 모두 **39통과/2경고/0실패**이며 경고는 보존한 작업 트리와 기존 manifest 차이다.
- 별도 구현 담당자의 공통 컴포넌트/기존 훅 연결 읽기 검토에서도 확정된 회귀는 없었다. 자동 검사와 독립 검토를 실제 사용자 만족도 증거로 대체하지 않는다.
- 로그: `.artifacts/operations/detail-ui-2026-10-25/`. 최초 실패 로그를 보존한다. 자동 화면 캡처는 `e2e/test-results/`에 있으며 다음 실행에 교체될 수 있다.

## 출시 경계

### 2026-10-25 배포 후보 재검증

- clean 후보 `6ecc203ddce31fe373ed17527dafad25f615463e`에서 `verify:ci` 통과: 단위858건·OpenAPI·typecheck·build·fresh0033·콘텐츠/음성 계약. 전체 브라우저는 **303통과·30정책 제외·실패0·flaky0**다. 기존 테스트를 단순 합산한 결과가 아니다.
- [현재 Preview](https://c5bc718c.nihongo-n3.pages.dev)의 배포85파일 HTTP 바이트와 Functions/API 연결을 확인했다. 고정 JLPT/TOPIK 두 계정×Chromium/WebKit의 문자 회상·저장, 390/768/1440px×양테마, 주요 경로·재개 모달 재등장 방지가 통과했다. 일부 로컬 검사의 fixture와 실제 Preview API 검사를 구분한다.
- 실제 활성 Chrome에서 일본어·한국어 재생 중→정상 종료 각각1회, DevTools Network 기록 중 요청0건을 확인했다. 사용자가 **이번 Preview에서 두 언어 모두 들림**을 별도로 확인했다. onend로 가청 확인을 대체하지 않았으며 iPhone 무음 모드 해결을 검증한 결과도 아니다.
- 사용자 승인 후 운영 쓰기 동결·queue 중지·0033/77표 백업·로컬 복원·FK 검사·동일성 검사를 완료했다. 점검 종료 후 기존 Worker `69cffaa1`과 queue를 복원했다. 콘텐츠 쓰기·migration은0이다.
- 첫 점검 시도는 비활성 Worker 복제본의 ETag 차이를 감지해 실패로 보존했다. 실제 모듈 바이트·진입점·MIME·크기·SHA-256 및 설정 동일성을 독립 검토한 뒤 별도 nonce로 다시 수행했다. 첫 실패 artifact는 수정하지 않았다.
- 운영 canonical은 고정 content source 기준392/392 통과. 후보 코드만 원격 `feature/topik-product-expansion`에 push했고, 기존 미커밋 문서·모델 설정은 포함하지 않았다.
- 점검 복원·push 후 현재 원격 상태는51통과/2기존 경고/실패0이다. 최초 원격 검사에서 CLI 환경에 Cloudflare 인증이 전달되지 않아 발생한7403과 pnpm PATH 오류는 실패 로그로 보존했다. 기존 `.env.local` 인증·pnpm 실행 환경을 전달한 별도 실행이 통과했으며 자격 증명을 변경하지 않았다. 문서 catalog·링크·lifecycle 검사도 통과했다.
- 증적은 `.artifacts/operations/detail-ui-2026-10-25/`의 `release-local-gates.log`, `release-e2e.json`, `preview-qa-result.json`, `native-audio-observation.json`, `production-0033-backup-detail-ui-20261025-02/result.json`에 보존한다.

### Production 결과

- 최종 predeploy 통과 후 clean worktree의 `apps/web`에서 Functions 포함 배포했다. Production branch `main`, Pages **`92c6e58b-f01f-47c6-b1e5-9df9762d3ab8`**, web source **`6ecc203ddce31fe373ed17527dafad25f615463e`**, 사용자 주소 https://nihongo-n3.pages.dev.
- 사후188 HTTP/SPA/호스트 격리 검사, canonical392/392, Worker smoke7/7, 인증proxy3개, postdeploy gate 통과. 원격 상태51통과/2기존 경고/실패0은 문서 후속 커밋 전 조회다. 기존 Worker `69cffaa1` 100%·health200·maintenance off를 재조회했다.
- 최초 HTTP 검사는 고유 배포 URL에도 운영 OAuth 연결을 기대해1건 실패했다. 기존 proxy는 canonical 외 미설정 호스트의 API를503으로 차단한다. 소스와 실제 canonical200/고유URL503을 대조한 뒤 별도 검사에서 **격리503과 canonical 인증200을 각각 강제**했다. 원래 실패 report는 보존하고 앱 코드는 수정하지 않았다. 사용자는 고유 URL 대신 canonical을 사용한다.
- 최초 사후 canonical 실행은 보고서392개는 통과했으나 쉘 로그 경로가 도구의 exclusive log 출력과 충돌해 exit1이었다. 이 실패를 남기고 분리한 operator 경로·새 post-final report로 read-only verifier를 재실행해 exit0을 확인했다.
- 현재 Preview의 사용자 가청을 운영에서 새로 청취한 증거로 표현하지 않는다. 실제 기기 푸시/가족 관찰 유예와 iPhone 무음 모드 미검증은 유지한다.
- 최종 증거: `production-deployment.json`, `production-runtime.json`, `post-http-final.json`, `canonical-post-final.json`, `worker-smoke-post.json`, `auth-proxy-post.json`, `postdeploy-result.json`. 모두 위 private artifact 폴더에 보존한다.

UI 복귀 대상은 `1d102c82-5348-4e67-980f-db2d1d9ee558`이며 정상 학습 기록을 되돌리지 않는다. 운영 회원·학습 자료는 수정하지 않았다. 후속 문서/운영 설정 커밋은 배포 runtime SHA와 구분한다.
