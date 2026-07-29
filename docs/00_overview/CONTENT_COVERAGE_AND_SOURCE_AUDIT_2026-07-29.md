# 콘텐츠 커버리지·출처 감사 — 2026-07-29

## 목적과 승인 범위

이 감사는 JLPT N5~N1과 TOPIK 1~6의 실제 학습 가능 범위를 확장하기 위한 로컬 읽기 전용 조사다. 원격 D1/R2/Pages/Worker에는 쓰지 않았고, 배포·OAuth·reviewer·공개 릴리스는 범위 밖이다.

승인된 정책:

```text
CONTENT_SOURCE_POLICY_APPROVED=yes
WEB_AUDIO_POLICY=licensed_web_audio_to_private_r2
KOREAN_BASIC_DICTIONARY_API_APPLICATION_APPROVED=yes
WEB_AUDIO_TTS_FALLBACK_APPROVED=yes
```

## 현재 JLPT 운영 seed

`packages/db/src/seed/content-manifest.ts`를 로컬에서 생성해 확인한 항목 수다. `sentences` 1,100개는 N2/N1 전용 seed가 아니라 기존 공용 예문 코퍼스다.

| 레벨 | 어휘 | 문법 | 한자 | 상태 |
| --- | ---: | ---: | ---: | --- |
| N5 | 700 | 55 | 103 | 운영 seed 있음 |
| N4 | 548 | 98 | 164 | 운영 seed 있음 |
| N3 | 2,052 | 163 | 275 | 운영 seed 있음 |
| N2 | 200 | 36 | 54 | 자체 저작 Batch 1·2·3이 main seed에 연결됨 |
| N1 | 0 | 0 | 0 | `source-required` intake template만 존재 |

확인된 계약 갭:

- DB의 `vocab`, `grammar`, `kanji`, `sentences`, `reading_passages`는 N1/N2 값을 수용한다.
- 실제 content manifest, 경로 상수, parser와 커리큘럼은 N5~N3 및 N2 Batch 1·2·3을 운영한다.
- `AUDIO_BATCH_LEVELS`와 R2 verifier는 N5~N3만 대상으로 한다.
- PWA는 N5~N1 타입과 일부 UI를 갖고, N2는 Batch 1·2·3까지 실제 학습할 수 있다. N1 데이터는 아직 없다.

## 현재 TOPIK 운영 데이터

| 범위 | 항목 | 상태 |
| --- | ---: | --- |
| TOPIK I 듣기 | 6 | 자체 저작 practice bank |
| TOPIK I 읽기 | 6 | 자체 저작 practice bank |
| TOPIK II 듣기 | 6 | 자체 저작 practice bank |
| TOPIK II 쓰기 | 4 | 자체 저작 practice bank |
| TOPIK II 읽기 | 6 | 자체 저작 practice bank |
| 합계 | 28 | 시험 단위 최소 bank |

현재 화면·API는 `TOPIK-I`와 `TOPIK-II`를 중심으로 동작한다. 1~6급 각각을 목표 레벨로 가진 커리큘럼, 충분한 어휘·문법·읽기·듣기·쓰기 데이터, 각 등급 단위의 완료·복습 경로는 아직 없다.

## 발음 정책과 현 코드의 충돌

사용자 정책은 "라이선스가 확인된 웹 음원을 private R2에 불변 보관"하는 것이다. 그러나 현 코드는 다음과 같이 동작한다.

- 일본어 학습 UI는 브라우저 SpeechSynthesis를 R2보다 우선한다.
- `TopikLearn`의 foundation 표현은 브라우저 한국어 음성을 직접 사용한다.
- TOPIK 문제에 R2 key가 없으면 `browser-fallback`을 반환한다.
- N2/N1은 오디오 생성 batch와 R2 head verifier 범위에서 제외된다.

따라서 첫 구현 slice에는 R2-only 재생, audio asset provenance, N5~N1·TOPIK 1~6 parity verifier를 포함해야 한다. 웹 음원이 없고 승인된 TTS fallback을 쓰는 경우에도 provider/model/언어/음성 버전/입력 텍스트 hash/생성 시각/R2 bytes hash를 provenance로 남긴다.

## 검토 가능한 출처 registry 초안

| 코드 | 용도 | 재사용 조건 | 현재 상태 |
| --- | --- | --- | --- |
| `JMDICT-CC-BY-SA-4` | JLPT 어휘·읽기·의미 후보 | CC BY-SA 4.0, attribution·동일조건 의무 확인 | 다운로드·파싱 전 |
| `KANJIDIC-CC-BY-SA-4` | JLPT 한자·읽기 후보 | CC BY-SA 4.0, attribution·동일조건 의무 확인 | 다운로드·파싱 전 |
| `KANJIVG-CC-BY-SA-3` | 획순 SVG 후보 | CC BY-SA 3.0, attribution·동일조건 의무 확인 | 필요 시 도입 |
| `KRDICT-CC-BY-SA-2-KR` | TOPIK 한국어 어휘·정의·예문 후보 | 텍스트는 CC BY-SA 2.0 KR; 멀티미디어는 파일별 조건 | API key 대기 |
| `WEB-AUDIO-PER-ASSET` | 일본어·한국어 사람 녹음 | 각 파일의 저작자·라이선스·재배포 조건 확인 | 수집 전 |
| `CF-MELOTTS-FALLBACK` | 웹 음원이 없는 항목의 승인된 TTS fallback | provider/model/출력 provenance 및 비용 기록 | 품질 pilot 전 |
| `SELF-AUTHORED-2026` | 연습문항·해설·예문·쓰기 답안 | 공식 문제·정답·음원 복제 금지 | 첫 slice에서 작성 |

공식 JLPT/TOPIK 자료는 시험 형식과 범위의 reference만으로 기록한다. 이를 어휘·문장·문제·음원의 재배포 출처로 사용하지 않는다.

## 한국어기초사전 API 발급 절차

공식 신청 페이지는 저작권 정책 확인과 이메일 주소를 요구하고, 인증키를 해당 이메일로 발급한다. 본인 이메일·정책 동의를 대신 제출하지 않는다.

1. 사용자가 공식 Open API 신청 페이지에서 저작권 정책을 확인하고 본인 이메일로 인증키를 발급받는다.
2. 키를 채팅이나 저장소에 기록하지 않는다.
3. 키를 받으면 다음 작업에서 secret 관리 방식과 preview만의 첫 호출 범위를 별도 승인받는다.

이 API는 텍스트 어휘 정보와 발음 표기를 제공하지만, 음원 이용 권한은 별도 파일별 조건이므로 R2 음원 source로 자동 채택하지 않는다.

## 권장 최소 데이터 계약

기존 review-gated `content_releases`는 이 비공개 개인 학습 콘텐츠의 ingest 경로로 사용하지 않는다. 가짜 reviewer 값을 넣어 우회하지 않는다. 대신 기존 `track_content_sources`를 확장 활용하고, 다음 두 관계를 새 migration으로 추가하는 방안을 권장한다.

1. `content_source_assets`: 외부 dataset·공식 reference·웹 음원·TTS 출력의 URL, license, attribution, source hash, bytes hash, 허용 용도, 취득/생성 시각을 기록한다.
2. `content_audio_bindings`: `vocab`/`kanji`/`sentences`/`reading_passages`/TOPIK 학습 item과 immutable R2 audio asset을 연결한다.

이 방식은 기존 `audio_r2_key`를 깨지 않고 source provenance와 audio provenance를 분리한다. TOPIK 1~6급 학습 콘텐츠는 기존 28문항 bank의 reviewer 필드를 재사용하지 않는 별도 owner-authored curriculum/item 모델로 추가하는 것이 정직하고 안전하다.

## 첫 수직 slice: JLPT N2

1. 공개 라이선스의 일본어 사전·한자 데이터를 작게 내려받아 source hash와 attribution을 기록한다.
2. 교육용 N2 태그 규칙을 문서화하고, 데이터에 "공식 N2 목록"이라는 표현을 쓰지 않는다.
3. N2 어휘·문법·한자와 자체 저작 예문/문제 fixture를 로컬 D1에 seed한다.
4. 라이선스 웹 음원을 우선 수집하고, 부족한 항목은 승인된 TTS fallback을 private R2에 생성한다.
5. N2 list/detail/quiz/reading/listening/audio의 API와 Chromium/WebKit E2E를 통과시킨다.
6. 사용자 승인 전에는 preview·production D1/R2에 쓰거나 배포하지 않는다.

## 이번 감사 실행 결과

- `pnpm -F @nihongo-n3/db seed:diff`: 통과 (`시드 대상 콘텐츠 변경 없음`)
- 로컬 소스 manifest 생성으로 현재 레벨별 seed 수 확인
- 원격 API/D1/R2/Pages/Worker 호출·쓰기·배포: 없음

## 1단계 로컬 구현 후 상태

위의 `발음 정책과 현 코드의 충돌` 절은 감사 당시의 baseline이다. 이후 로컬 구현에서 다음을 반영했다.

- `AUDIO_BATCH_LEVELS`와 R2 verifier 대상은 N5~N1으로 확장했다. 실제 batch 실행은 승인 전까지 하지 않는다.
- 일반 JLPT/TOPIK 학습 경로에서 `browser-fallback`과 browser SpeechSynthesis 대체 재생을 제거했다. 승인된 R2 asset이 없으면 `preparing`/`not-provided`을 표시한다.
- `content_source_assets`, `learning_content_stable_refs`, `content_audio_bindings`, TOPIK 1~6 owner-authored curriculum 모델을 additive migration으로 추가했다.
- private audio endpoint는 Service Worker Cache Storage에서 제외했다. 따라서 offline PWA가 private audio를 접근 제어 수단 없이 재생하지 않는다.

실제 외부 파일·한국어기초사전 API 결과·licensed web audio·TTS output은 아직 다운로드/생성/원격 저장하지 않았다. 후보별 허용 범위와 등록 전 증적은 [콘텐츠 소스 후보 레지스트리](CONTENT_SOURCE_CANDIDATE_REGISTRY_2026-07-29.md)에 정리한다.
