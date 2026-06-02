# ROADMAP — nihongo-n3 미래 확장 포인트

> 현재 버전 기준: N3 단일 사용자 PWA (Cloudflare Workers + D1 + R2 + Pages)  
> 이 문서는 향후 확장 시 마이그레이션 가이드를 제공합니다.

---

## 1. N2 콘텐츠 추가 마이그레이션 가이드

### 1-1. 콘텐츠 파일

```
루트/
├── 13 — 13_jlpt_n2_kanji.md        # 한자 ~328자
├── 14 — 14A_jlpt_n2_vocab_part1.md # 어휘 ~6000 (분할)
├── 14-B — 14B_jlpt_n2_vocab_part2.md
├── 15 — 15_jlpt_n2_grammar.md      # 문법 ~172
```

### 1-2. DB 스키마 변경

`vocab`, `grammar`, `kanji` 테이블의 `level` 컬럼은 이미 `TEXT`로 선언되어  
`'N2'` 값을 그대로 수용합니다. **스키마 마이그레이션 불필요**.

`sources` 테이블에 신규 소스 행 추가:

```sql
-- packages/db/drizzle/0004_add_n2_sources.sql
INSERT OR IGNORE INTO sources (code, title, level, item_type)
VALUES
  ('13',  'N2 한자',   'N2', 'kanji'),
  ('14A', 'N2 어휘①', 'N2', 'vocab'),
  ('14B', 'N2 어휘②', 'N2', 'vocab'),
  ('15',  'N2 문법',  'N2', 'grammar');
```

### 1-3. 파서 + 시드 연동

`packages/db/src/seed/constants.ts`에 경로 추가:

```typescript
n2Kanji:  path.join(REPO_ROOT, '13 — 13_jlpt_n2_kanji.md'),
n2Vocab1: path.join(REPO_ROOT, '14 — 14A_jlpt_n2_vocab_part1.md'),
// ...
```

`seed.ts`와 `seed-diff.ts`의 `SOURCE_FILE_MAP`에 N2 항목 추가 후  
`pnpm -F @nihongo-n3/db seed:remote` 실행.

### 1-4. 커리큘럼

`packages/db/src/seed/parse-curriculum.ts`에 N2 주차(주 17~32) 추가.  
`C_self_check_16weeks.md`를 확장하거나 별도 파일 생성.

### 1-5. PR 라벨

마이그레이션 SQL 파일을 포함하는 PR에 `db:migration` 라벨 부착 →  
`content-update.yml`이 자동으로 `wrangler d1 migrations apply` 실행.

---

## 2. 음성 합성 (TTS) — Workers AI 통합 검토

### 2-1. 현황

현재 오디오는 R2에 사전 녹음된 MP3/OGG 파일을 저장하고 `audio.ts` 라우트로 제공.

### 2-2. Workers AI TTS 옵션

| 모델 | 언어 | 품질 | 비용 (2025-05 기준) |
|------|------|------|---------------------|
| `@cf/baai/bge-reranker-base` | — | — | 리랭킹용 |
| OpenAI TTS API (external) | ja/ko | 고품질 | $0.015/1K chars |
| Workers AI Speech | 제한적 | 중간 | 뉴럴럴 유닛 가격 |

**권장 경로**: Cloudflare Workers AI가 일본어 TTS 모델을 공식 지원하기 전까지는  
`/api/v1/audio/tts?text=<word>` 라우트를 추가하고 **OpenAI TTS API**를 프록시.

```typescript
// apps/api/src/routes/audio.ts 확장 예시
audio.get('/audio/tts', cfAccessAuth, async (c) => {
  const text = c.req.query('text') ?? '';
  // R2 캐시 키: sha256(text)
  const cacheKey = `tts/${await sha256(text)}.mp3`;
  const cached = await c.env.ASSETS.get(cacheKey);
  if (cached) return new Response(cached.body, { headers: { 'Content-Type': 'audio/mpeg' } });

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova' }),
  });
  const audio = await res.arrayBuffer();
  await c.env.ASSETS.put(cacheKey, audio);
  return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg' } });
});
```

wrangler.toml에 `OPENAI_API_KEY` 시크릿 추가:  
`wrangler secret put OPENAI_API_KEY`

### 2-3. Workers AI 네이티브 TTS가 지원되면

`wrangler.toml`에 AI 바인딩 추가:
```toml
[ai]
binding = "AI"
```
`types.ts`의 `Env`에 `AI: Ai` 추가 후 `c.env.AI.run('@cf/...')`로 교체.

---

## 3. 다중 사용자 전환 — Better-Auth 도입 절차

### 3-1. 현황 분석

현재 인증: Cloudflare Access (단일 소유자 모델)  
- `CF_ACCESS_AUD` / `CF_TEAM_DOMAIN` 기반 JWT 검증  
- D1의 `users` 테이블에 `user_id = email` 저장

### 3-2. Better-Auth 마이그레이션 단계

**Step 1. 패키지 추가**

```bash
pnpm -F @nihongo-n3/api add better-auth
```

**Step 2. 스키마 마이그레이션**

```sql
-- packages/db/drizzle/0005_better_auth.sql
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'cf_access';
ALTER TABLE users ADD COLUMN password_hash TEXT;
-- Better-Auth sessions 테이블
CREATE TABLE IF NOT EXISTS auth_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token       TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Step 3. 미들웨어 교체**

`middleware/auth.ts`의 `cfAccessAuth`를 Better-Auth 검증 함수로 교체.  
기존 CF Access 사용자는 `auth_provider = 'cf_access'`로 유지.

**Step 4. 프론트엔드**

`apps/web/src/lib/api.ts`에서 Bearer 토큰을  
`Authorization: Bearer <better-auth-session-token>` 형태로 교체.

**Step 5. 데이터 격리**

`srs_cards`, `review_logs`, `daily_logs`, `self_check` 테이블의 모든 쿼리에  
`WHERE user_id = ?` 조건이 이미 적용되어 있어 **추가 변경 불필요**.

### 3-3. 참고 링크

- https://www.better-auth.com/docs/installation  
- https://www.better-auth.com/docs/adapters/d1 (Cloudflare D1 어댑터)

---

## 4. 기타 확장 포인트

| 기능 | 방향 |
|------|------|
| 읽기 지문 문제 (N3 독해) | `packages/db`에 `reading_passages` 테이블 추가, 별도 마크다운 소스 |
| 청취 문제 (N3 청解) | TTS 연동 후 `quiz_attempts` 테이블에 `question_type = 'listening'` |
| 모바일 앱 (React Native) | API 레이어 동일, Web PWA 서비스워커 코드 분리 |
| 다국어 뜻 표시 (en/zh) | `vocab.meaning_en`, `vocab.meaning_zh` 컬럼 추가 (nullable) |
| Anki 내보내기 | `GET /api/v1/export/anki?deck=N3` → `.apkg` 생성 Workers |
