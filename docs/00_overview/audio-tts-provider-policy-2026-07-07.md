# 오디오/TTS 운영 정책

최초 작성: 2026-07-07 KST
최종 갱신: 2026-07-15 KST
코드 기준: `packages/shared/src/audio-policy.ts`

## 원칙

1. 승인된 R2 고정 오디오가 모든 학습 surface의 1순위다.
2. R2가 없으면 사용자가 확인할 수 있는 일본어 browser voice로 fallback한다.
3. provider를 조용히 바꾸거나 런타임 요청 중 유료 TTS를 호출하지 않는다.
4. Google Cloud TTS는 관리자 승인 batch에서만 사용한다.
5. R2 object에는 provider, model, audio version, content hash를 기록한다.
6. 30표본 청감 QA 없이 전체 재생성을 실행하지 않는다.

## Surface 정책

| Surface | 1순위 | Fallback | 주의 |
| --- | --- | --- | --- |
| kana | R2 `audio/kana/v2/...` | Japanese browser voice | 문자+대표 단어를 한 번 재생 |
| vocab | R2 immutable key | Japanese browser voice | 단어 카드·복습 공통 |
| kanji | R2 immutable key | Japanese browser voice | on/kun reading 명시 |
| sentence/example | R2 immutable key | Japanese browser voice | 문장 억양 QA 필요 |
| listening | R2 immutable key | Japanese browser voice | 정답 text 노출 금지 |
| QA | R2 candidate sample | 없음/명시 오류 | 누락 파일은 404 표시 |

## Provider 역할

| Provider | 역할 | 런타임 자동 생성 |
| --- | --- | --- |
| Google Cloud TTS | 승인된 QA/전체 batch 후보 | 금지 |
| Cloudflare Workers AI | QA 비교 후보 | 공개 요청에서는 금지 |
| VOICEVOX | HTTPS engine이 있을 때 QA 후보 | URL 미설정 시 비활성 |
| browser | 명시적 fallback과 voice 선택 | 기기 내 재생 |
| Style-Bert-VITS2 | adapter 확장 슬롯 | 현재 운영 비활성 |

## 30표본 QA

`/audio-qa`에서 동일한 30문장을 provider별로 듣고 다음을 기록한다.

- 자연스러움
- pitch accent와 mora
- 장음·촉음·발음
- 문장 억양
- 잡음/속도
- device/OS/browser
- provider/model/voice/version

모든 후보 30개가 준비되지 않으면 우승 provider를 확정하지 않는다.

## Batch 승인

Admin queue는 기본 dry-run이다. 실제 전체 생성은 다음을 모두 요구한다.

- admin 인증
- `provider: "google"`
- `execute: true`
- `X-Audio-Batch-Approval`과 Worker secret 일치
- 사전 비용 승인
- 30표본 청감 승인

R2 key 예시:

```text
audio/vocab/n3/7-<content-provider-model-version-hash>.mp3
```

콘텐츠 또는 provider version이 달라지면 새 key를 만들고 기존 object를 덮어쓰지 않는다.

## 릴리스 관문

```bash
pnpm -F @nihongo-n3/db verify:remote:audio
```

목표는 N5~N3 vocab, kanji, sentences의 `audio_r2_key` 누락 0이다. 2026-07-15 fresh DB 기준 누락은 4,954건이므로 R2 오디오 릴리스는 미완이다.
