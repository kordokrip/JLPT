# 오디오/TTS 운영 정책

기준일: 2026-07-07 KST

이 문서는 JLPT 앱의 발음 재생 경로를 기능별로 고정하기 위한 운영 메모다. 실제 코드 기준 단일 정책은 `packages/shared/src/audio-policy.ts`에 둔다.

## 기본 원칙

- R2에 고정 오디오가 있는 단어, 한자, 문장은 R2를 우선한다.
- 문자 암기처럼 한 글자 발음이 부자연스럽게 합성되는 영역은 브라우저 일본어 음성을 우선한다.
- 브라우저 음성은 가능한 경우 Google 일본어 voice를 우선한다.
- Cloudflare, Google, VOICEVOX, Style-Bert-VITS2는 배치 생성/provider QA용 백엔드 provider로 유지한다.
- 사용자 화면은 “현재 실제로 들리는 경로”가 흔들리지 않도록 surface별 정책을 통한다.

## Surface별 정책

| Surface | 1순위 | Fallback | 적용 화면 | 이유 |
| --- | --- | --- | --- | --- |
| `kana` | browser | R2 | 문자 암기 히라가나/가타카나 | 한 글자 반복 합성이 부자연스러워 예시 단어를 천천히 재생한다. |
| `vocab` | R2 | browser | 단어 카드, 탐색, 복습 | 배치 생성된 고정 오디오가 있으면 항상 같은 품질로 재생한다. |
| `kanji` | R2 | browser | 한자 카드, 문자 암기 한자 | 읽기 조합이 필요해 느린 재생을 허용한다. |
| `sentence` | R2 | browser | 문장/예문 오디오 | 문장은 고정 오디오가 가장 안정적이다. |
| `example` | browser | R2 | 짧은 예문 버튼, AI 번역 결과 | 즉시 반응성과 Google 일본어 voice 품질을 우선한다. |
| `listening` | browser | R2 | 청해 퀴즈 | 현재 사용자 체감 품질은 브라우저 일본어 voice가 우세하므로 기본값으로 둔다. |
| `qa` | R2 | browser | `/audio-qa` | provider 비교용 샘플은 R2 고정 파일을 우선한다. |

## 운영 메모

- R2 키는 `audio/{type}/{level}/{id}.mp3` 규칙을 유지한다.
- 백엔드 배치 생성은 `TTS_PROVIDER`와 provider별 secret에 따라 실제 엔진을 선택한다.
- 브라우저 재생은 사용자 기기의 `speechSynthesis` voice 품질에 좌우되므로, 설정 화면에서 voice 선택 UI를 계속 유지한다.
- VOICEVOX나 Google Cloud TTS가 배치 QA에서 우세하면 R2 재생성 후 `vocab`, `kanji`, `sentence` surface 품질이 같이 개선된다.
