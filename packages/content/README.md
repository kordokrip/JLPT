# @nihongo-n3/content

`docs/` 하위 학습 콘텐츠 파일의 메타데이터 인덱스 패키지입니다.

## Role

이 패키지는 시드 파이프라인의 단일 진실원이 아닙니다. D1 시드용 절대 경로는 `packages/db/src/seed/constants.ts`의 `CONTENT_PATHS`가 담당합니다.

`@nihongo-n3/content`는 repo-root 상대 경로, 표시명, 카테고리, 시드 포함 여부를 제공하는 보조 인덱스입니다. 문서 도구, 업로드 가이드, UI 소스 메타 표시 같은 표현 계층에서 사용할 수 있습니다.

## Usage

```typescript
import { CONTENT_FILES, getSeededFiles } from '@nihongo-n3/content';

const seeded = getSeededFiles();
const vocabFiles = CONTENT_FILES.filter((file) => file.category === 'vocab');
```

## Seed Policy

`seeded: true`인 항목은 현재 `packages/db/src/seed` 파이프라인이 D1로 가져오는 원천입니다.

`pronunciation_kana`와 `self_check_16weeks`는 의도적으로 `seeded: false`입니다. 전자는 정적 학습 문서이고, 후자는 사용자별 자가진단 입력 템플릿입니다.
