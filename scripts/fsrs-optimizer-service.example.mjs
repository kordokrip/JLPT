#!/usr/bin/env node

/**
 * External FSRS optimizer service (reference implementation)
 *
 * Purpose:
 * - Keep CPU-heavy optimization out of Cloudflare Workers.
 * - Receive review logs from apps/api/src/jobs/optimize-fsrs.ts
 * - Return optimized FSRS weights JSON.
 *
 * Request:
 *   POST /optimize
 *   Authorization: Bearer <FSRS_OPTIMIZER_TOKEN> (optional)
 *   Body: { user_id: string, logs: ReviewLogRow[] }
 *
 * Response:
 *   200 { "weights": number[] }
 *
 * Note:
 * - This example returns default weights from ts-fsrs.
 * - Replace optimizeWeights() with @open-spaced-repetition/binding based logic
 *   in a dedicated Node batch/runtime where native dependency is available.
 */

import { createServer } from 'node:http';

const DEFAULT_W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589,
  1.5330, 0.1544, 1.0071, 1.9395, 0.1100, 0.2900, 2.2700, 0.1400,
  2.9898, 0.5100, 0.4334,
];

const PORT = Number(process.env.PORT ?? 8788);
const TOKEN = process.env.FSRS_OPTIMIZER_TOKEN ?? '';

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'unauthorized' });
}

function badRequest(res, detail) {
  sendJson(res, 400, { error: 'bad_request', detail });
}

function isValidLogs(logs) {
  return Array.isArray(logs) && logs.length > 0;
}

async function optimizeWeights(_userId, _logs) {
  // TODO: replace with actual optimizer implementation.
  return [...DEFAULT_W];
}

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/optimize') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (TOKEN) {
    const auth = req.headers.authorization ?? '';
    const expected = `Bearer ${TOKEN}`;
    if (auth !== expected) {
      unauthorized(res);
      return;
    }
  }

  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20 * 1024 * 1024) {
        badRequest(res, 'payload_too_large');
        return;
      }
    }

    const body = JSON.parse(raw || '{}');
    const userId = body.user_id;
    const logs = body.logs;

    if (typeof userId !== 'string' || !userId) {
      badRequest(res, 'user_id is required');
      return;
    }
    if (!isValidLogs(logs)) {
      badRequest(res, 'logs must be non-empty array');
      return;
    }

    const weights = await optimizeWeights(userId, logs);
    if (!Array.isArray(weights) || weights.length < 19) {
      sendJson(res, 500, { error: 'invalid_weights' });
      return;
    }

    sendJson(res, 200, { weights });
  } catch (err) {
    sendJson(res, 500, {
      error: 'internal_error',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[fsrs-optimizer] listening on :${PORT}`);
});
