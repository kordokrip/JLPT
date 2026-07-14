# 라이선스와 콘텐츠 출처

기준일: 2026-07-15 KST

## 코드

애플리케이션 소스코드는 저장소 루트의 [MIT License](../LICENSE)를 따릅니다. npm 의존성은 각 패키지의 라이선스를 따르며 `pnpm-lock.yaml`에 고정된 버전을 기준으로 감사합니다.

## 학습 콘텐츠

`docs/01_n5`, `docs/02_n4`, `docs/03_n3`, `docs/04_supplement`의 학습표는 이 저장소에서 관리하는 원본입니다. 현재 운영 seed는 provenance와 검수 상태가 확인된 N5~N3 문서만 사용합니다. N2/N1 및 `AUTO`/`EN` 표시 자료는 운영 콘텐츠로 간주하지 않습니다.

자가진단의 시험 구성과 Can-do 근거는 다음 공식 자료를 참조하지만, 공식 시험 문제를 복제하지 않습니다.

- [JLPT 시험 영역과 문항 구성](https://www.jlpt.jp/e/guideline/testsections.html)
- [JLPT N3 문항 목적](https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf)
- [JLPT 레벨 요약](https://www.jlpt.jp/e/about/levelsummary.html)
- [JLPT Can-do 자기평가 목록](https://www.jlpt.jp/e/about/candolist.html)
- [JF Standard](https://www.jfstandard.jpf.go.jp/)

## 음성

브라우저 음성은 사용자 기기의 Web Speech 구현과 해당 음성 라이선스를 따릅니다. 서버 음성은 승인된 배치에서 생성해 R2에 저장하며 provider, model, 생성 버전, 콘텐츠 해시를 객체 메타데이터와 D1 생성 로그에 기록합니다. 런타임 요청 중 유료 TTS를 호출하지 않습니다.

## 시각 자산

`apps/web/public/brand-hero.png`, `brand-mark.png`, `page-bg-bamboo.png`와 파생 아이콘은 프로젝트 소유자가 제공한 자산입니다. 원저작물의 재배포·상업 이용 권한 증빙은 운영 공개 범위를 확대하기 전에 별도로 보관해야 합니다. 권리 확인 전에는 이 파일을 제3자용 데이터셋이나 템플릿으로 재배포하지 않습니다.
