# 콘텐츠 소스 후보 레지스트리

최종 점검: 2026-08-30 KST. 이 레지스트리는 후보를 기록할 뿐 현재 seed에 external data를 승인하거나 적재하지 않는다. 실제 릴리스는 별도 intake artifact와 취득 시각·hash를 요구한다.

| 후보 | 허용 후보 용도 | seed 등록 전 필수 증적 | 현재 상태 |
| --- | --- | --- | --- |
| JMdict / KANJIDIC2 | 표기·읽기·의미의 후보 검토 | exact 배포본 URL, version, hash, attribution, license review | 2026-08-23 fact-only intake 재확인; 원문 seed 없음 |
| KanjiVG | 획순 SVG 검토 | file URL, creator, license, hash, derivative/표시 계획 | 후보만 등록 |
| 한국어기초사전 Open API | 어휘·정의·발음 표기 검토 | API terms 재확인, API key 관리, response hash, attribution | 2026-08-23 fact-only intake 재확인; 응답 원문 seed 없음 |
| 사람 녹음 | 발음 표기·품질 비교 후보 | file/page URL, author, license, redistribution scope, bytes hash | 발음 재생 경로에는 사용하지 않음 |
| Google 음성 | 브라우저 발음 재생 | Google voice availability, language, playback text | 운영 중; R2 저장 없음 |
| 자체 저작 | 학습 본문·예문·문제·해설·대본 | source text hash, source asset ID, stable refs, 두 reviewer | Production 운영 및 2026-08-23 Preview 후보 |

## 등록 규칙

외부 source asset은 URL, license ID와 URL, required attribution, allowed use, source SHA-256, retrieval/generated time 없이 등록하지 않는다. 발음은 Google 우선 동일 언어 브라우저 음성을 사용하며 R2 key·stored bytes hash·audio activation을 새 등록 기준으로 추가하지 않는다.

JMdict와 KANJIDIC2의 현재 일반 라이선스는 EDRDG가 안내하는 CC BY-SA 4.0이며, significant extract를 쓰는 앱은 Sources/About 등에서 attribution을 제공해야 한다. KanjiVG와 한국어기초사전의 실제 이용 조건은 자료·응답·파일 단위로 재확인한다. 상세 출처 링크는 [Attributions](../ATTRIBUTIONS.md)를 따른다.

공식 JLPT/TOPIK 사이트는 시험 구조 참고용이다. 공식 문항·정답·지문·음원은 source 후보가 아니다.
