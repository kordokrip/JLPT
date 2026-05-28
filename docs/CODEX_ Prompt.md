# nihongo-n3 운영 결선 리팩토링 — 단일 실행 프롬프트 v1.0

## 0. 역할 (System Prompt)

당신은 **nihongo-n3 모노레포의 릴리스 엔지니어**입니다. 이 워크스페이스는 새 분석 보고서(`docs/PROJECT_ANALYSIS_2026.md`, 2026-05-28 KST 기준)에 따라 **이미 기술 구현의 골격이 완성된 상태**입니다. 당신의 임무는 새 기능을 추가하는 것이 아니라, **문서·메타데이터·운영 절차의 정합성을 회복**하여 메이저 단(major-tier)에서 실제 운영 가능한 PWA로 만드는 것입니다.

**절대 금지 사항**:

1. 기능 추가 금지. 본 프롬프트가 명시하지 않은 새 라우트, 새 컴포넌트, 새 페이지를 만들지 마십시오. 단, **OpenAPI 명세 완성을 위한 라우트 명세화는 허용**됩니다(동작은 동일, 문서만 보강).
2. 데이터 모델 변경 금지. `packages/db/src/schema.ts` 변경 금지. 다만 **신규 컬럼이 아닌 신규 인덱스**는 운영 성능 개선 목적에 한해 허용됩니다.
3. 기존 사용자 경로 파괴 금지. 라우트 URL, IndexedDB 키, R2 키 네이밍 변경 금지.
4. 외부 유료 API 의존성 추가 금지. 본 워크스페이스는 이미 Cloudflare Workers AI를 사용하므로 OpenAI/Google TTS를 새로 도입하지 마십시오.
5. 새 패키지를 `packages/`에 추가하지 마십시오. 현재 4개(`db`, `shared`, `content`, `web`+`api`)를 유지합니다.

**작업 원칙**:

- 보고서의 **Mismatch Register 7개 항목**을 모두 해소해야 작업 완료입니다.
- 모든 변경은 `pnpm -r typecheck`, `pnpm -r build`, `pnpm -r test`를 통과해야 합니다.
- 변경 사항은 **한 번에 9개의 작은 커밋**으로 분리합니다(Task 1당 1 커밋).
- 보고서가 권고한 "최신 보고서 하나를 기준 문서로 지정"을 실제로 반영하여, 옛 보고서는 축소·아카이브하고 `PROJECT_ANALYSIS_2026.md`만 단일 진실원으로 남깁니다.

---

## 1. 사전 컨텍스트 — 신뢰 가능한 사실 (2026-05-28 검증)

당신이 가정 없이 사용해야 하는 사실들입니다.

**워크스페이스 구조** (보고서 §1-1, §2-1):
- pnpm 모노레포, 7개 GitHub workflow 존재.
- `pnpm -r typecheck` 통과 상태.
- `docs/` 하위 23개 md, 총 **15,348 lines**(보고서 §2-2; 15,364는 구식 수치).
- 로컬에서 `.git` 부재 → `seed-diff.ts`의 git 기반 검증 제한.

**FSRS 구조** (보고서 §1-2, §2-3):
- `apps/api/src/lib/fsrs.ts`, `apps/web/src/lib/fsrs-client.ts`는 **`@nihongo-n3/shared/fsrs`의 재수출 계층**일 뿐 구현체 아님.
- `apps/api/src/jobs/optimize-fsrs.ts`는 `FSRS_OPTIMIZER_URL` 미설정 시 전체 스킵.
- optimizer 응답 weight 검증이 `length >= 19`로 느슨함. **FSRS-6는 공식 21 weights**(ts-fsrs v6, npm `@squeakyrobot/fsrs` v1+ 문서, Anki 25.07+ 기본).

**OpenAPI 상태** (보고서 §4-3):
- `OpenAPIHono` + `/openapi.json` + `/api/docs`(Scalar UI) 구성됨.
- 일부 `*-oa.ts`는 **`createRoute()` 기반 진짜 명세**가 아니라 기존 라우트를 단순 `route()`로 마운트한 **빈 명세 래퍼**.
- `@hono/zod-openapi` 공식 패턴은 `app.openapi(createRoute({...}), handler)`이며, `app.route(path, sub)`만 사용한 라우트는 `/openapi.json`에 스키마가 비어 표시됨.

**시드 파이프라인** (보고서 §4-4):
- `CONTENT_PATHS`는 `docs/...` 경로 기준으로 이미 정정됨.
- `SOURCE_FILE_MAP`은 12개 소스만 다루며 `CONTENT_PATHS.selfCheck`는 의도적·비의도적 누락 여부 미확정.

**Figma Make 사실** (Figma Forum 공식 답변, post 41338/43287):
- Figma Make는 export 시 `package.json`을 포함하지 않는 것이 의도된 동작.
- 따라서 루트 `package.json`이 `@figma/my-make-file` 형태로 남아 있다면 이는 Figma Make 초기 산출물 위에 사람이 모노레포 구조를 덧붙인 흔적이며, **운영 단계에서는 모노레포 루트로 재정의해야 함**.

**FSRS-6 21 weights 검증** (`@squeakyrobot/fsrs` npm 문서):
- "Optional v6 Support: Accepts optimized 21-parameter sets for advanced users"
- 즉 v6 weights는 길이 **정확히 21**이며, 19는 v4.5/5 호환.

---

## 2. 알아야 할 플랫폼 현실

**`@hono/zod-openapi`의 라우트 명세화 패턴**:
```typescript
// ❌ 빈 명세 래퍼 (피해야 함)
const sub = new Hono();
sub.get('/vocab', handler);
mainApp.route('/api/v1', sub);
// → /openapi.json 의 paths에 /vocab 누락

// ✅ 진짜 명세
const sub = new OpenAPIHono();
const vocabListRoute = createRoute({
  method: 'get',
  path: '/vocab',
  tags: ['Vocab'],
  request: { query: z.object({...}) },
  responses: { 200: { content: { 'application/json': { schema: VocabListRes } }, description: 'OK' } },
});
sub.openapi(vocabListRoute, handler);
mainApp.route('/api/v1', sub);
```

**pnpm 모노레포 루트 package.json 표준** (pnpm 공식 + Adam Coster 가이드 + jlevy/tbd patterns):
- `"private": true` 필수
- `"name"`은 조직 prefix 사용 권장 (예: `"@nihongo-n3/monorepo-root"`)
- `"packageManager": "pnpm@<X.Y.Z>"` 명시
- 루트 `dependencies`는 최소화, 모두 `devDependencies`로
- 도구 의존성(`prettier`, `husky`, `lint-staged`)만 루트 보유

**Drizzle + D1 원격 검증 패턴** (Jezweb skill, NM RLD checklist 패턴):
```bash
# 로컬
wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'"
# 원격
wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

---

## 3. 작업 목표 (9개 Task, 순차 진행)

각 Task는 ▶ **Why**, ▶ **What**, ▶ **How**, ▶ **Verify**, ▶ **Commit** 5단계로 진행합니다. 모든 Task가 끝나면 §4의 통합 검증을 실행하십시오.

### Task 1 — 루트 `package.json` 정체성 재정의

▶ **Why**: 보고서 Mismatch §5 7번 항목. 루트 패키지가 Figma Make 잔재(`@figma/my-make-file`)인 상태로는 운영 시 `pnpm install` 의도가 불분명하고, CI가 의존성 트리를 잘못 해석할 수 있습니다.

▶ **What**: 루트 `package.json`을 모노레포 루트 전용으로 재작성합니다. Figma Make export 산출물이 루트에 남아 있다면 `apps/figma-export/`로 이동하거나 삭제합니다.

▶ **How**:

1. 먼저 현재 루트 `package.json`을 백업: `cp package.json package.json.figma-backup`.
2. 루트 `package.json`을 다음 형태로 재작성:
   ```json
   {
     "name": "nihongo-n3-monorepo",
     "version": "1.0.0",
     "private": true,
     "description": "JLPT N5-N3 학습 PWA 모노레포 (Cloudflare Workers + React PWA)",
     "packageManager": "pnpm@9.15.0",
     "engines": {
       "node": ">=20.10.0",
       "pnpm": ">=9.0.0"
     },
     "scripts": {
       "typecheck": "pnpm -r typecheck",
       "build": "pnpm -r build",
       "test": "pnpm -r test",
       "lint": "pnpm -r lint",
       "verify": "pnpm typecheck && pnpm test && pnpm build",
       "dev:api": "pnpm -F @nihongo-n3/api dev",
       "dev:web": "pnpm -F @nihongo-n3/web dev",
       "db:seed": "pnpm -F @nihongo-n3/db seed",
       "db:verify": "pnpm -F @nihongo-n3/db verify"
     },
     "devDependencies": {
       "prettier": "^3.3.0",
       "typescript": "^5.6.0"
     }
   }
   ```
3. Figma Make 잔재(`@figma/*` 의존성, `App.tsx`가 루트에 있다면, `index.html`, `vite.config.ts` 등)가 루트에 있는지 확인:
   ```bash
   ls -la / 2>/dev/null  # 의미 없음, 실제는:
   find . -maxdepth 1 -name "App.tsx" -o -name "vite.config.ts" -o -name "index.html"
   ```
   발견되면 `apps/figma-export-archive/`로 이동하거나 안전하게 삭제합니다(앱 코드는 `apps/web/`에 이미 존재함을 보고서 §4-2가 확인).
4. `pnpm install` 실행하여 lockfile 정합성 확인.

▶ **Verify**:
```bash
cat package.json | jq '.name, .private'
# → "nihongo-n3-monorepo", true
pnpm install
pnpm -r typecheck     # 통과 유지
```

▶ **Commit**: `chore(root): redefine root package.json as monorepo root, archive Figma Make residue`

---

### Task 2 — `packages/content` 메타데이터 정규화

▶ **Why**: 보고서 §4-5, Mismatch §5 4번. 콘텐츠 메타 패키지가 "리포지토리 루트에 위치"를 가정하고 예전 파일명(`03_jlpt_n5_kanji.md` 등)을 참조 중. 시드 파이프라인의 단일 진실원이 될지 보조 인덱스로 남을지 결정.

▶ **What**: `packages/content/src/index.ts`를 현재 `docs/` 구조 기준으로 재작성하고, 보고서가 권고한 대로 **이 패키지의 역할을 "문서 인덱스용 보조 자료"로 명시**합니다. 시드 파이프라인은 이미 `packages/db/src/seed/constants.ts`의 `CONTENT_PATHS`를 단일 진실원으로 사용 중이므로, 두 곳을 통합하지 말고 역할을 분리합니다.

▶ **How**:

1. `packages/content/src/index.ts`를 다음 패턴으로 재작성:
   ```typescript
   /**
    * @nihongo-n3/content
    *
    * 역할: docs/ 하위 학습 콘텐츠 파일의 메타데이터 인덱스.
    *       시드 파이프라인의 단일 진실원이 아니며, 그 역할은
    *       packages/db/src/seed/constants.ts 의 CONTENT_PATHS 가 담당한다.
    *       본 패키지는 문서 도구, 외부 NotebookLM 업로드 가이드, UI의
    *       소스 메타 표시 등에서 사용한다.
    *
    * 단일 진실원 (시드용 절대 경로): packages/db/src/seed/constants.ts
    * 본 파일은 그것을 참조하는 표현 계층 (path = relative from repo root).
    */

   export interface ContentFileMeta {
     /** 시드 소스 코드 (예: 'n5_vocab') */
     code: string;
     /** JLPT 레벨 또는 'supplement' */
     level: 'N5' | 'N4' | 'N3' | 'N2' | 'supplement';
     /** 카테고리 (kanji|vocab|grammar|sentences|pronunciation|sysprog|selfcheck) */
     category: string;
     /** 리포지토리 루트 기준 상대 경로 */
     path: string;
     /** 표시용 한국어 이름 */
     displayName: string;
     /** 시드 파이프라인에 포함되는지 여부 */
     seeded: boolean;
   }

   export const CONTENT_FILES: readonly ContentFileMeta[] = [
     { code: 'n5_kanji', level: 'N5', category: 'kanji',
       path: 'docs/01_n5/03_kanji.md', displayName: 'N5 한자', seeded: true },
     { code: 'n5_vocab', level: 'N5', category: 'vocab',
       path: 'docs/01_n5/04_vocab.md', displayName: 'N5 어휘', seeded: true },
     { code: 'n5_grammar', level: 'N5', category: 'grammar',
       path: 'docs/01_n5/05_grammar.md', displayName: 'N5 문법', seeded: true },
     { code: 'n4_kanji', level: 'N4', category: 'kanji',
       path: 'docs/02_n4/06_kanji.md', displayName: 'N4 한자', seeded: true },
     { code: 'n4_vocab', level: 'N4', category: 'vocab',
       path: 'docs/02_n4/07_vocab.md', displayName: 'N4 어휘', seeded: true },
     { code: 'n4_grammar', level: 'N4', category: 'grammar',
       path: 'docs/02_n4/08_grammar.md', displayName: 'N4 문법', seeded: true },
     { code: 'n3_kanji', level: 'N3', category: 'kanji',
       path: 'docs/03_n3/09_kanji.md', displayName: 'N3 한자', seeded: true },
     { code: 'n3_vocab_part1', level: 'N3', category: 'vocab',
       path: 'docs/03_n3/10A_vocab_part1.md', displayName: 'N3 어휘 1', seeded: true },
     { code: 'n3_vocab_part2', level: 'N3', category: 'vocab',
       path: 'docs/03_n3/10B_vocab_part2.md', displayName: 'N3 어휘 2', seeded: true },
     { code: 'n3_grammar', level: 'N3', category: 'grammar',
       path: 'docs/03_n3/11_grammar.md', displayName: 'N3 문법', seeded: true },
     { code: 'example_sentences', level: 'supplement', category: 'sentences',
       path: 'docs/04_supplement/12_example_sentences.md', displayName: '예문', seeded: true },
     { code: 'sysprog_vocab_500', level: 'supplement', category: 'sysprog',
       path: 'docs/04_supplement/A_sysprog_vocab_500.md', displayName: '직무/시스템 어휘', seeded: true },
     { code: 'pronunciation_kana', level: 'supplement', category: 'pronunciation',
       path: 'docs/04_supplement/02_pronunciation_kana.md', displayName: '발음/가나', seeded: false },
     { code: 'self_check_16weeks', level: 'supplement', category: 'selfcheck',
       path: 'docs/04_supplement/C_self_check_16weeks.md', displayName: '16주 자가진단', seeded: false },
   ] as const;

   export function findContentFile(code: string): ContentFileMeta | undefined {
     return CONTENT_FILES.find(f => f.code === code);
   }

   export function getSeededFiles(): readonly ContentFileMeta[] {
     return CONTENT_FILES.filter(f => f.seeded);
   }
   ```
2. `packages/content/README.md`를 새로 작성하여 역할 명시(보조 인덱스, 단일 진실원 아님).
3. 만약 기존 export 명칭(`SOURCE_FILES`, `MD_FILES` 등)이 다른 곳에서 사용 중이면 deprecation 별칭을 임시로 유지:
   ```typescript
   /** @deprecated 2026-05-28: CONTENT_FILES 사용 권장 */
   export const SOURCE_FILES = CONTENT_FILES;
   ```

▶ **Verify**:
```bash
pnpm -F @nihongo-n3/content typecheck
grep -r "@nihongo-n3/content" apps packages | head -20  # 사용처 확인
# 모든 사용처가 정상 동작하는지 typecheck로 검증
pnpm -r typecheck
```

▶ **Commit**: `refactor(content): align metadata with docs/ structure, clarify role as docs index`

---

### Task 3 — `seed-diff.ts`의 `selfCheck` 정책 명시

▶ **Why**: 보고서 §4-4, Mismatch §5 5번. `CONTENT_PATHS.selfCheck`는 상수에는 있으나 `SOURCE_FILE_MAP`에는 없음. 의도 확인 후 명시 필요.

▶ **What**: 자가진단 문서(16주 체크리스트)는 **콘텐츠가 아니라 사용자별 입력 폼의 템플릿**이므로 DB 시드 대상이 아닙니다. 코드 주석으로 이를 명시하고, `pronunciation_kana`도 동일 분류로 처리합니다.

▶ **How**:

1. `packages/db/src/seed/seed-diff.ts`에 다음 주석 블록 추가(`SOURCE_FILE_MAP` 정의 직전):
   ```typescript
   /**
    * 시드 대상 매핑 (12개 콘텐츠 소스).
    *
    * 의도적으로 제외되는 docs 파일:
    * - docs/04_supplement/02_pronunciation_kana.md: UI 정적 콘텐츠로
    *   apps/web/src/pages/PronunciationGuide.tsx 가 직접 import 함.
    * - docs/04_supplement/C_self_check_16weeks.md: 사용자별 자가진단 입력
    *   폼의 템플릿이며 self_check_entries 테이블에 사용자 데이터로 저장됨.
    *
    * 위 두 파일은 packages/content의 CONTENT_FILES 에서 seeded: false 로
    * 명시되어 있으며, 본 시드 파이프라인의 책임이 아니다.
    */
   ```
2. `pronunciation` 카테고리도 향후 시드가 필요하다면 별도 PR로 다루도록 TODO 주석을 남깁니다.
3. `packages/db/src/seed/constants.ts`의 `CONTENT_PATHS`에 같은 주석을 동기화합니다.

▶ **Verify**:
```bash
pnpm -F @nihongo-n3/db typecheck
pnpm -F @nihongo-n3/db test --run  # 시드 단위 테스트가 있다면
```

▶ **Commit**: `docs(db): clarify seed exclusion policy for selfCheck and pronunciation`

---

### Task 4 — FSRS optimizer 운영 결정 + FSRS-6 weight 검증 강화

▶ **Why**: 보고서 §1-2, §2-3, P1 액션. 현재 `optimize-fsrs.ts`는 `FSRS_OPTIMIZER_URL` 미설정 시 스킵하고 weight 검증이 느슨함. 운영 단계에서는 **명시적 결정**이 필요.

▶ **What**: 본 워크스페이스에는 외부 optimizer 서비스를 별도 배포할 인프라가 없으므로, **현 단계 정책은 "기본 FSRS-6 스케줄러만 운영, 개인화 비활성"**으로 명시합니다. 추후 optimizer 도입을 위한 자리만 남기되, weight 검증은 FSRS-6 표준인 21로 강화합니다(19 호환 허용).

▶ **How**:

1. `apps/api/src/jobs/optimize-fsrs.ts` 상단에 정책 주석 추가:
   ```typescript
   /**
    * FSRS Personalization Policy (v1.0, 2026-05-28)
    *
    * 현재 정책: 개인화 최적화 비활성.
    *   - FSRS_OPTIMIZER_URL 미설정 → 스킵 (정상)
    *   - 모든 사용자가 ts-fsrs 기본 weights 사용
    *
    * 활성 조건 (모두 충족 시 자동 활성):
    *   1. FSRS_OPTIMIZER_URL, FSRS_OPTIMIZER_TOKEN 시크릿 설정
    *   2. optimizer 서비스가 FSRS-6 (21 weights) 출력 보장
    *   3. 사용자당 최소 1,000 reviews 누적 (참고: Anki 공식 가이드)
    *
    * 운영 검증: docs/00_overview/OPS_RUNBOOK.md (Task 8에서 생성)
    */
   ```

2. weight 검증 로직 강화:
   ```typescript
   // 기존: if (weights.length >= 19) { ... }
   // 신규:
   const FSRS_V6_WEIGHT_COUNT = 21;
   const FSRS_V5_WEIGHT_COUNT = 19;

   function isValidWeights(weights: unknown): weights is number[] {
     if (!Array.isArray(weights)) return false;
     if (!weights.every(w => typeof w === 'number' && Number.isFinite(w))) return false;
     // FSRS-6 (21) 우선, FSRS-5 (19) 호환
     return weights.length === FSRS_V6_WEIGHT_COUNT
         || weights.length === FSRS_V5_WEIGHT_COUNT;
   }

   // 사용 지점
   if (!isValidWeights(response.weights)) {
     console.warn(
       `[fsrs-optimizer] invalid weights length=${response.weights?.length ?? 'undefined'}; ` +
       `expected 19 (v5) or 21 (v6). user=${userId} — skipping update`
     );
     continue;
   }

   // 21 weights를 ts-fsrs 호환 형태로 매핑
   const weightsArray = response.weights.length === FSRS_V6_WEIGHT_COUNT
     ? response.weights
     : [...response.weights, 0, 0]; // v5 → v6 패딩 (기본값)
   ```

3. `apps/api/wrangler.toml`에 환경변수 주석 추가:
   ```toml
   # [vars]
   # FSRS_OPTIMIZER_URL = ""   # 비워두면 개인화 비활성 (정상 운영 모드)
   ```

4. `packages/shared/src/fsrs.ts`에 21 weights 표준화 명시:
   ```typescript
   /**
    * FSRS-6 weights (21 parameters).
    * 참고: open-spaced-repetition/ts-fsrs v6, Anki 25.07+ 기본값.
    */
   export const FSRS_V6_DEFAULT_WEIGHTS: readonly number[] = [
     /* ts-fsrs 가 export 하는 기본값을 그대로 재수출 */
   ] as const;
   ```

▶ **Verify**:
```bash
pnpm -F @nihongo-n3/api typecheck
pnpm -F @nihongo-n3/api test --run
# 단위 테스트: weights.length === 19 → padded to 21, length === 21 → passthrough,
#            length === 20 또는 22 → reject
```

▶ **Commit**: `feat(fsrs): document personalization policy, enforce 21-weight FSRS-6 with v5 fallback`

---

### Task 5 — OpenAPI 명세 완성도 감사 + wrapper route 명세화

▶ **Why**: 보고서 §4-3. `*-oa.ts` 중 일부가 명세 없는 단순 래퍼 상태. `/openapi.json`이 실제 API를 정확히 반영하지 못하면 클라이언트의 `typedApi` 타입이 불완전해지고 외부 통합도 막힙니다.

▶ **What**: `apps/api/src/routes/` 전체를 감사하여, 각 라우트가 `OpenAPIHono.openapi(createRoute(...), handler)` 패턴인지 확인하고, 단순 `app.get/post`만 사용한 라우트를 명세화합니다.

▶ **How**:

1. 감사 스크립트 생성 — `apps/api/scripts/audit-openapi.ts`:
   ```typescript
   import { readdirSync, readFileSync } from 'node:fs';
   import { join } from 'node:path';

   const ROUTES_DIR = join(__dirname, '..', 'src', 'routes');
   const files = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));

   const audit: Array<{ file: string; specced: number; unspecced: number; details: string[] }> = [];

   for (const file of files) {
     const src = readFileSync(join(ROUTES_DIR, file), 'utf8');
     const speccedMatches = (src.match(/\.openapi\s*\(\s*createRoute/g) ?? []).length;
     // 단순 메서드 호출 카운트
     const plainMatches = (src.match(/\.(get|post|put|delete|patch)\s*\(\s*['"`]/g) ?? []).length;
     const details: string[] = [];
     if (plainMatches > 0 && speccedMatches === 0) {
       details.push('⚠ 모든 라우트가 명세 없이 정의됨');
     } else if (plainMatches > 0) {
       details.push(`⚠ ${plainMatches}개 라우트가 명세 없이 정의됨 (${speccedMatches}개는 명세화됨)`);
     }
     audit.push({ file, specced: speccedMatches, unspecced: plainMatches, details });
   }

   console.table(audit.map(a => ({
     file: a.file,
     '명세화 라우트': a.specced,
     '미명세 라우트': a.unspecced,
     상태: a.unspecced === 0 ? '✅' : '⚠️',
   })));

   const totalUnspecced = audit.reduce((s, a) => s + a.unspecced, 0);
   if (totalUnspecced > 0) {
     console.log(`\n총 ${totalUnspecced}개의 미명세 라우트가 발견되었습니다.`);
     process.exit(1);
   }
   ```
2. `apps/api/package.json`에 `"audit:openapi": "tsx scripts/audit-openapi.ts"` 추가.
3. 실행: `pnpm -F @nihongo-n3/api audit:openapi`. 출력된 미명세 라우트를 **`createRoute()` 패턴으로 변환**합니다.
4. 변환 시 보존 원칙:
   - URL 경로 변경 금지
   - 응답 형태 변경 금지(스키마는 기존 응답을 그대로 표현)
   - 핸들러 로직 변경 금지
5. 변환 후 `/openapi.json`을 확인하여 경로 수 ≥ 33(보고서 기준)을 유지:
   ```bash
   pnpm -F @nihongo-n3/api dev --local &
   sleep 3
   curl -s http://localhost:8787/openapi.json | jq '[.paths | to_entries[] | .key] | length'
   ```
6. 변환 완료 후 `apps/web/`에서 타입 재생성:
   ```bash
   pnpm -F @nihongo-n3/web gen:api-types
   ```
7. 만약 타입 재생성 후 컴파일 오류가 발생하면, 그것은 **이전에 타입이 비어있어 가려졌던 진짜 불일치**이므로 수정합니다.

▶ **Verify**:
```bash
pnpm -F @nihongo-n3/api audit:openapi   # exit 0
pnpm -r typecheck                        # 통과
curl -s http://localhost:8787/openapi.json | jq '.info.title, (.paths | length)'
```

▶ **Commit**: `feat(api): formalize OpenAPI specs for all wrapper routes (audit-driven)`

---

### Task 6 — `seed-diff.ts` git-fallback 경로 추가

▶ **Why**: 보고서 §2-1, Mismatch §5 6번. 로컬에서 `.git` 부재 시 git diff 기반 검증이 실패. CI(GitHub Actions)에서는 정상이지만 **로컬 개발자가 막힘**.

▶ **What**: `seed-diff.ts`에 git 미감지 시 fallback 동작을 추가합니다. fallback은 "전체 시드"가 아니라 **"파일 mtime 기반 변경 감지"**로 안전하게 처리합니다.

▶ **How**:

1. `packages/db/src/seed/seed-diff.ts`에 다음 함수 추가:
   ```typescript
   import { execSync } from 'node:child_process';
   import { statSync, existsSync } from 'node:fs';

   function isGitAvailable(): boolean {
     try {
       execSync('git rev-parse --git-dir', { stdio: 'ignore' });
       return true;
     } catch {
       return false;
     }
   }

   function getChangedFilesViaGit(since: string): string[] {
     const out = execSync(`git diff --name-only ${since}`, { encoding: 'utf8' });
     return out.split('\n').filter(Boolean);
   }

   function getChangedFilesViaMtime(thresholdMs: number): string[] {
     const now = Date.now();
     const changed: string[] = [];
     for (const [code, path] of Object.entries(SOURCE_FILE_MAP)) {
       if (!existsSync(path)) continue;
       const mtime = statSync(path).mtimeMs;
       if (now - mtime <= thresholdMs) changed.push(path);
     }
     return changed;
   }

   export function detectChangedSources(opts?: { since?: string; mtimeWindowMs?: number }): string[] {
     if (isGitAvailable()) {
       const since = opts?.since ?? 'HEAD~1';
       console.log(`[seed-diff] git mode (since=${since})`);
       return getChangedFilesViaGit(since);
     }
     const window = opts?.mtimeWindowMs ?? 24 * 60 * 60 * 1000; // 24h
     console.log(`[seed-diff] git unavailable, falling back to mtime mode (window=${window}ms)`);
     return getChangedFilesViaMtime(window);
   }
   ```
2. 기존 코드에서 `git diff` 직접 호출하는 부분을 `detectChangedSources()`로 교체.
3. CI에서는 명시적으로 git 모드 강제: `.github/workflows/content-update.yml`의 시드 단계에 `--since=origin/main` 옵션 명시.

▶ **Verify**:
```bash
# 로컬 (.git 없는 환경)
pnpm -F @nihongo-n3/db seed:diff --dry-run
# → "[seed-diff] git unavailable, falling back to mtime mode" 로그

# .git 있는 환경
pnpm -F @nihongo-n3/db seed:diff --since=HEAD~1 --dry-run
# → "[seed-diff] git mode" 로그
```

▶ **Commit**: `feat(db): add mtime fallback to seed-diff when git is unavailable`

---

### Task 7 — 운영 문서 통합: 옛 보고서 아카이브 + 단일 진실원 지정

▶ **Why**: 보고서 P1, Mismatch §5 1·2·3번. 옛 문서들(`B_ops_guide.md`, `ROADMAP.md`, `project-status-report.md`)이 서로 다른 기준일과 경로 가정으로 충돌. **`PROJECT_ANALYSIS_2026.md`를 단일 진실원**으로 지정.

▶ **What**: 옛 보고서들을 `docs/00_overview/archive/`로 이동하고, 살아남는 문서는 다음 3개로 한정합니다.

1. `docs/PROJECT_ANALYSIS_2026.md` — **현재 기준 A-Z 보고서**(이미 존재)
2. `docs/ROADMAP.md` — **앞을 향한 계획**만 (과거 회고 제거)
3. `docs/00_overview/OPS_RUNBOOK.md` — **운영 체크리스트** (신규)

▶ **How**:

1. `docs/00_overview/archive/` 디렉터리 생성.
2. 다음 파일들을 이동:
   - `docs/00_overview/B_ops_guide.md` → `docs/00_overview/archive/B_ops_guide_2026-01.md`
   - `docs/00_overview/project-status-report.md` → `docs/00_overview/archive/project-status-report_2026-02.md`
   - `docs/00_overview/MASTER_REPORT_v3.md` (있다면) → `docs/00_overview/archive/MASTER_REPORT_v3_2026-04.md`
3. 각 아카이브 파일 최상단에 다음 헤더 삽입:
   ```markdown
   > ⚠️ **아카이브 문서** (2026-05-28 기준 정합성 보장 없음)
   >
   > 이 문서는 역사적 기록을 위해 보존되었으며, 현재 워크스페이스 상태를
   > 반영하지 않습니다. 최신 기준은 다음을 참조하십시오:
   >
   > - 진척도/A-Z 분석: `docs/PROJECT_ANALYSIS_2026.md`
   > - 앞으로의 계획: `docs/ROADMAP.md`
   > - 운영 절차: `docs/00_overview/OPS_RUNBOOK.md`
   ```
4. `docs/ROADMAP.md`를 정정:
   - N2 확장 경로 예시를 `docs/05_n2/13_kanji.md`, `docs/05_n2/14_vocab.md`, `docs/05_n2/15_grammar.md`로 변경(루트 가정 제거).
   - 이미 완료된 Phase B 항목은 "완료" 표시 유지하고 미완 항목만 앞을 보게 정리.
5. `docs/00_overview/OPS_RUNBOOK.md` 신규 생성:
   ```markdown
   # nihongo-n3 운영 런북

   기준일: 2026-05-28 KST

   ## 1. 단일 진실원

   | 영역 | 진실원 파일 |
   |---|---|
   | 워크스페이스 현황 | `docs/PROJECT_ANALYSIS_2026.md` |
   | 앞으로의 계획 | `docs/ROADMAP.md` |
   | 콘텐츠 파일 시드 매핑 | `packages/db/src/seed/constants.ts` (CONTENT_PATHS) |
   | 콘텐츠 메타데이터 (UI/문서용) | `packages/content/src/index.ts` (CONTENT_FILES) |
   | API 명세 | `apps/api/openapi.json` (자동 생성) |
   | DB 스키마 | `packages/db/src/schema.ts` |

   ## 2. 정기 검증 명령

   주 1회 수동 실행, CI에서 매 PR 자동 실행:

   ```bash
   pnpm -r typecheck
   pnpm -r test
   pnpm -r build
   pnpm -F @nihongo-n3/api audit:openapi
   pnpm -F @nihongo-n3/db verify
   ```

   ## 3. 배포 절차

   ### 3-1. API 배포
   ```bash
   pnpm -F @nihongo-n3/api deploy
   wrangler tail nihongo-n3-api    # 30초 관찰
   curl -s https://api.nihongo-n3.../healthz | jq
   ```

   ### 3-2. Web 배포
   ```bash
   pnpm -F @nihongo-n3/web build
   pnpm -F @nihongo-n3/web deploy
   # Lighthouse PWA 점수 ≥ 90 확인
   ```

   ### 3-3. DB 마이그레이션
   ```bash
   wrangler d1 migrations apply DB --local
   wrangler d1 migrations apply DB --remote
   ```

   ## 4. FSRS 개인화 활성화 절차

   현재 정책: 비활성 (Task 4 주석 참조).

   활성화 시:
   1. optimizer 서비스 배포 (FSRS-6 21 weights 출력 보장)
   2. `wrangler secret put FSRS_OPTIMIZER_URL`
   3. `wrangler secret put FSRS_OPTIMIZER_TOKEN`
   4. cron 트리거 확인: `wrangler tail | grep optimize-fsrs`

   ## 5. 사고 대응

   ### D1 데이터 손상 의심
   1. `backup-d1.yml` 워크플로의 최근 백업 확인 (R2 ASSETS/backups/)
   2. `wrangler d1 export DB --output current.sql` 현재 상태 보존
   3. 복원 결정 후 `wrangler d1 execute DB --remote --file backup.sql`

   ### Push 알림 미발송
   1. VAPID 키 유효성 확인
   2. `notifications.ts` 라우트 로그 확인 (`wrangler tail`)
   3. 사용자 `push_subscriptions` 테이블 row 존재 확인
   ```

▶ **Verify**:
```bash
ls docs/00_overview/archive/   # 이동된 파일 3개 이상
grep -l "루트" docs/ROADMAP.md docs/PROJECT_ANALYSIS_2026.md docs/00_overview/OPS_RUNBOOK.md
# → ROADMAP/OPS_RUNBOOK은 루트 가정 표현 0개여야 함 (PROJECT_ANALYSIS_2026은 "루트 package.json" 정상 언급 가능)
```

▶ **Commit**: `docs: archive outdated reports, establish PROJECT_ANALYSIS_2026 as single source of truth`

---

### Task 8 — Workflow 정합성: `content-update.yml` + 신규 audit 통합

▶ **Why**: 보고서 §4-6 + Task 5/6의 산출물(`audit:openapi`, `seed:diff` git fallback)을 CI에 연결.

▶ **What**: 기존 7개 워크플로 중 `content-update.yml`과 `e2e.yml`을 점검하고, 신규 `audit:openapi` 스텝을 `e2e.yml` 또는 별도 `quality.yml`에 추가합니다.

▶ **How**:

1. `.github/workflows/content-update.yml` 점검:
   - `paths`에 `docs/**/*.md`, `packages/db/drizzle/**` 포함되어 있는지 확인(보고서 §1-2가 통과 명시).
   - 시드 단계에 `--since=${{ github.event.before }}` 명시.
2. `.github/workflows/quality.yml` 신규 생성:
   ```yaml
   name: Quality Gate
   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]

   jobs:
     audit:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with: { version: 9 }
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: 'pnpm' }
         - run: pnpm install --frozen-lockfile
         - name: Typecheck
           run: pnpm -r typecheck
         - name: OpenAPI spec audit
           run: pnpm -F @nihongo-n3/api audit:openapi
         - name: Unit tests
           run: pnpm -r test --run
         - name: Build
           run: pnpm -r build
         - name: Content metadata consistency
           run: |
             # CONTENT_FILES의 모든 path가 실제 존재하는지 검증
             node -e "
               const { CONTENT_FILES } = require('./packages/content/dist/index.js');
               const fs = require('node:fs');
               const missing = CONTENT_FILES.filter(f => !fs.existsSync(f.path));
               if (missing.length) {
                 console.error('Missing files:', missing.map(m => m.path));
                 process.exit(1);
               }
               console.log('All', CONTENT_FILES.length, 'content files exist.');
             "
   ```
3. 기존 `.github/workflows/audit.yml`과 역할 중복 시 통합 또는 명확히 분리(이름: `audit.yml`은 보안, `quality.yml`은 명세/타입/메타데이터).

▶ **Verify**:
```bash
# 로컬 시뮬레이션
act -j audit -W .github/workflows/quality.yml  # nektos/act 필요
# 또는 PR 생성 후 실제 Actions 결과 확인
```

▶ **Commit**: `ci: add quality gate workflow (openapi audit, content metadata, typecheck, test, build)`

---

### Task 9 — 사용자 경로 통합 점검: i18n 누락 + Quiz/Reading 운영 검증

▶ **Why**: 보고서 §3 I/U 항목 ("부분완료"). 운영 단계에서 "한국어 미번역 영문 잔재"가 가장 흔한 사용자 컴플레인 원인.

▶ **What**: `apps/web/src/` 전반의 하드코딩 한/영 문자열을 스캔하고, **운영 영향 큰 화면 5개**(Home, Review, Quiz, Reading, Settings)의 i18n 적용을 확인합니다.

▶ **How**:

1. 스캔 스크립트 — `apps/web/scripts/scan-hardcoded-strings.ts`:
   ```typescript
   import { readdirSync, readFileSync, statSync } from 'node:fs';
   import { join, extname } from 'node:path';

   const SCAN_DIRS = ['src/pages', 'src/components'];
   const EXTS = ['.tsx', '.ts'];

   // i18n 키가 아닌 직접 JSX 텍스트 노드를 찾는 패턴 (휴리스틱)
   const JSX_TEXT_KOREAN = />\s*([가-힣]{2,}[^<{]{0,40})\s*</g;
   const JSX_TEXT_ENGLISH = />\s*([A-Z][a-z]{3,}[^<{]{0,40})\s*</g;

   const findings: Array<{ file: string; line: number; text: string; lang: 'ko'|'en' }> = [];

   function walk(dir: string) {
     for (const entry of readdirSync(dir)) {
       const full = join(dir, entry);
       const st = statSync(full);
       if (st.isDirectory()) walk(full);
       else if (EXTS.includes(extname(entry))) scan(full);
     }
   }

   function scan(file: string) {
     const src = readFileSync(file, 'utf8');
     const lines = src.split('\n');
     lines.forEach((line, idx) => {
       // i18n hook 사용 라인은 스킵
       if (line.includes('t(') || line.includes('useTranslation')) return;
       // aria-label, alt 등은 별도 처리
       let m;
       while ((m = JSX_TEXT_KOREAN.exec(line)) !== null) {
         findings.push({ file, line: idx + 1, text: m[1].trim(), lang: 'ko' });
       }
     });
   }

   for (const d of SCAN_DIRS) walk(join('apps/web', d));

   console.log(`총 ${findings.length}개 하드코딩 의심 문자열 발견`);
   findings.slice(0, 50).forEach(f => {
     console.log(`  ${f.file}:${f.line} [${f.lang}] "${f.text}"`);
   });
   ```
2. `apps/web/package.json`에 `"scan:i18n": "tsx scripts/scan-hardcoded-strings.ts"` 추가.
3. 실행 결과 중 **버튼 라벨·페이지 제목·에러 메시지**만 우선 i18n으로 이전(나머지는 후속 PR).
4. `apps/web/src/i18n/ko.json`에 누락 키 추가.
5. 단, **콘텐츠 자체(JLPT 학습 데이터)는 i18n 대상 아님**. 학습 데이터의 일본어/한국어 표시는 그대로 둡니다.

▶ **Verify**:
```bash
pnpm -F @nihongo-n3/web scan:i18n
# Before/After 개수 비교 (예: 120 → 35)
pnpm -F @nihongo-n3/web build
# 빌드 사이즈 변화 ≤ 5KB (i18n 키 추가는 작음)
```

▶ **Commit**: `chore(web): scan hardcoded strings, migrate critical UX labels to i18n`

---

## 4. 통합 검증 (9개 Task 완료 후)

다음 명령을 순서대로 실행하여 **모두 통과**해야 운영 결선 완료:

```bash
# 1. 정합성
pnpm -r typecheck                          # 0 오류
pnpm -F @nihongo-n3/api audit:openapi      # exit 0, 모든 라우트 명세화
pnpm -F @nihongo-n3/web scan:i18n          # 하드코딩 < 50개

# 2. 빌드
pnpm -r build                              # 모두 성공

# 3. 테스트
pnpm -r test                               # 전체 통과

# 4. 콘텐츠 메타 일관성
node -e "
  import('./packages/content/dist/index.js').then(({CONTENT_FILES}) => {
    const fs = require('node:fs');
    const missing = CONTENT_FILES.filter(f => !fs.existsSync(f.path));
    if (missing.length) { console.error('Missing:', missing); process.exit(1); }
    console.log('OK:', CONTENT_FILES.length, 'files');
  });
"

# 5. OpenAPI 경로 수
pnpm -F @nihongo-n3/api dev --local &
PID=$!; sleep 4
PATHS=$(curl -s http://localhost:8787/openapi.json | jq '.paths | length')
echo "OpenAPI paths: $PATHS"
[ "$PATHS" -ge 33 ] || echo "⚠ 경로 수 부족"
kill $PID

# 6. 문서 단일 진실원 확인
ls docs/PROJECT_ANALYSIS_2026.md docs/ROADMAP.md docs/00_overview/OPS_RUNBOOK.md
ls docs/00_overview/archive/ | wc -l   # ≥ 2

# 7. Wrangler 시크릿 정책 확인
grep -c "FSRS_OPTIMIZER_URL" apps/api/wrangler.toml apps/api/src/jobs/optimize-fsrs.ts
# 최소 2 (정책 주석 + wrangler 주석)

# 8. 라인 카운트 일관성 (보고서 §2-2)
find docs -type f -name '*.md' -print0 | xargs -0 wc -l | tail -1
# 약 15,348 ± 100 줄 (Task 7에서 OPS_RUNBOOK 추가로 다소 증가 정상)
```

---

## 5. 인계 사항 (작업 완료 후)

본 프롬프트가 완료되면 다음 상태가 됩니다.

**해소된 Mismatch (보고서 §5의 7개 항목)**:
1. ✅ `B_ops_guide.md` → archive로 이동 (Task 7)
2. ✅ `ROADMAP.md`의 N2 경로 정정 (Task 7)
3. ✅ `project-status-report.md` → archive (Task 7)
4. ✅ `packages/content/src/index.ts` 정규화 (Task 2)
5. ✅ `seed-diff.ts`의 selfCheck 정책 명시 (Task 3)
6. ✅ `.git` 부재 fallback (Task 6)
7. ✅ 루트 `package.json` 정체성 (Task 1)

**해소된 P0/P1/P2 액션 (보고서 §6)**:
- P0 문서 경로 정규화 — Task 7
- P0 `packages/content` 메타데이터 — Task 2
- P1 FSRS optimizer 운영 결정 — Task 4
- P1 기준 보고서 체계 — Task 7
- P2 검증 자동화 — Task 5, 6, 8

**신규 운영 자산**:
- `docs/00_overview/OPS_RUNBOOK.md` — 단일 운영 절차서
- `apps/api/scripts/audit-openapi.ts` — OpenAPI 명세 감사
- `apps/web/scripts/scan-hardcoded-strings.ts` — i18n 누락 스캔
- `.github/workflows/quality.yml` — 명세/메타/타입/빌드 게이트
- `packages/db/src/seed/seed-diff.ts`의 git fallback

**다음 단계 권고 (본 프롬프트 범위 외)**:
- N2 콘텐츠 추가 (`docs/05_n2/13~15.md`) — 별도 PR
- TTS 사전 생성 캠페인 (`MeloTTS jp` 기반, 비용 ≈ $0.04 for N3 전량) — 별도 PR
- FSRS optimizer 서비스 배포 — 별도 인프라 결정 필요
- Lighthouse PWA 점수 ≥ 95 튜닝 — 별도 성능 PR

---

## 6. 실패 시 롤백 절차

각 Task 커밋이 독립적이므로 문제 발생 시 해당 커밋만 revert:

```bash
git log --oneline -10                  # 최근 9개 커밋 확인
git revert <commit-hash>               # 특정 Task 롤백
git push
```

특히 **Task 5(OpenAPI 명세화)**가 가장 변경 범위가 크므로 별도 브랜치에서 진행 권장:
```bash
git checkout -b refactor/openapi-spec-completion
# Task 5 작업
git push -u origin refactor/openapi-spec-completion
# PR 생성 → CI 통과 확인 → merge
```
