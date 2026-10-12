# 전 급수 콘텐츠·레슨·가족 UX — 구현 및 품질 차단 기록

## 2026-10-12 출판 계약·최종 로컬 검증 완료 — 원격 공개/배포 안 함

V7 SHA와440/440 리뷰는 그대로다. 정규 G0–G4 profile·Preview-only target/CLI, 0031 publisher trigger와 세 nullable JSON seal을 추가했다. 두 release의 question/unit/audio/lesson/cue/ref exact JSON을 단일 UPDATE로 검증하고 mismatch·R2·partial stage·source/quality/G0–G4 부족을 차단한다. 독립 검토가 발견한 publish race P1과 JLPT mirror 누락은 교정됐고 같은 반례 거부·공개0, actual440 roundtrip3/3을 확인했다. 이 좁은 검사와 아래 실제 최종 전체 gate를 구분한다.

Preview160 v2 A/B158/2 실패를 보존하고 별도 v3에서 두 결함만 수정했다. v3 A/B는 각각160/160 승인했지만 과거 v2 답을 일부 본 reviewer가 있어 완전 맹검은 주장하지 않는다. v3 path는 `content/preview160-v3-2026-10-12`, raw review SHA는 A `6fc06d143e2d87f65813550ca8b3ffa5a1ed44038faf0f72f8ef662928e705e1`, B `57246e3ce6feec1873f9bbd42652b00b4dc41ab76dc29f9a60a782c443acfd6f`다. 개인용 source facts를 재사용했으며 새 상표·license 연구나 적법성 확정은 하지 않았다.

최종 cohort04 실제 runner exit0: 단위614(Ops29/DB225/Web155/API205), OpenAPI/typecheck/build/음성 source 계약/fresh 통과, desktop/mobile Chromium/WebKit44/44·skip/flaky/fail0이다. 11급수×20레슨은 API 제출/재전송/기록/FSRS를 실행했고 각 급수 대표1레슨은 UI 저장·중단·재개를 대조했다. 새 격리 DB의 fresh/reseed·0030→0031 합성12종 upgrade와 정식 local G0–G4 공개→재실행→철회 후12종 전체 행 hash 불변도 확인했다. 별도160 v3는543 draft행/reseed·쓰기8/듣기8 API 필드 바인딩을 검사했다. cohort01–03의 portable·D1 depth·Wrangler split 실패는 보존한다.

중간 G4 preflight는 Preview에 사용할 수 없다. 실제 drill 성공 후 최종 G4를 생성하고 CLI가 동일 cohort/manifest·hashed 결과·완료 표식을 강제한다. 새 파일·명령·hash·실패 순서는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다. 현재 승인 범위는 로컬 검증·문서화뿐이므로 commit/push/새 Preview/운영 migration·콘텐츠·Worker·Pages 변경은0이다. 음성 코어는 불변이며 실제 Chrome onend·사람 가청·Network·가족 관찰·현 schema backup/restore·현재 Production 승인 절차는 후속이다. 이번 mock/local 통과를 그 증거로 쓰지 않는다.

## 아래 실행 위치는 2026-10-11 중간 보존 이력

갱신: 2026-10-11 KST. **로컬 구현 후보이며 전체 완료·공개·배포 기록이 아니다.** 기존 10월10일 정리 작업을 보존한다. Production은 0030 / Worker `aedcbd40` / Pages `f62a8bdb` 그대로이며 이번 세션에서 원격 쓰기·push를 하지 않았다.

## 2026-10-11 당시 실행 위치 — v4/v5/v6 불합격 보존·V7 동결/독립 검수

v4/v5/v6 실패 원본을 보존한다. V7은 rubric2건과 현지화 해설만 교정했고 question/choices/correct index/sample/cue는 불변이다. 기존 세 hash를 유지하며 작성에 참여하지 않은 A/B가 각각440/440 승인했다(raw SHA A `db1f4a0f9f174b48a02d730aeb93a2241cd9889770f6bf090e067d2a0a8ff52a`, B `ac0697d587f71816333a1931c181fa254477d72758731e85b150c88781d1d554`). readiness는 exit0·full_bank_ready true·failures0이다.

실제 local staging은 exit0으로200 JLPT·240 TOPIK 문항과220레슨을 비공개 적재했다. local DB cohort02는 fresh/reseed/FK0과 합성 기존12표 각1행의0030→0031 원래 열 보존을 통과했지만 실사용 DB 검증은 아니다. reviewed E2E는 준비 단계 실패2회로 브라우저 실행0이다: metadata.sqlite 오인은 수정·회귀2통과, canonical0002 기본 owner1행/빈 users guard 충돌은 수정 중이다.

별도 Preview160 자동 quality는 새 leaf에서160/160·exit0이다(draft `e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070`, source evidence `85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502`). 이는 자동 구조 재검사일 뿐 새 두 의미 검수·실제 Preview 조회·전수 runtime·G0–G4가 아니다. 440 bank 증거와 합치지 않는다. 실제 API key 문자열 scan은1073파일 일치0이었고 키 자체는 출력하지 않았다. 음성 코어4개 diff는0이다.

사용자가 알려준 `.env.local`의 `krdict_API_KEY`를 로컬에서만 사용해 공식 API로 남은 봉지59344/변경(變更)14470/민원실57365/분리21086/배출(排出)58441을 취득했다. 키·요청의key parameter·원문XML·예문·음원은 저장하지 않았다. 첫 source05/API01은 보존하고, 독립 검토에서 지적한 provenance downgrade와 첫 뜻풀이 범위 표기를 교정한 **API02/source06**을 새로 만들었다. first-returned-sense와 실제sense_order를 명시하며 고유 sense 승인이라고 주장하지 않는다.

- source06: 86record, 정확급수220 lookup 실패0, source failures0, 스킬 구조86/86. 공식 웹10개는fact projection SHA, 공식 API5개는실제응답 bytes SHA로 구분한다.
- 새 `frozen-cohort-01`에 실제440문항/220개념/220레슨을 동결했다. draft `b51c2934f9f80f4939f28ab4ca7c3bd5839274250cfd2343ce7cda21560c21c1`, source `850e8fbbfdad827d8db3920bb972f045924819cc3aaa9d7dacb5e0c15426c376`, inventory `5489bd9df91d2e097ddd5edd713b7bcab71aaddb09cf84db65b230dbf4a319e0`.
- 서로 결과를 공유하지 않는 A/B가 같은 세 hash의 440문항·220개념·220레슨을 각각 실제 검독했다. 최종 A **319 승인/121 거부**, B **318 승인/122 거부**이며 두 `passed=false`를 원본으로 보존했다. 중간 A 320/120은 최종 판정으로 사용하지 않는다. 합집합은 문항 137개·개념 13개다.
- 실제 v4 readiness는 exit1/4개 차단 판정이다. 해설의 이전 정답 번호, 모호한 문법·어휘 문맥, 청해 근거, 예시 종속 쓰기 rubric, 고급 오답 품질 등을 **별도 v5**에서 수정·새 동결했다. v4 frozen/review/source를 편집하지 않는다. v5 수정 완료도 두 새 독립 전체 승인 전에는 의미 통과가 아니다.
- v5 readiness는 A426/14·B432/8, 합집합14문항/8cue로 실패했고 v6에서 교정했다. v6 readiness도 A438/2·B439/1, 합집합2개 쓰기 숨은 rubric 조건·cue0으로 실패했다. V7은 그 두 rubric과 현지화 해설만 교정했으며 이전 버전의 실패 판정·hash를 수정하거나 승인으로 상속하지 않는다.
- 신규 draft adapter는 승인 전 DB 파일 생성 금지·새 임시 파일 독점 생성·복합키 충돌 검사·원자적 rollback·audit 승인과 콘텐츠 공개 분리를 추가했다. 합성 메모리 저장 검사는 실제 콘텐츠 승인이나 실제 v4 staging이 아니다.
- source01–06/API01/02/이전 failed 원본을 편집하지 않는다. 동결 결함이 나오면 반드시 다음버전/새hash/새리뷰로 수정한다.
- 아래 source04의4개 부족은 API취득 전의 보존 이력이다. 실제 신규440을 붙인 D1/11급수세션·Preview160·G0–G4·새Preview/가족/실제Chrome/가청·현schema백업·Production은 여전히 후속이다.

## 제품 계약

JLPT N5–N1, TOPIK 1–6급 각각 20레슨, 총 220레슨을 목표로 한다. 한 레슨은 기존 공개 개념2개와 검수된 새 문제2개이며, 개념마다 서로 다른 상황을2회 적용한다. 신규 문항은 JLPT200·TOPIK240, 총440개다.

| 트랙 | 급수별 신규 내용 | 답 위치 |
| --- | --- | --- |
| JLPT | 어휘·문법·한자 읽기·청해 각10, 총40 | 급수10/10/10/10, 모드 차이≤1 |
| TOPIK | 어휘·문법·읽기·듣기·쓰기 각8, 총40 | 선택형32: 급수8/8/8/8, 영역2/2/2/2 |

사용자 N3와 일본인 가족 TOPIK3–4급을 우선 관찰한다. `표현·소리 → 뜻/상황 → 가리고 회상 → 다른 상황 적용 → FSRS`로 연결하고, 최초 정답·재시도·자기평가를 구분한다. 연상 설명을 실제 어원이나 입증된 효과로 소개하지 않는다. 쓰기는 rubric/예시 비교이며 공식 점수를 만들지 않는다.

기존 canonical·practice v2와 학습 기록은 교체하지 않는다. Preview의 N2 60/N1 60/TOPIK Batch6 40은 별도 재검증 대상이며 이번 초안과 합산해 공개하지 않는다. `50/10/5`는 운영 관찰 지표이지 이번 콘텐츠의 공개 차단 기준이 아니다.

## 실제 구현과 남은 작업

### 순서 고정 후속 실행 — 공개 개념 확정·대표 재검수

1. Production D1을 **SELECT만** 실행해 11급수×20개, 총220개 공개 개념을 확정했다. `capture-learning-path-v2-baseline.ts`의 실제 조회는 lookup 실패0·쓰기0이었다. snapshot SHA는 `40f8d03aca5cbb4eca3a2959c373c7630f53af21857b76401a03a79d3cd63982`이며 ignored `.artifacts/learning-path-v2-2026-10-11/public-concept-baseline.json`에 보존한다. 조회는 선택 개념의 공개 상태 증거이지 운영 전체 verifier 재실행이 아니다.
2. 운영과 fresh seed의 정수 ID가 다름을 확인했다(예: N3 確認 운영1605/fresh1573). 새 `resolveSelectedConcept`는 **정확한 급수·자연키·읽기/뜻의 유일 일치**로 각 환경의 실제 ID와 실제 row version을 반환한다. 운영 정수 ID를 fresh DB에 강제 복사하거나 다른 급수로 대체하지 않는다. 새220개 개념의 기존 canonical seed 대조는 실패0이다.
3. N3·TOPIK3·TOPIK4 대표 레슨 각1개와 재확인 상황을 포함한12문항을 별도 v2로 동결했다. A/B 모두12문항의 정답은 승인했지만, `확인를`·`습관를`과 `~ようにする` 학습 전 접속 설명 부족 때문에 **두 리뷰 `passed=false`**였다. 동결본/불합격 JSON은 보존했다.
4. 별도 v3에서 한국어 조사 붙이기 템플릿을 제거하고 대표 어휘/문법 cue를 ko/ja/en으로 보강했다. 새 hash에서 A/B 각각12/12·6개념·상황/연결·선언 화면 계약을 승인했다. 이는 **정적 대표 계약 검수**이며 실제 새 레슨 화면·전체440문항·DB 공개·배포 승인이 아니다.
5. `learning-path-evidence.ts`는 scope·세 hash·정확한 ID·두 독립 reviewer·독립 정답·해설 판정을 검사한다. 대표 승인을 `full-bank-only`로 확대하거나 `passed`만 바꿔 통과시키는 회귀는 실패한다. `report-learning-path-current-candidate.ts`는 대표 통과/선정 개념 lookup0을 기록하되, 전체440/220/220·전체 source/리뷰가 없어 **exit1·publication blocked**를 유지한다.
6. 전체 재작성용 v4 작업공간을 분리했다. 이전 대표의 작성 계약은 참고하지만 승인/리뷰를 상속하지 않는다. 첫120문항/60cue 결과는 보존했다. 후속 JLPT N5/N4/N2/N1·TOPIK1/2/5/6 각40, 총320개를 추가해 **440문항·220cue·220레슨** 전체 작성/구성의 자동 red flag0을 확인했다. 고유 청해98개·구체 쓰기 예시48개다. `content:learning:authoring:full`은 **작성 구조만** 검사하며 독립 의미 승인은0이다. 처음 부족했던14개 개념 중10개를 공식 사전 entry로 보충했으나 현재4개 개념/5개 표제어가 남아 전체은행 동결·두440/440 승인과 이후 단계는 차단한다. 최신 실행 수는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.

### source 완성 전의 보존 이력 — 후보01–04

`learning-path-v4-authoring.ts`는 11급수 저작 파일의 실제220cue를 모두 결합하고 누락/중복/초기 placeholder fallback을 거부한다. 급수별20레슨에 개념2/문제2, 개념마다 서로 다른 tagged 상황2개, 각 문제1회 사용을 검사한다. JLPT 답 분포는 급수별10/10/10/10, TOPIK 선택형은8/8/8/8(각 영역2/2/2/2)이다. **tag/구조 차이가 실제 의미·번역·난이도 타당성을 증명하지 않으므로 두 독립 검수는 여전히 필요하다.**

최신 출처 후보04는 **고정 content source SHA의 Git archive에서 seed 코드를 실행**해220개를 exact lookup했고 실패0이다. 현재 checkout의 seed를 과거 source SHA와 혼합하지 않는다. EDRDG27·이전 KRdict26·새 KRdict 웹 증적10·세종1·immutable repository source17, 총81record의 구조 검사도81/81 통과했다. 기존 외부 record의 원래 응답 hash/취득시각을 유지하며 새 HTTP 다운로드로 바꾸지 않는다. 새10개는 공식 entry를 읽고 짧은 표제어/품사/뜻만 저장한 `verified-fact-projection-v1`이며 SHA는 URL+구조화 사실의 해시다. **원시 HTTP 응답 hash나 새 다운로드로 표시하지 않는다.** owned source는 개념 metadata identity만 남기고 사전 사실을 대신하지 않는다. 후보01/02/03은 수정하지 않고 보존한다.

처음 후보02에서 부족했던14개 개념 목록은 다음과 같다(과거 실패 기록). 복합어는 두 구성 어휘가 모두 필요하며 다른 단어의 뜻으로 대체하지 않는다.

| TOPIK 급수 | 개념 key 끝부분 → 필요한 사전 표제어 |
| --- | --- |
| 1 | vocab-b1→안녕, b2→부모님, b3→공책, b4→봉지 |
| 2 | vocab-b1→아침, b2→맑다, b4→대중교통 |
| 3 | vocab-b1→변경, b4→연결하다 |
| 4 | vocab-b1→민원실, b2→분리·배출 |
| 5 | vocab-b3→사회·문제(사회 증적은 있고 문제가 부족) |
| 6 | vocab-b1→분석, b3→비평 |

후속 공식 웹 entry 확인으로 안녕·부모님·공책·아침·맑다·대중교통·연결하다·문제·분석·비평10개를 새 `krdict-web-facts-cohort-01.json`에 보존했다. 최신 후보04에서 남은 개념은 다음4개다.

| 개념 | 남은 정확 표제어·의미 조건 |
| --- | --- |
| TOPIK1 vocab-b4 | 봉지(비닐봉지/봉투로 대체 금지) |
| TOPIK3 vocab-b1 | 변경(變更; 邊境과 구별) |
| TOPIK4 vocab-b1 | 민원실(-실의 예시 등장만으로 표제어 검증 불가) |
| TOPIK4 vocab-b2 | 분리 + 배출(排出; 輩出과 구별), 두 구성 어휘 모두 필요 |

native KRdict HTTP/HTTPS bounded 취득은 timeout, 나머지 웹 검색 결과는 다른 표제어/동형어/예시여서 채택하지 않았다. 이것을 API 권한 문제나 사전의 표제어 부재로 단정하지 않는다. 후보04는 **source gate exit1 / full_bank_source_complete=false / full_bank_ready=false / 의미 승인0 / remote write0**이다. source완성 전 새 전체 draft를 동결하거나 reviewer A/B를 배정하지 않는다. 다음 성공 사실은 새 cohort/candidate05 이상으로 보존한다. 실패01–04의 flag/failure를 편집하지 않는다.

| 새 파생 증적(동결 draft 아님) | SHA-256 |
| --- | --- |
| v4 전체 작성 snapshot | `e2bd4a55508834d69b9329f9e82ef6cad863d63221fc8649d10e912383c15a22` |
| v4 selected inventory bytes | `13042222b27349114ee2758c61c252c956183881690092da5115748bbd5f3bc1` |
| blocked source candidate01, 보존 | `8b50e47a9250f66730fc2074c2b7f4311b49df0c66aad0dc93aaa2facedb1bf4` |
| blocked source candidate02, 새 binding | `09a5d11cbbe0c2f44696889a58729b7ee1c025c50e9f05c93e759850f0cefccb` |
| blocked source candidate03, 공식 웹10개 보충 | `716c32a89292680e202bfbcd0f511dc1afb50e7348a672341fa9b542493a5e3a` |
| blocked source candidate04, immutable archive binding | `c598dd60f7a1afdb98e426d5e551d27961e40e65bccd33a54f407742db8705be` |
| source candidate06, API provenance 교정·전체 source 완성 | `850e8fbbfdad827d8db3920bb972f045924819cc3aaa9d7dacb5e0c15426c376` |

증적은 ignored `.artifacts/learning-path-v4-2026-10-11`에 보존한다. `full-authoring-cohort-01.json`은 재실행 덮어쓰기를 차단하며 첫120개 결과와 별도다. collector 성공 checkpoint·최종 intake는 exclusive-create하며 새 번호를 사용한다. source/intake 구조81개 통과는 부족4개나 문항 의미 승인 미완료를 없애지 않는다.

앞선 전량 작성 후속의 **550pass/0fail/0skip**과local39/2/0은 과거 실행으로 보존한다. 이번 source 보충/동결 도구 후속에서는 fresh0000–0031·build(dry-run)·OpenAPI·typecheck·기존 학습 영향 브라우저50개를 새로 검사했다. 브라우저의 음성은 mock이며 신규220레슨 전체 플레이·실제 Chrome/사람 가청/가족 관찰/Preview 증거가 아니다. 최신 단위 검사 수와 문서·종료 상태는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 별도로 기록한다.

### 새 동결·준비도 도구의 교차검증

- `content:learning:freeze:v4`: 공개 selection 원본+immutable archive lookup+정확한 개념 identity+전체 구조/source를 재계산한 뒤에만 새 디렉터리를 생성한다. leaf mkdir는 비재귀 exclusive 생성, 파일은wx다. source03/04로 실행한 실제 음성 미변경 negative 검사는 exit1이며 두 동결 폴더 모두 생성되지 않았다.
- `content:learning:readiness:v4`: 명시한 cohort와 두 review를 읽기 전용 검사한다. 공개 selection identity와 frozen concept를 직접 대조하고 review `passed`/`explanation_consistent`는 literal `true`만 허용한다. review ID는 비어 있거나 공백으로 독립성을 우회할 수 없다.
- 독립 검토에서 hash 표식 제거·현재 seed/과거 SHA 혼합·출력 경합·원래 selection 뜻 변조·문자열 `"false"` 승인 우회를 발견해 교정했다(`INC-QA-078`). 부모 회귀12개와 독립 반례 재검토 통과는 **도구의 차단 검증**이지 새440문항 의미 승인이 아니다.

| 불변 대표 artifact | SHA-256 |
| --- | --- |
| v2 draft, 두 리뷰 불합격 | `abe999efbc9ded98a5f37cd4772cfca3c52af4b30662e1f550f067a539ea1dbd` |
| v3 draft, 대표 범위만 두 승인 | `2978296359d74c0fd96d3e22b69b976cfe4de4248070710c186631289f6c5b17` |
| v3 prototype intake | `f223e9b1b60ca7c738993584ae9f8b0efc76897a6426d633d033ce63b0d41e24` |
| v3 220개 개념 inventory | `cc62f1656af3748b35290f2ea6ca9827f189159d79481913e15d3fc3b45f21ef` |

대표 intake6개는 스킬 구조 검사를 통과했다. 기존 사전5개 record의 원래 취득시각/원응답 hash와 자체 저작 public TOPIK seed의 짧은 어형 사실을 보존했다. 새 HTTP 다운로드나 전체은행 intake라고 주장하지 않는다. 별도 EDRDG 갱신은 **27 record/177 facts**를 실제 수집하고27개 스킬 구조 검사를 통과했다(`6f205c3bda5080014abe414275f3521c3591fcd6211ec8e1f8bb46ec1be5fbbc`); 공급자 단위 자료이며 전체 source 승인과 별개다. 한국어기초사전은 bounded 재시도 후 시간 초과로 갱신 미완료이며 성공 artifact를 만들지 않았다. collector의 공급자 분리·정확 표제어/활용형 처리·무번역 상태·동형어 읽기 분리 회귀는 별도로 검증한다.

이 후속 실행에서는 실제 신규 레슨 DB staging/reseed·11급수 신규 레슨 세션·Preview160 재검수·새 Preview·가족 관찰·실제 Chrome/가청/Network·현 schema backup/restore·Production·push를 실행하지 않았다. 음성 코어는 그대로 유지한다.

| 범위 | 현재 후보 | 완료되지 않은 사항 |
| --- | --- | --- |
| 네 메뉴 | 오늘/학습/복습/기록, 자유 문제는 학습 안으로 통합; 언어/트랙 변경과 iOS 설치 안내는 설정에 집중 | 새 Preview에서 가족 관찰 |
| 기존 링크 | `/questions`→`/learn#free-practice`, TOPIK `/progress`→기록 상세; query 보존 | 원격 저장 링크 재검증 |
| TOPIK 접근성 | 일본어 기초 제목·목표·표현 뜻, 영역/음성 안내, URL `unit` 복귀 | 교육 번역의 독립 의미 검수·가족 확인 |
| 레슨 DB/API | additive0031, 카탈로그·선택 lesson_id·버전 snapshot·현재 세션 재개 | 실제 검수 콘텐츠를 붙인 220레슨 검증 |
| 연결 문제 | 승인 typed ref 직접 조회; 새 공개220개념은 정확 급수/의미 조회0실패 | 새440문항과 실제 lesson/quality link 적재·세션 검증 |
| 콘텐츠 | V7 A/B 각440/440 승인·readiness exit0·local 비공개 staging 완료 | reviewed E2E bootstrap 교정과 실제 브라우저 실행 |
| 출판 | source/draft hash·완전한 두 리뷰·정확 급수·명백한 반복/노출 차단 검사 | G0–G4·Preview·현 schema 백업/복원·승인 |

**실제 신규220레슨을 DB에 적재하거나 공개하지 않았다.** DB에서220/880/440 수량을 확인한 테스트는 저장 계약용 합성 lookup fixture다. 그 결과를 콘텐츠 의미 연결의 통과로 쓰지 않는다. 실제 baseline lookup 실패는 쓰기 전에 중단한다.

## 데이터와 인터페이스

- `0031_learning_lessons.sql`: `learning_lessons`, `learning_lesson_entries`, 세션의 nullable `lesson_id`/`lesson_version`. 기존 세션은 null로 유지한다. 완료는 서버 수락 세션에서 계산하며 추가 완료 원장은 만들지 않는다.
- `GET /api/v1/learning/lessons?level=...`: 계정/트랙/급수의 공개 release에 속한 목록·완료·다음 ID만 반환한다. 정답·선택지·해설은 없다.
- `POST /api/v1/study/sessions`: 기존 요청 유지, 선택 `lesson_id`; 열린 세션/원본 request_id 우선. 자동 quick은 예정 복습을 먼저 처리하고, 없으면 다음 공개 레슨을 고른다. 명시적 레슨은 개념2·문제2를 snapshot한다.
- typed ref는 track/type/원래ID/version 네 필드다. row version은 시각 메타데이터를 제외한 정렬 JSON의 SHA-256이며 문자열 bank ID를 숫자 FSRS ID로 변환하지 않는다.
- 공개/사용된 레슨 정의·구성은 불변이다. 철회된 레슨은 조회/쓰기410, abandoned는 허용한다. 제출 claim의 SQL trigger가 공개 검사 뒤 철회 경합도 차단해 FSRS/progress/activity/XP batch를 취소한다.
- 백업 profile은 운영0030/72개와 후보0031/74개를 분리한다. 구 profile을 새 레슨까지 포함한 전체 백업으로 표시하지 않는다.

## 출처와 검수 증적

`collect-learning-path-facts.ts`가 JMdict/WWWJDIC, KANJIDIC2, 한국어기초사전의 짧은 표기·읽기·의미와 세종학당 교육과정 metadata를 수집한다. URL/취득 시각/원응답SHA/license/attribution을 저장하고 원문 예문·기출·지문·음원은 저장하지 않는다. 사전 수준을 공식 시험 급수로 해석하지 않는다.

- 이용 조건: [EDRDG](https://www.edrdg.org/edrdg/licence.html), [한국어기초사전](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo). 개별 자료 조건을 재확인해야 하며 일반 텍스트 조건을 media 이용 허가로 확대하지 않는다.
- intake v1은54 source record/236 facts다. `先生`의 첫 동형어를 teacher로 오인할 위험을 검수가 발견했다. v1은 실패 증적으로 보존한다.
- intake v2는54 record/240 facts이며 읽기별 동형어 locator를 구분한다. `せんせい/teacher`와 `シーサン/man`이 별개다. 스킬 validator54개 구조 검사 통과는 문항 품질 승인과 별개다.
- 동결 초안 SHA: `25be691230772b4d20d5208091b7a78cc4765aca595c5daf9ba5e1b90f15cdf5`.
- 두 reviewer는 결과를 공유하지 않았다. A:151승인/289거부, B:138승인/302거부, 각440ID·개념 지적189. 두 판정 모두 `passed=false`다. 기존 v1 evidence에 연결된 검수를 v2 출처 승인으로 옮기지 않는다.
- 주요 결함: 일본어 정답이 질문 어휘와 동일, 반복 대본/상황, 복수 정답 문법, 급수에 맞지 않는 실제 canonical 연결, placeholder 교육 번역, 일반 쓰기 예시/조사 오류. 초안이 존재한다는 이유로 공개하지 않는다.

## 시계열 실행 기록

같은 세션의 순서이며 실제 기록되지 않은 분 단위 시각을 추정하지 않는다.

1. 문서/skill/schema/원본/Git 확인. 시작 local39/2/0, HEAD d626a16, 기존34개 정리 변경 보존.
2. 콘텐츠 초안과 웹 UX를 파일 소유권으로 분리했다. source 사실 수집과 typed ref·레슨 DB/API 계약을 구현했다.
3. 초안의 첫 구조 오류를 수정한 뒤440문항을 동결하고 두 독립 의미 검수에 보냈다. 결과가 불합격이므로 공개 중단.
4. 실제 canonical DB 대조에서31개 lookup 실패를 발견했다. 다른 급수 fallback 대신 seed 전에 실패시킨다.
5. 독립 계약 검토에서 철회 후 제출 효과 저장과 homophone due 누락을 발견했다. API 사전 검사·원자적 trigger와 예정 복습 조건을 수정하고 재검토/회귀를 실행했다.
6. 중간 문제 허브를 제거하고 기존 링크 query/해당 기초 단원 복귀를 고정했다. 현재 후보의 검사 결과와 중간 실패는 아래에 분리한다.
7. 추가 iPhone UA 검사에서 JLPT 첫 저장을 가리는 설치 배너를 발견했다(mobile14/2/0). 설치를 없애거나 테스트에서 미리 닫지 않고, 설정의 인라인 안내로 이동했다. flag-off·standalone·닫기 보존·44px 조작과 실제 모바일 재검사를 추가했다.

## 재현과 검사 해석

```sh
pnpm -F @nihongo-n3/db content:learning:structure
pnpm -F @nihongo-n3/db content:learning:readiness
pnpm -F @nihongo-n3/db content:learning:candidate
pnpm -F @nihongo-n3/db content:learning:authoring
pnpm -F @nihongo-n3/db content:learning:authoring:full
pnpm -F @nihongo-n3/db exec node --import=tsx src/ops/validate-learning-path-representatives.ts
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/e2e exec playwright test learning-lessons.spec.ts learning-experience.spec.ts menu-smoke.spec.ts audio-qa.spec.ts --project=chromium --project=webkit --reporter=line
```

`content:learning:structure`는 기존 v1의 수량/필드/답 위치 구조만 검사한다. `content:learning:readiness`는 보존된 v1에서 **exit1이어야 한다**: 31개 실제 연결 실패, 독립 검수 불합격, v2 source hash 불일치, 반복/번역 placeholder/정답 노출을 차단한다. 새 `content:learning:candidate`도 **exit1**이며 v3 대표 통과와 새220개 개념 조회0실패를 전체은행 미완료와 분리한다. 테스트의 fail-closed 통과가 출판 gate의 성공을 뜻하지 않는다. authoring 두 명령의 기존 출력은 불변이므로 그대로 재실행하면 보존 오류로 중단한다. 구조 재검사는 `learning-path-v4-authoring.test.ts`를 사용하며 새 작성 보고서가 필요하면 새 출력 번호를 지정하도록 코드/명령을 명시적으로 갱신한다.

현재 후보의 최종 실행 수와 미실행 범위는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 기록한다. 테스트 작성 중의 타입 표기·fixture 필수 시각/Node SQLite prototype 오류와 새0031을 unknown으로 보던 과거 백업 테스트는 교정했다. 실패를 운영 DB 손상으로 해석하거나 최초 결과를 삭제하지 않는다.

## 다음 실행 — 순서 고정

1. 동결 초안/불합격 리뷰를 보존한 채 **새 버전**으로 작성한다. 정확한 공개 개념20개/급수를 먼저 DB에서 확정한다. N3·TOPIK3/4 대표 레슨을 각각1개 작성해 의미/화면 계약을 검수한다.
   후속 판정: 공개220개념 확정·v3 대표 정적 계약 두 승인은 완료, 실제 화면/가족 검증은5단계에서 별도로 실행한다.
2. 번역 placeholder·문법 모호성·청해 반복·쓰기 예시를 전수 재작성한다. 각 개념의 두 상황이 실제로 다르고 문제/개념 연결이 타당한지 확인한다.
   후속 판정: 공식웹10개+공식API5표제어로부족14개개념 증적을완성했다. source06의86record/lookup0실패를확인해 frozen-cohort01의440/220/220을새3hash로동결했다. 구조/source완료와의미승인은별개다. 새로운동결후결함이나오면새버전/새hash로고치며기존failed를편집하지않는다.
3. 새 draft+intake hash에 두 reviewer를 독립 배정한다. 자동 red flag와 정확급수 lookup0, 두 승인440/440을 만족해야 한다. 기존 실패 artifact의 `passed` 값을 편집하지 않는다.
4. draft staging/reseed/fresh/기존 기록 upgrade,11급수 실제 레슨 세션·재전송·복습·기록을 확인한다. Preview160은 별도 배치/증적로 재검증한다.
5. G0–G4와 새 Preview 전수 검증, 실제 가족 관찰, 실제 Chrome 양언어 onend/사람 가청/Network R2·legacy0을 같은 배포에 연결한다.
6. 현 schema backup/restore·rollback·predeploy·현재 Production 승인 이후에만 migration/콘텐츠/Worker/Pages를 반영한다. 실패 시 신규 공개/화면 전환을 철회하고 정상 학습 기록은 보존한다.

음성 코어는 변경하지 않는다. **Google 우선·같은 언어 설치 음성 fallback, ko/ja만 허용, R2 발음 경로 금지**가 현재 계약이다. 로컬 mock 검사는 실제 소리나 새로운 사용자 청취 증거가 아니다.

출시 후7/30일에는 두 학습자의 완료·중단·재개·지연 재확인을 관찰한다. 월1회 source 버전/부족 영역을 점검하되 외부 갱신이나 생성 초안을 자동 공개하지 않는다.
