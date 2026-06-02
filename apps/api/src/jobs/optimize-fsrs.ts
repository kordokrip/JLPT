/**
 * apps/api/src/jobs/optimize-fsrs.ts
 *
 * Phase 7-B: FSRS W 최적화 배치 잡
 *
 * - review_logs >= 200 인 사용자에 대해 ts-fsrs 옵티마이저 실행
 * - 결과 W 배열을 users.fsrs_weights 에 저장
 *
 * wrangler.toml Cron 설정:
 *   [[triggers.crons]]
 *   crons = ["0 15 * * 0"]  # 매주 일요일 15:00 UTC
 *
 * 호출 예시 (scheduled handler):
 *   import { runFsrsOptimizer } from './jobs/optimize-fsrs.js'
 *   export default { scheduled(event, env, ctx) { ctx.waitUntil(runFsrsOptimizer(env)) } }
 *
 * FSRS Personalization Policy (2026-05-28):
 * - 기본 운영 모드는 개인화 비활성입니다.
 * - FSRS_OPTIMIZER_URL 이 비어 있으면 스킵하며, 이는 정상 상태입니다.
 * - 활성화하려면 외부 optimizer가 FSRS-6 21 weights 출력을 보장해야 합니다.
 * - 레거시 FSRS-5 19 weights 응답은 저장 전 21개로 명시 보정합니다.
 */

import type { AppEnv } from '../types.js';
import { FSRS6_DEFAULT_W } from '@nihongo-n3/shared/fsrs';

type Env = AppEnv['Bindings'];

interface OptimizerResponse {
  weights: number[];
}

interface ReviewLogRow {
  user_id: string;
  rating: string;
  state_before: string;
  state_after: string;
  stability_after: number;
  difficulty_after: number;
  elapsed_days: number;
  scheduled_days: number;
  reviewed_at: string;
}

const FSRS_V6_WEIGHT_COUNT = 21;
const FSRS_V5_WEIGHT_COUNT = 19;

function isValidWeights(weights: unknown): weights is number[] {
  return Array.isArray(weights)
    && (weights.length === FSRS_V6_WEIGHT_COUNT || weights.length === FSRS_V5_WEIGHT_COUNT)
    && weights.every((n) => Number.isFinite(n));
}

function normalizeWeights(weights: number[]): number[] {
  if (weights.length === FSRS_V6_WEIGHT_COUNT) return weights;
  return [...weights, FSRS6_DEFAULT_W[19] ?? 0, FSRS6_DEFAULT_W[20] ?? 0.1542];
}

/**
 * 외부 Node 배치 서비스에 최적화 계산을 위임한다.
 * - URL 미설정 시 null 반환(스킵)
 * - 응답 weights가 유효하지 않으면 null 반환
 */
async function computeOptimalWeights(
  env: Env,
  userId: string,
  logs: ReviewLogRow[],
): Promise<number[] | null> {
  const endpoint = (env.FSRS_OPTIMIZER_URL ?? '').trim();
  if (!endpoint) {
    console.log('[optimize-fsrs] FSRS_OPTIMIZER_URL 미설정 → 최적화 스킵');
    return null;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.FSRS_OPTIMIZER_TOKEN
          ? { Authorization: `Bearer ${env.FSRS_OPTIMIZER_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ user_id: userId, logs }),
    });

    if (!res.ok) {
      console.error(`[optimize-fsrs] 외부 최적화 호출 실패 user=${userId} status=${res.status}`);
      return null;
    }

    const json = await res.json() as OptimizerResponse;
    const rawWeights: unknown = json.weights;
    if (!isValidWeights(rawWeights)) {
      const length = Array.isArray(rawWeights) ? rawWeights.length : 'undefined';
      console.error(
        `[optimize-fsrs] 유효하지 않은 weights 응답 user=${userId} ` +
        `length=${length}; expected 19(FSRS-5) or 21(FSRS-6)`,
      );
      return null;
    }
    return normalizeWeights(rawWeights);
  } catch (err) {
    console.error(`[optimize-fsrs] 외부 최적화 호출 예외 user=${userId}`, err);
    return null;
  }
}

export async function runFsrsOptimizer(env: Env): Promise<void> {
  const db = env.DB;

  // 200개 이상 리뷰 로그를 가진 사용자 목록
  type UserRow = { user_id: string; log_count: number };
  const candidates = await db
    .prepare(
      `SELECT user_id, COUNT(*) AS log_count
       FROM review_logs
       GROUP BY user_id
       HAVING log_count >= 200`,
    )
    .all<UserRow>();

  console.log(`[optimize-fsrs] ${candidates.results?.length ?? 0}명 최적화 대상`);
  if (!(env.FSRS_OPTIMIZER_URL ?? '').trim()) {
    console.warn('[optimize-fsrs] 외부 옵티마이저 URL이 없어 전체 스킵됩니다. (FSRS_OPTIMIZER_URL)');
    return;
  }

  for (const { user_id } of candidates.results ?? []) {
    try {
      const logs = await db
        .prepare(
          `SELECT rl.*, sc.user_id
           FROM review_logs rl
           JOIN srs_cards sc ON sc.id = rl.card_id
           WHERE sc.user_id = ?
           ORDER BY rl.reviewed_at ASC
           LIMIT 2000`,
        )
        .bind(user_id)
        .all<ReviewLogRow>();

      const rows = logs.results ?? [];
      if (rows.length < 200) continue;

      const weights = await computeOptimalWeights(env, user_id, rows);
      if (!weights) {
        console.warn(`[optimize-fsrs] user=${user_id} 최적화 결과 없음 → 업데이트 스킵`);
        continue;
      }

      await db
        .prepare('UPDATE users SET fsrs_weights = ? WHERE id = ?')
        .bind(JSON.stringify(weights), user_id)
        .run();

      console.log(`[optimize-fsrs] ✓ user=${user_id} w=[${weights.slice(0, 3).join(',')}...]`);
    } catch (err) {
      console.error(`[optimize-fsrs] ✗ user=${user_id}`, err);
    }
  }
}
