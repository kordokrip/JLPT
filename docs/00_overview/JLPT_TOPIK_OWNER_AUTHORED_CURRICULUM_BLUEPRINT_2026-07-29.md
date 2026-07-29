# JLPT·TOPIK 자체 교육용 커리큘럼 설계 — 2026-07-29

## 공통 학습 단위 계약

이 설계의 레벨 표기는 시험 주관기관의 공식 어휘 목록이나 기출 콘텐츠라는 주장이 아니다. 공식 시험의 수준·영역 참조와 공개 라이선스 사전의 표기/읽기 후보를 바탕으로 만든 **자체 교육용** 단위다.

모든 unit은 다음을 갖는다.

| 요소 | 계약 |
| --- | --- |
| 식별 | stable `unit`/`item` ID, track, level/target grade, revision |
| 출처 | 자체 저작 source asset 또는 승인된 외부 asset ID; 질문·해설·예문에는 공식 시험 콘텐츠를 사용하지 않음 |
| 학습 | 어휘/문법/문자·표기, 자체 저작 읽기, listening script, 확인 퀴즈, 정답과 해설 |
| 발음 | vocabulary pronunciation 및 listening은 `content_audio_bindings`가 필요. `r2-ready`가 아니면 PWA는 재생하지 않고 준비/미제공 사유를 보임 |
| 복습 | 답안, 오답 이유, 안정 ID로 user learning history와 연결 |
| 오프라인 | app shell과 이미 내려받은 비민감 콘텐츠 metadata는 versioned storage 대상. private R2 audio는 Service Worker cache가 아니라 네트워크 전용이며, offline이면 `오디오를 오프라인에서 재생할 수 없음`을 명시 |

기본 한 unit의 작은 배치는 `어휘 12~20 / 문법 1~2 / 문자·표기 3~6(해당 시) / 자체 저작 예문 4~8 / 읽기 1 / listening script 1 / 확인 퀴즈 6~12`다. 수량은 교육용 운영 목표이며 공식 시험 출제 비율이 아니다.

## JLPT N5~N1 설계

| 레벨 | 단위 초점 | 필수 학습 객체 | 읽기·듣기 난이도 원칙 |
| --- | --- | --- | --- |
| N5 | 히라가나/가타카나, 기초 한자, 일상 고정 표현 | 어휘, 기초 문법, 문자/한자, 짧은 안내·대화 | 짧고 느린 일상 상황, 명시적 정보 확인 |
| N4 | 일상 사건, 시간·이유·비교, 기초 활용 확장 | 어휘, 문법, 한자, 문장, 읽기, listening | 친숙한 주제의 연결 문장과 느린 대화 |
| N3 | 일상 상황의 정보 연결과 요지 | 어휘, 문법, 한자, 문장, 읽기, listening | 안내·메시지·짧은 기사형 자체 지문, 거의 자연스러운 속도 |
| N2 | 업무·생활·사회 일반 주제의 논리와 의도 | 어휘, 문법, 한자, 문장, 읽기, listening | 명료한 설명·의견·공지와 연결 대화, 자연스러운 속도에 근접 |
| N1 | 추상적·논리적 담화와 뉘앙스 | 어휘, 문법, 한자, 문장, 읽기, listening | 다양한 주제의 논증/비평형 자체 지문, 자연스러운 속도의 장문·강연형 스크립트 |

N2 local fixture로 계약을 먼저 검증했고, 자체 저작 Batch 1·2·3을 main seed에 연결했다. 다음 N2 batch도 같은 source asset·stable reference·R2 준비 상태 계약을 사용하며, N2의 unit 수가 충분해지기 전에는 N1 대량 seed를 시작하지 않는다.

## TOPIK 1~6 설계

TOPIK 학습 단위는 기존 review-gated `topik_practice_questions` 28개와 분리된 `topik_owner_authored_curriculum_units/items`에만 기록한다. unit의 `target_grade`와 item의 `target_grade`는 1~6에서 일치해야 한다.

| 목표 급 | 주요 unit | 필수 학습 객체 | 자체 저작 성취 확인 |
| --- | --- | --- | --- |
| 1급 | 한글 해독, 생존 어휘, 기본 조사·어미, 생활 표현 | 문자/발음표기, 어휘, 문법, 짧은 읽기·듣기 | 표지·시간표·짧은 대화 이해 |
| 2급 | 일상 경험, 약속·요청·비교, 기본 서술 확장 | 어휘, 문법, 읽기, 듣기, 짧은 작문 연습 | 안내·메시지 요지와 요구 파악 |
| 3급 | 사회 생활, 이유·대조·순서, 정보 연결 | 어휘, 문법, 읽기, 듣기, 문단 쓰기 | 일상 설명문·대화의 핵심과 근거 파악 |
| 4급 | 업무·학업, 의견·추론, 연결된 문단 | 어휘, 문법, 읽기, 듣기, 구조화된 쓰기 | 안내/설명/의견의 세부와 의도 파악 |
| 5급 | 사회·문화 주제, 논리 전개, 격식 표현 | 고급 어휘, 문법, 읽기, 듣기, 요약·의견 쓰기 | 긴 설명과 토론형 스크립트의 논점 분석 |
| 6급 | 추상·전문 주제, 관점 비교, 정밀한 표현 | 고급 어휘, 문법, 읽기, 듣기, 논증 쓰기 | 다관점 텍스트·강연형 스크립트의 구조/함의 분석 |

TOPIK 1~6 모두 vocabulary pronunciation과 `audio_required=1` listening item에는 Korean `content_audio_bindings`가 필수다. 한국어기초사전의 발음 텍스트는 표기 보조일 뿐 audio binding을 만족시키지 않는다.

## PWA E2E 수용 기준

각 새 운영 batch는 Chromium과 WebKit에서 다음을 통과해야 한다.

1. 레벨 선택 → unit 목록/상세 → 퀴즈/읽기/듣기 → 정답·해설 → 복습 기록.
2. `r2-ready` fixture는 서버 `/api/v1/audio/...`만 요청하며 `SpeechSynthesis`를 호출하지 않는다.
3. `preparing`/`not-provided` fixture는 재생 버튼을 비활성화하고 사유를 보인다.
4. offline 상태에서는 shell 및 허용된 metadata 상태를 표시하고, private R2 audio가 cache에서 재생되지 않음을 확인한다.

private R2 audio 자체의 offline 저장/재생은 별도 제품 결정을 요구한다. 단순 Service Worker Cache Storage는 서버 접근 제어를 약화하므로 허용하지 않는다. 오프라인 audio가 꼭 필요하면 사용자 범위·암호화·만료·삭제·기기 분실 대응을 설계한 뒤 별도 승인을 받아야 한다.
