# 라이선스와 콘텐츠 출처

## 기본 원칙

- 이 저장소의 코드에는 루트 [MIT License](../LICENSE)가 적용된다.
- JLPT/TOPIK의 공식 문항, 정답, 지문, 음원은 학습 데이터로 복사·변형·재배포하지 않는다.
- 앱의 문법 설명, 예문, 읽기·듣기 대본, 문제, 보기, 정답과 해설은 자체 저작한다.
- 외부 데이터를 사용할 때는 정확한 파일/API URL, 라이선스 ID·URL, attribution, 취득 시각, SHA-256과 허용 용도를 기록한다.

실제 데이터 적재 기준은 `packages/db/src/seed/content-manifest.ts`와 `content_source_assets`다. 후보 단계의 자료와 조건은 [콘텐츠 소스 후보 레지스트리](./00_overview/CONTENT_SOURCE_CANDIDATE_REGISTRY_2026-07-29.md)에 있다.

## 학습 콘텐츠와 Provenance

N5~N3 및 N2 자체 저작 batch의 학습 원본은 `docs/`에 있고, seed verifier가 출처·hash·필수 학습 필드를 검사한다. TOPIK 자체 저작 콘텐츠는 `docs/07_topik/`의 원본과 전용 curriculum seed를 사용한다. 이 콘텐츠는 공식 시험을 대체하거나 점수를 예측하지 않는다.

JLPT/TOPIK의 레벨·영역·형식은 학습 난이도를 설계하기 위한 참고 자료로만 사용한다.

- [JLPT 레벨 안내](https://www.jlpt.jp/e/about/levelsummary.html)
- [JLPT 시험 영역](https://www.jlpt.jp/e/guideline/testsections.html)
- [TOPIK 공식 사이트](https://www.topik.go.kr/)

## 외부 사전·문자 자료 후보

JMdict/EDICT/KANJIDIC 계열은 CC BY-SA 4.0, KanjiVG는 CC BY-SA 3.0, 한국어기초사전의 텍스트 자료는 해당 이용 조건과 attribution을 따른다. 실제 채택 전에는 파일·필드별 조건을 다시 확인한다. 외부 데이터의 레벨 태그, 한국어 번역, 예문, 문항과 해설은 이 앱이 자체 작성한다.

## 오디오

정상 학습 경로의 오디오는 라이선스가 확인된 source 또는 승인된 TTS 생성물만 private R2 asset으로 연결한다. 각 asset에는 source/provider, licence, input/source hash, 생성·취득 시각, bytes hash를 기록한다. R2 asset이 없으면 앱은 재생 대신 준비 또는 미제공 상태를 표시한다.

## 시각 자산

`apps/web/public/`의 프로젝트 전용 시각 자산은 이 앱의 UI에서만 사용한다. 제3자 배포용 데이터셋이나 템플릿으로 재배포하지 않는다.
