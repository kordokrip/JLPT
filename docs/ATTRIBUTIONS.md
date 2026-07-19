# 라이선스와 콘텐츠 출처

기준일: 2026-07-18 KST

이 문서는 코드, 학습 콘텐츠, 오디오, 시각 자산의 권리와 추적 경계를 분리한다. 콘텐츠별 실행 기준은 [content manifest](../packages/db/src/seed/content-manifest.ts)이며, 이 문서는 그 manifest가 참조하는 라이선스 설명의 기준점이다.

## 코드

애플리케이션 소스코드는 저장소 루트의 [MIT License](../LICENSE)를 따른다. npm 의존성은 각 패키지의 라이선스를 따르며, 재현 가능한 의존성 집합은 `pnpm-lock.yaml`로 고정한다.

## 학습 콘텐츠와 Provenance

운영 seed는 `packages/db/src/seed/content-manifest.ts`의 13개 N5~N3 source만 사용한다. 각 manifest 항목은 다음 provenance를 반드시 가진다.

- 원천 이름과 저장소 파일 URL
- 라이선스 식별자, 이름, 이 문서의 설명 URL
- 검수자와 최종 검토일
- source SHA-256, source version, parser version, 예상 row 수

`packages/db/src/seed/verify.ts`는 빈 provenance, source checksum/version/parser 불일치, 필수값, FK, 중복, FTS parity를 blocking failure로 처리한다. seed가 완료되면 D1의 `content_seed_runs`와 `content_seed_sources`에 content version, manifest SHA-256, source checksum, parser version, provenance JSON을 기록한다. 이 ledger는 학습 사용자 데이터나 PII를 저장하지 않는다.

13개 source의 파일 경로와 parser 수량은 [운영 가이드의 현재 운영 콘텐츠 표](./00_overview/B_ops_guide.md#2-현재-운영-콘텐츠)에 있으며, source별 원천·라이선스·검수 정보의 실행 원본은 manifest다. N2/N1 및 `AUTO`/`EN` 표기 자료는 provenance가 완전하고 별도 검수를 통과하기 전까지 운영 seed에 포함하지 않는다.

| manifest license ID | 적용 범위 | 운영 규칙 |
| --- | --- | --- |
| `LicenseRef-nihongo-n3-managed-content` | 저장소가 관리하는 N5~N3 학습 편집물 | 원문 파일, 검수자, 최종 검토일, checksum을 manifest에 고정한다. 외부 원데이터를 추가하면 별도 upstream 라이선스 기록이 필요하다. |
| `LicenseRef-nihongo-n3-mixed-terminology` | source `A`의 직무 용어 편집물 | 참조한 외부 용어집의 원문을 재배포하지 않는다. 재배포 가능한 원데이터를 포함하려면 각 원천 URL·라이선스·변경 내역을 추가로 검수한다. |

현재 N5~N3 학습표는 이 저장소가 관리하는 학습용 편집물이다. 자가진단의 시험 구성과 Can-do 근거는 아래 공식 자료를 참조하지만, 공식 시험 문제를 복제하지 않는다.

- [JLPT 시험 영역과 문항 구성](https://www.jlpt.jp/e/guideline/testsections.html)
- [JLPT N3 문항 목적](https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf)
- [JLPT 레벨 요약](https://www.jlpt.jp/e/about/levelsummary.html)
- [JLPT Can-do 자기평가 목록](https://www.jlpt.jp/e/about/candolist.html)
- [JF Standard](https://www.jfstandard.jpf.go.jp/)

## 동음이의어 콘텐츠

공개 동음이의어 목록은 [검수 데이터셋](../packages/db/src/seed/homophone-pairs.ts)의 30쌍 이상만 대상으로 한다. 각 쌍은 두 어휘의 source code, 읽기, 악센트형, 일본어·한국어 예문, 검수자, 최종 검토일을 가지며 seed 시 실제 `vocab` row를 FK로 연결한다.

악센트 검토는 [NINJAL UniDic](https://clrd.ninjal.ac.jp/unidic/en/)를 참조한다. 이 저장소는 UniDic 원데이터를 재배포하지 않으며, 향후 외부 원데이터를 포함하거나 자동 추출할 경우 해당 배포물의 라이선스와 버전을 별도로 검토한다. 공개 API는 검수 필드·동일 읽기·source mapping이 완전한 쌍만 반환한다.

## TOPIK 자체 저작 콘텐츠

`docs/07_topik/T3_placement_bank_v1.md`, `docs/07_topik/T4_placement_bank_v2.md`와
`packages/db/src/seed/topik-placement-bank*.ts`의 TOPIK I placement 문항은 프로젝트가
자체 저작한 내부 검증용 콘텐츠입니다. `track_content_sources`와
`track_content_seed_sources`에는 source code, 원천 문서 checksum, 작성 검수자, 2차 언어
검수자, 최종 검토일을 함께 저장합니다. 이 자료는 공식 TOPIK 기출문항, 정답지, 음원,
점수 환산표를 복제하거나 대체하지 않습니다. V2 24문항용 route와 화면은 기능 브랜치에
구현됐지만 production seed와 사용자 서비스에는 아직 노출하지 않았습니다. 공개 전에는
`TOPIK_PRODUCT_EXPANSION_PLAN_2026.md`의 provenance·정답·해설·FK·E2E 관문 및 별도 수동
승인을 충족해야 합니다.

## 오디오

브라우저 음성은 사용자 기기의 Web Speech 구현과 해당 음성 라이선스를 따른다. 서버 음성은 승인된 배치에서만 생성해 R2에 저장하며, provider, model, 생성 버전, 콘텐츠 해시를 객체 metadata와 D1 생성 로그에 기록한다. 런타임 공개 요청에서 유료 TTS를 호출하지 않는다. 세부 정책은 [오디오 provider 정책](./00_overview/audio-tts-provider-policy-2026-07-07.md)을 따른다.

## 시각 자산

`apps/web/public/brand-hero.png`, `page-bg-unified.png`, `brand-mark.png`와 PWA·favicon 파생
아이콘은 사용자가 제공한 한국·일본 주제 참고 이미지의 특성을 바탕으로 2026-07-19에
OpenAI 이미지 생성 도구로 새로 제작한 프로젝트 전용 래스터 자산이다. 참고 이미지의
워터마크, 문구 또는 구성을 복제해 포함하지 않는다. 입력 참고 이미지의 출처·이용 권한과
생성 결과의 서비스 약관 증빙은 운영 공개 범위를 확대하기 전에 프로젝트 소유자가 별도
보관해야 한다. 이 파일을 제3자용 데이터셋이나 템플릿으로 재배포하지 않는다.
