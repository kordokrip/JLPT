# JLPT · TOPIK 개인 학습 PWA

한국어 사용자의 JLPT 일본어와 일본어 사용자의 TOPIK 한국어를 위한 개인·가족 학습 앱. 오늘 / 학습 / 복습 / 기록 네 메뉴, 학습 지도, quick/daily, FSRS, 메모, 사진 프로필·설정·알림·학습 통계를 제공한다.

갱신: 2026-10-25. [현재 상태](docs/00_overview/CURRENT_STATE.md) · [문서 안내](docs/README.md) · [개발/모델 규칙](AGENTS.md) · [폴더 안내](docs/00_overview/PROJECT_INVENTORY.md).

문자 기초·세부 화면 반응형 개선은 [현재 후보 검사](docs/00_overview/DETAIL_UI_AUDIT_2026-10-25.md)를 참고한다. 코드 push와 운영 배포는 별개이며 아래 표는 마지막 완료 배포다.

## 마지막 완료 배포

| 항목 | 값 |
| --- | --- |
| D1 | nihongo-n3-prod-v2, `0000–0033`, 77표 |
| Worker | `69cffaa1-996d-42a7-9080-13c526203e86` |
| Pages | `https://92c6e58b.nihongo-n3.pages.dev`, `92c6e58b-f01f-47c6-b1e5-9df9762d3ab8` |
| canonical | https://nihongo-n3.pages.dev |
| Worker source | `78ee09a5ddec3254454fe14f174c03e5051f90d0` |
| Web source | `6ecc203ddce31fe373ed17527dafad25f615463e` |
| 콘텐츠 source | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| manifest | `content-v3-d102868e3d43b9b3c1a4` |

V7 440문항/220레슨 + 별도 v3 160문항 공개. 기존 canonical·N3 정적120·TOPIK practice v2 300 보존. TOPIK owner420. [수량/출처](docs/00_overview/CONTENT_AUDIT.md), [최신 UI 릴리스](docs/00_overview/UNIFIED_FRONTEND_DESIGN_2026-10-14.md).

## 구조·개발

React/Vite PWA → Hono/OpenAPI Worker → Drizzle/D1. TanStack Query·Zustand·Dexie로 조회/계정 격리/오프라인 대기 저장을 처리한다. [코드/DB/API 지도](PROJECT_CODEBASE_ANALYSIS.md).

```sh
CI=true pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev:web
```

검사는 [위험별 CI 기준](docs/00_overview/LOCAL_CICD_OPERATIONS.md)을 따른다. 문서 정리는 docs:catalog/docs:check와 상태 검사, 앱 최종 배포 후보는 verify:ci·필수 브라우저·Preview·운영 gate다. fresh는 disposable local DB 재현이며 원격 공개/가청 증거가 아니다.

음성은 Google 우선·동일 언어 설치 음성 fallback, ko-* / ja-*만 허용한다. R2 발음 경로 금지, legacy audio410. GitHub Actions는 비활성이고 로컬 gate/원장을 사용한다. 실제 푸시 수신·최신 가족 사용성의 사용자 유예 및 PWA 갱신 보류 등 남은 사항은 현재 상태에서만 관리한다.
