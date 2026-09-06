# 라이선스와 콘텐츠 출처

최종 점검: 2026-08-30 KST. 이 문서는 현재 seed와 external source 후보의 경계를 기록한다. source asset의 실제 승인 값은 D1의 `content_source_assets`, intake artifact와 해당 manifest가 최종 기준이다.

## 기본 원칙

- 저장소 코드는 루트 [MIT License](../LICENSE)를 따른다.
- 현재 운영 학습 콘텐츠는 저장소에서 자체 저작한다. 공식 JLPT/TOPIK 문항·정답·지문·음원은 복사·변형·재배포하지 않는다.
- 외부 데이터는 정확한 URL, license ID/URL, attribution, allowed use, 취득/생성 시각, SHA-256이 확인되기 전 seed 또는 R2 asset으로 등록하지 않는다.
- level/grade는 학습 난이도 분류이며 공식 어휘 목록, 출제 비율, 합격 판정이 아니다.

## 학습 콘텐츠와 provenance

### 현재 자체 저작 콘텐츠

N5~N3 원본, N2 Batch 1~5, N1 Batch 1~4, TOPIK owner curriculum Batch 1~5, TOPIK placement/practice bank의 예문·지문·대본·문제·보기·정답·해설은 프로젝트의 교육용 자체 저작이다. source manifest는 각 파일 SHA-256과 source provenance를 저장한다.

2026-08-23 Preview 후보인 N2/N1 정적 문제은행 120문항과 TOPIK owner Batch 6 40항목도 전부 자체 저작이며, 별도 intake hash·최종 draft hash·두 reviewer artifact에 연결됩니다. 2026-08-24 Production 음성 복구와는 별개로, 이 후보는 새 predeploy·backup/restore·immutable release verifier와 명시적 승인이 필요해 Production에는 아직 포함되지 않습니다.

### TOPIK 자체 저작 콘텐츠

TOPIK owner curriculum은 practice bank나 공개 content release와 분리된다. owner curriculum의 source asset, stable reference, progress와 review history는 계정 범위를 벗어나 공개 시험 자료의 출처를 주장하지 않는다.

## 오디오

발음은 같은 언어의 Google 브라우저 음성을 우선하고, 없으면 같은 언어의 기기 음성을 사용한다. JLPT·QA·TOPIK owner item은 R2 asset·fallback을 사용하지 않으며, `audio_text_ko`가 있으면 브라우저 음성으로 재생하고 없으면 unavailable로 처리한다.

발음용 R2 asset의 immutable key, license, input/source hash, output bytes hash, activation은 더 이상 생성·승인하지 않는다. 아래 필드는 과거 provenance 감사 항목일 뿐 신규 발음 등록 체크리스트가 아니다.

~~~text
historical source URL or TTS provider/model/voice/version
license ID and license URL
required attribution and allowed use
source or input SHA-256
retrieved/generated time
stored audio bytes SHA-256
Google voice availability and playback text
R2 발음 binding/activation은 신규 등록 금지
~~~

## 외부 후보와 확인 시점

- [EDRDG General Dictionary Licence](https://www.edrdg.org/edrdg/licence.html): JMdict·KANJIDIC2 등에 CC BY-SA 4.0과 앱 내 attribution 조건을 안내한다. 실제 사용 전 배포 파일과 field별 제약을 다시 검토한다.
- [KanjiVG](https://kanjivg.tagaini.net/): 획순 SVG 후보다. 파일별 creator, license, derivative/redistribution 조건을 확인한 뒤에만 사용한다.
- [한국어기초사전 Open API](https://krdict.korean.go.kr/kor/openApi/openApiInfo): 텍스트·발음 표기 후보다. API key, 이용 조건, 응답별 attribution을 확인하며 발음 표기만으로 audio asset 권리가 생기지 않는다.
- [JLPT 레벨 안내](https://www.jlpt.jp/e/about/levelsummary.html)와 [JLPT 시험 영역](https://www.jlpt.jp/guideline/testsections.html): 시험 형식·수준 참고용이다.
- [TOPIK 공식 사이트](https://www.topik.go.kr/): 시험 정보 참고용이며 문제 원본 수집 source가 아니다.

후보의 상세 상태와 등록 체크리스트는 [콘텐츠 소스 후보 레지스트리](00_overview/CONTENT_SOURCE_REGISTRY.md)에 있다.

## 시각 자산

apps/web/public의 프로젝트 전용 시각 자산은 이 앱 UI에서만 사용한다. 제3자 템플릿이나 데이터셋으로 재배포하지 않는다.
