/**
 * apps/web/src/lib/api.ts
 *
 * 타입 안전 API 클라이언트.
 * - VITE_API_URL 환경변수 (없으면 /api 로 vite proxy 사용)
 * - 401 → Cloudflare Access 로그인 페이지 리다이렉트
 * - 응답 타입: ApiResponse<T> | ApiError
 */

const BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? 'https://nihongo-n3-api.kordokrip.workers.dev' : '');

// ─────────────────────────────────────────────
// 공통 응답 타입
// ─────────────────────────────────────────────
export interface ApiOk<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  status: number;
  message: string;
}

export type ApiResult<T> = ApiOk<T> | ApiError;

// ─────────────────────────────────────────────
// 코어 fetch 래퍼
// ─────────────────────────────────────────────
async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const url = `${BASE}/api/v1${path}`;
  let res: Response;
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    res = await fetch(url, {
      credentials: 'include',   // CF Access 쿠키 자동 포함
      ...init,
      headers,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, status: 0, message: '요청 취소됨' };
    }
    return { ok: false, status: 0, message: '네트워크 오류' };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, message: '응답 파싱 오류' };
  }

  if (!res.ok) {
    const redirectTo = res.headers.get('Location');
    if (res.status === 401 && redirectTo && !path.startsWith('/auth/')) {
      window.location.href = redirectTo;
    }
    const msg =
      (body as { detail?: string; message?: string; error?: string })?.detail ??
      (body as { error?: string })?.error ??
      (body as { message?: string })?.message ??
      `HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg };
  }

  return { ok: true, ...(body as object) } as ApiOk<T>;
}

// ─────────────────────────────────────────────
// HTTP 메서드 단축
// ─────────────────────────────────────────────
export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    init?: RequestInit,
  ) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<T>(path + qs, init);
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────
// 도메인별 API 함수
// ─────────────────────────────────────────────
import type { VocabItem, GrammarItem, KanjiItem, SrsCard, ItemType, Rating } from './db';

export interface PaginatedResponse<T> {
  items: T[];
  meta: { limit: number; hasMore: boolean; nextCursor?: string };
}

type ApiList<T> = T[] | { items?: T[] };
type RawRecord = Record<string, unknown>;

function asItems<T>(value: ApiList<T>): T[] {
  return Array.isArray(value) ? value : value.items ?? [];
}

function text(row: RawRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

function numberValue(row: RawRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function normalizeVocab(row: RawRecord): VocabItem {
  const id = Number(row.id);
  const level = (text(row, 'level') ?? 'N3') as VocabItem['level'];
  const item: VocabItem = {
    id,
    word: text(row, 'word', 'ja') ?? '',
    reading: text(row, 'reading', 'kana') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level,
  };
  const partOfSpeech = text(row, 'part_of_speech', 'pos');
  const exampleJp = text(row, 'example_jp');
  const exampleKo = text(row, 'example_ko');
  const audioPath = text(row, 'audio_path', 'audio_r2_key');
  const sourceId = numberValue(row, 'source_id');
  const categoryId = numberValue(row, 'category_id');
  if (partOfSpeech !== undefined) item.part_of_speech = partOfSpeech;
  if (exampleJp !== undefined) item.example_jp = exampleJp;
  if (exampleKo !== undefined) item.example_ko = exampleKo;
  item.audio_path = audioPath ?? `audio/vocab/${level.toLowerCase()}/${id}.mp3`;
  if (sourceId !== undefined) item.source_id = sourceId;
  if (categoryId !== undefined) item.category_id = categoryId;
  return item;
}

function firstExample(row: RawRecord): { jp?: string; ko?: string } {
  const raw = text(row, 'examples');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    const first = parsed[0];
    if (!first) return {};
    const result: { jp?: string; ko?: string } = {};
    const jp = text(first, 'ja', 'jp', 'example_ja', 'example_jp');
    const ko = text(first, 'ko', 'meaning_ko', 'example_ko');
    if (jp !== undefined) result.jp = jp;
    if (ko !== undefined) result.ko = ko;
    return result;
  } catch {
    return {};
  }
}

function normalizeGrammar(row: RawRecord): GrammarItem {
  const example = firstExample(row);
  const item: GrammarItem = {
    id: Number(row.id),
    pattern: text(row, 'pattern') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level: (text(row, 'level') ?? 'N3') as GrammarItem['level'],
  };
  const structure = text(row, 'structure', 'connection');
  const notes = text(row, 'notes', 'error_note', 'contrast_ko');
  const sourceId = numberValue(row, 'source_id');
  if (structure !== undefined) item.structure = structure;
  if (notes !== undefined) item.notes = notes;
  if (example.jp !== undefined) item.example_jp = example.jp;
  if (example.ko !== undefined) item.example_ko = example.ko;
  if (sourceId !== undefined) item.source_id = sourceId;
  return item;
}

function normalizeKanji(row: RawRecord): KanjiItem {
  const id = Number(row.id);
  const level = (text(row, 'level', 'jlpt_level') ?? 'N3') as KanjiItem['level'];
  const item: KanjiItem = {
    id,
    character: text(row, 'character', 'char', 'kanji') ?? '',
    reading_on: text(row, 'reading_on', 'on_yomi', 'onyomi') ?? '',
    reading_kun: text(row, 'reading_kun', 'kun_yomi', 'kunyomi') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level,
  };
  const strokeCount = numberValue(row, 'stroke_count');
  const sourceId = numberValue(row, 'source_id');
  const audioPath = text(row, 'audio_path', 'audio_r2_key');
  if (strokeCount !== undefined) item.stroke_count = strokeCount;
  if (sourceId !== undefined) item.source_id = sourceId;
  item.audio_path = audioPath ?? `audio/kanji/${level.toLowerCase()}/${id}.mp3`;
  return item;
}

// 어휘
export const vocabApi = {
  list: async (p?: { level?: string; limit?: number; cursor?: string }) => {
    const res = await api.get<RawRecord[]>('/vocab', p as Record<string, string>);
    return res.ok ? { ...res, data: res.data.map(normalizeVocab) } : res;
  },
  get: async (id: number) => {
    const res = await api.get<RawRecord>(`/vocab/${id}`);
    return res.ok ? { ...res, data: normalizeVocab(res.data) } : res;
  },
  search: async (q: string, limit = 20) => {
    const res = await api.get<RawRecord[]>('/vocab/search', { q, limit });
    return res.ok ? { ...res, data: res.data.map(normalizeVocab) } : res;
  },
};

// 문법
export const grammarApi = {
  list: async (p?: { level?: string; limit?: number; cursor?: string }) => {
    const res = await api.get<RawRecord[]>('/grammar', p as Record<string, string>);
    return res.ok ? { ...res, data: res.data.map(normalizeGrammar) } : res;
  },
  get: async (id: number) => {
    const res = await api.get<RawRecord>(`/grammar/${id}`);
    return res.ok ? { ...res, data: normalizeGrammar(res.data) } : res;
  },
};

// 한자
export const kanjiApi = {
  list: async (p?: { level?: string; limit?: number; cursor?: string }) => {
    const res = await api.get<RawRecord[]>('/kanji', p as Record<string, string>);
    return res.ok ? { ...res, data: res.data.map(normalizeKanji) } : res;
  },
  get: async (id: number) => {
    const res = await api.get<RawRecord>(`/kanji/${id}`);
    return res.ok ? { ...res, data: normalizeKanji(res.data) } : res;
  },
};

// SRS
export const srsApi = {
  init: (item_type: ItemType, item_ids: number[]) =>
    api.post<{ created: number }>('/srs/init', { item_type, item_ids }),

  due: async (p?: { item_type?: ItemType; limit?: number }) => {
    const res = await api.get<ApiList<SrsCard>>('/srs/due', p as Record<string, string>);
    return res.ok ? { ...res, data: asItems(res.data) } : res;
  },

  review: (card_id: number, rating: Rating, response_ms?: number) =>
    api.post<SrsCard>('/srs/review', { card_id, rating, ...(response_ms !== undefined ? { response_ms } : {}) }),

  stats: async () => {
    const res = await api.get<{ new: number; learning: number; review: number; relearning?: number; total?: number; firstCardCreatedAt?: string | null }>('/srs/stats');
    if (!res.ok) return res;
    const total = res.data.total ?? res.data.new + res.data.learning + res.data.review + (res.data.relearning ?? 0);
    return { ...res, data: { ...res.data, total } };
  },
};

// 동기화
export const syncApi = {
  push: (last_synced_at: string, operations: Array<{ op_id: string; type: string; payload: unknown; occurred_at: string }>) =>
    api.post<{ processed_op_ids: string[]; server_delta: unknown }>('/sync', {
      client_id: 'web-pwa',
      last_synced_at,
      operations,
    }),
};

// 일일 로그
export const logsApi = {
  save: (date: string, reviews_done: number, new_cards: number, study_minutes: number) =>
    api.post<{ id: number }>('/logs/daily', { date, reviews_done, new_cards, study_minutes }),
  streak: (init?: RequestInit) =>
    api.get<{ currentStreak: number; longestStreak: number; totalDays: number; lastStudyDate: string | null; frozen: boolean }>('/logs/streak', undefined, init),
  heatmap: (year: number) =>
    api.get<Record<string, { count: number; intensity: 0 | 1 | 2 | 3 | 4 }>>('/logs/heatmap', { year }),
};

export interface NaturalTranslation {
  sourceText: string;
  translatedText: string;
  readingHint?: string;
  nuanceKo?: string;
  alternatives?: string[];
  model: string;
}

export const aiApi = {
  naturalTranslate: (text: string, tone: 'neutral' | 'polite' | 'casual' | 'study' = 'polite') =>
    api.post<NaturalTranslation>('/ai/translate', { text, target: 'ja', tone }),
};

export type AuthRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: AuthRole;
  auth_provider?: string;
}

export interface AuthConfig {
  google_enabled: boolean;
  auth_mode: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string;
  role: AuthRole;
  auth_provider: string;
  created_at: number;
  last_login_at?: number | null;
  active_sessions: number;
}

export interface LoginEventRow {
  id: number;
  user_id?: string | null;
  email?: string | null;
  provider: string;
  event_type: string;
  ip?: string | null;
  user_agent?: string | null;
  created_at: number;
}

export interface AdminUsersOverview {
  stats: {
    total_users: number;
    admin_users: number;
    active_sessions: number;
    login_events_24h: number;
  };
  users: AdminUserRow[];
  events: LoginEventRow[];
}

export const authApi = {
  config: () => api.get<AuthConfig>('/auth/config'),
  me: () => api.get<{ authenticated: boolean; user: AuthUser | null }>('/auth/me'),
  register: (email: string, password: string, display_name: string) =>
    api.post<{ user: AuthUser }>('/auth/register', { email, password, display_name }),
  login: (email: string, password: string) =>
    api.post<{ user: AuthUser }>('/auth/login', { email, password }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  googleStartUrl: () => `${BASE}/api/v1/auth/google/start`,
  adminUsers: () => api.get<AdminUsersOverview>('/auth/admin/users'),
};

export const __apiTestUtils = {
  normalizeVocab,
  normalizeGrammar,
  normalizeKanji,
  asItems,
};

// ─────────────────────────────────────────────
// openapi-fetch 기반 타입 안전 클라이언트
//
// 사용법:
//   const { data, error } = await typedApi.GET('/api/v1/vocab', { params: { query: { level: 'N3' } } });
//
// 타입 재생성:
//   pnpm -F @nihongo-n3/api dev   (wrangler dev :8787 실행)
//   pnpm -F @nihongo-n3/web gen:api-types
//
// openapi-typescript 가 api.d.ts 를 갱신하면 아래 클라이언트 호출이
// 컴파일 시 타입 오류로 즉시 감지됩니다.
// ─────────────────────────────────────────────
import createClient from 'openapi-fetch';
import type { paths } from '../types/api.js';

export const typedApi = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  credentials: 'include',
});
