# 콘텐츠 소스 후보 레지스트리 — 2026-07-29

## 상태와 적용 규칙

이 문서는 외부 자료를 **다운로드하거나 D1/R2에 넣기 전**의 후보 레지스트리다. 각 행은 `content_source_assets`의 seed-ready 레코드가 아니다. source/file SHA-256, 취득 시각, 실제 파일 URL과 파일별 라이선스가 아직 없으므로 이 문서를 근거로 콘텐츠·음원을 seed하거나 재배포해서는 안 된다.

- 시험 주관기관의 문항·정답·음원은 후보가 아니다. JLPT/TOPIK의 레벨·능력·형식 참조만 허용한다.
- 외부 사전 데이터는 단어 형태·읽기·의미 후보로만 쓰고, 레벨 태그·문법 설명·예문·읽기/듣기 스크립트·문항·해설은 앱의 자체 교육용 데이터로 작성한다.
- 사람이 녹음한 licensed web audio가 없다는 항목별 선정 사유가 남은 경우에만 TTS 후보가 된다.
- 모든 실제 source asset은 URL, license ID/URL, attribution, allowed use, source/file SHA-256, retrieved/generated time을 완성한 뒤 immutable `content_source_assets`로 고정한다.

## 후보 레지스트리

| 후보 코드 | 범위와 사용 한계 | 라이선스·표시 의무 | seed-ready 전 필수 증적 | 상태 |
| --- | --- | --- | --- | --- |
| `JMDICT-EDRDG-CC-BY-SA-4.0` | 일본어 표기·읽기·영어 의미의 어휘 후보. 한국어 번역·JLPT 레벨·예문·문항에는 사용하지 않는다. | CC BY-SA 4.0, 앱의 Sources/About에서 EDRDG 이용·출처·라이선스 링크 표시. EDRDG는 사전 사용 서비스에 최신 데이터로 정기 갱신할 절차도 요구한다. | 정확한 배포 파일 URL·release/version·SHA-256·attribution 문구·갱신 owner/주기 | 후보만 등록 |
| `KANJIDIC2-EDRDG-CC-BY-SA-4.0` | 한자 표기·읽기·속성 후보. 별도 권리 정보가 있는 필드는 license review 전 제외한다. | CC BY-SA 4.0 및 EDRDG attribution. | 정확한 배포 파일·버전·SHA-256·사용 필드 목록·attribution·갱신 계획 | 후보만 등록 |
| `KANJIVG-CC-BY-SA-3.0` | 획순 SVG에 한정. 어휘 뜻·발음·시험 문제 출처가 아니다. | CC BY-SA 3.0, 저작자/프로젝트 attribution 및 동일조건 의무. 다른 데이터셋과 licence를 혼합하기 전에 호환성 검토가 필요하다. | 개별 SVG/배포본 URL·SHA-256·저작자 표시·파생 SVG 여부·표시 위치 | 후보만 등록 |
| `KRDICT-API-CC-BY-SA-2.0-KR` | TOPIK 어휘·정의·용례 후보와 발음 표기. API 결과의 발음 표기는 audio asset이 아니다. | 사이트에 별도 표기가 없는 자료는 CC BY-SA 2.0 KR로 표시된다. attribution·동일조건 의무를 product policy에 반영한다. | 사용자 발급 API key, Open API/저작권 정책 재확인, 요청/응답 원문 hash, 항목별 attribution, API 결과에 포함되는 multimedia 권리 확인 | 인증키 대기 |
| `COMMONS-LINGUALIBRE-PER-FILE` | 일본어·한국어 사람 녹음 후보. 플랫폼/카테고리 단위로 licence를 가정하지 않는다. | 파일 페이지의 creator, exact licence, attribution, modification/derivative와 redistribution 조건을 따른다. | 원 파일 URL·파일 페이지 URL·저작자·license ID/URL·SHA-256·audio bytes SHA-256·R2 key·retrieval time | 후보 탐색 전 |
| `LICENSED-WEB-AUDIO-PER-ASSET` | 위 플랫폼 외의 사람 녹음 후보. | 공급자/파일별 명시된 재배포·상업 이용·변경 조건을 모두 충족해야 한다. | 위 audio 증적과 함께 허용 범위가 `private R2 learning playback`을 포함하는지 확인 | 후보 탐색 전 |
| `CF-MELOTTS-FALLBACK` | licensed human audio가 없는 항목의 일본어·한국어 fallback 후보. | 외부 원본 audio의 대체물이므로 source text 권리와 TTS provider 조건을 분리해 기록한다. | 사람 녹음 부재 사유, provider/model/language/voice/version, input hash, output bytes hash, immutable R2 key, 품질·비용 pilot 결과 | pilot 승인 대기 |
| `SELF-AUTHORED-LEARNING-2026` | 문법 설명, 예문, 읽기/듣기 스크립트, 문제, 보기, 정답, 해설, 쓰기 과제. | 자체 저작임을 source asset에 기록하고 공식 시험 자료와 비복제를 확인한다. | source text SHA-256, 작성 시각, source asset ID, stable item refs | N2 local fixture로 검증됨 |
| `JLPT-LEVEL-REFERENCE-ONLY` | N1~N5 능력·읽기·듣기 범위 설계 참고. | 공식 홈페이지는 시험 콘텐츠 재배포 source가 아니다. | 참조 URL, 확인일, 인용하지 않은 설계 요약 | reference only |
| `TOPIK-FORMAT-REFERENCE-ONLY` | TOPIK I/II 영역·형식 설계 참고. | 공식 문항·정답·음원·지문은 저장·변형·seed하지 않는다. | 참조 URL, 확인일, 비복제 확인 | reference only |

## 출처 교차 확인

- [EDRDG General Dictionary Licence](https://www.edrdg.org/edrdg/licence.html)는 JMdict/EDICT/KANJIDIC 계열을 CC BY-SA 4.0으로 제공하며, 소프트웨어·웹·앱에서 attribution/link를 요구한다. 실제 사전 데이터 사용 서비스에는 최신 버전으로 갱신하는 절차도 요구한다.
- [KanjiVG](https://kanjivg.tagaini.net/)는 SVG 획순 자료를 CC BY-SA 3.0으로 제공한다.
- [한국어기초사전 Open API](https://krdict.korean.go.kr/kor/openApi/openApiInfo)는 검색/내용 API 이용에 인증키를 요구한다. [저작권 정책·신청 페이지](https://krdict.korean.go.kr/jpn/openApi/openApiRegister)는 별도 표기가 없는 사이트 자료의 CC BY-SA 2.0 KR 조건과 attribution/share-alike를 설명한다.
- [JLPT 레벨 안내](https://www.jlpt.jp/e/about/levelsummary.html)는 N1~N5의 능력 범위를 제공하지만 학습 콘텐츠 재배포 허가가 아니다.
- [Lingua Libre 녹음 안내](https://lingualibre.org/wiki/Help:RecordWizard_manual/scn)는 녹음 흐름 참고용일 뿐, 실제 채택은 각 파일의 licence·저작자·파일 URL 검토로 결정한다.

## D1/R2 등록 체크리스트

각 외부 텍스트/파일/audio asset에 대해 다음이 모두 채워질 때만 별도 승인된 ingest 작업에서 `content_source_assets`와 `content_audio_bindings`에 기록한다.

```text
SOURCE_ASSET_ID=<stable opaque id>
SOURCE_URL=<exact file or API response URL>
LICENSE_ID=<exact licence>
LICENSE_URL=<exact licence URL>
ATTRIBUTION=<required attribution>
ALLOWED_USE=<verified redistribution/use scope>
SOURCE_OR_FILE_SHA256=<sha256>
RETRIEVED_OR_GENERATED_AT=<ISO-8601 UTC>

# audio only
STORED_AUDIO_BYTES_SHA256=<sha256>
IMMUTABLE_PRIVATE_R2_KEY=private-audio/<language>/<kind>/<content-hash>.<ext>
```

TTS에는 `provider`, `model`, `language`, `voice`, `provider version`, `input text SHA-256`, `selection reason`도 필수다. 값 하나라도 비어 있으면 asset을 등록하지 않는다.
