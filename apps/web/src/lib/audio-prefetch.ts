/**
 * apps/web/src/lib/audio-prefetch.ts
 *
 * Phase 8-B: 오프라인 청해 지원 — 오디오 사전 캐시 워밍
 *
 * 사용법:
 *   import { prefetchDueAudio } from './audio-prefetch'
 *   await prefetchDueAudio()    // due 카드 오디오 전체 캐시
 *
 * 동작:
 *   1. IDB에서 오늘 due인 카드 + audio_r2_key 목록 조회
 *   2. Cache API (SW 관리 캐시 'nihongo-audio-v1') 에 저장
 *   3. 진행 상황 콜백 제공
 */

import { apiUrl } from './api-base';

const CACHE_NAME = 'nihongo-audio-v1';

function buildAudioUrl(key: string): string {
  return apiUrl(`/audio/${key.split('/').map(encodeURIComponent).join('/')}`);
}

export interface PrefetchProgress {
  total:    number;
  done:     number;
  failed:   number;
}

export type ProgressCallback = (p: PrefetchProgress) => void;

/**
 * 주어진 audio_r2_key 목록을 Cache API에 사전 저장합니다.
 * - 이미 캐시된 항목은 건너뜁니다.
 * - Service Worker 없는 환경에서도 동작 (단, 재시작 시 캐시 손실)
 */
export async function prefetchAudioKeys(
  keys: string[],
  onProgress?: ProgressCallback,
): Promise<PrefetchProgress> {
  const progress: PrefetchProgress = { total: keys.length, done: 0, failed: 0 };
  if (keys.length === 0) return progress;

  // Cache API 지원 여부 확인
  const cache = 'caches' in globalThis
    ? await caches.open(CACHE_NAME)
    : null;

  for (const key of keys) {
    const url = buildAudioUrl(key);

    try {
      // 이미 캐시됐으면 스킵
      if (cache) {
        const hit = await cache.match(url);
        if (hit) { progress.done++; onProgress?.(progress); continue; }
      }

      const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Prefetch': '1' },
      });

      if (resp.ok && cache) {
        await cache.put(url, resp.clone());
      }
      progress.done++;
    } catch {
      progress.failed++;
    }

    onProgress?.({ ...progress });
  }

  return progress;
}

/**
 * IDB의 due 카드에서 audio_r2_key를 읽어 오프라인용으로 캐싱합니다.
 * Dexie 인스턴스 없이도 동작하도록 fetch API를 직접 사용합니다.
 */
export async function prefetchDueAudio(
  onProgress?: ProgressCallback,
): Promise<PrefetchProgress> {
  // SRS due 카드의 audio_r2_key를 API에서 조회
  // GET /api/v1/srs/due-keys — 새 엔드포인트 (없으면 빈 배열)
  let keys: string[] = [];

  try {
    const res = await fetch(apiUrl('/srs/due-keys'), {
      credentials: 'include',
    });
    if (res.ok) {
        const data = await res.json() as { keys: string[] };
      keys = data.keys ?? [];
    }
  } catch {
    // 네트워크 오류 → 로컬 IndexedDB에서 직접 읽기 (graceful fallback)
    keys = await getDueKeysFromIdb();
  }

  return prefetchAudioKeys(keys, onProgress);
}

/** IDB에서 due 카드 audio_r2_key 직접 조회 (Dexie 없이 raw IDB) */
async function getDueKeysFromIdb(): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('nihongo-n3-idb');
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('srs_cards')) { resolve([]); return; }

        const tx     = db.transaction('srs_cards', 'readonly');
        const store  = tx.objectStore('srs_cards');
        const now    = new Date().toISOString();
        const result: string[] = [];

        const cursor = store.openCursor();
        cursor.onsuccess = (e) => {
          const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cur) { resolve(result); return; }
          const card = cur.value as { due?: string; audio_r2_key?: string };
          if (card.due && card.due <= now && card.audio_r2_key) {
            result.push(card.audio_r2_key);
          }
          cur.continue();
        };
        cursor.onerror = () => resolve(result);
      };
    } catch {
      resolve([]);
    }
  });
}
