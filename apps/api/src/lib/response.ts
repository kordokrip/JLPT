/**
 * apps/api/src/lib/response.ts
 *
 * 통일된 응답 헬퍼.
 *
 * 성공:   { data, meta? }
 * 에러:   RFC 7807 Problem Details
 *           { type, title, status, detail }
 */
import type { Context } from 'hono';
import type { CursorMeta } from '@nihongo-n3/shared';

const BASE_URL = 'https://nihongo-n3.example.com/errors/';

function slug(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-');
}

// ─────────────────────────────────────────────
// 성공 응답
// ─────────────────────────────────────────────
export function ok<T>(c: Context, data: T, meta?: CursorMeta): Response {
  return c.json({ data, meta }, 200);
}

export function created<T>(c: Context, data: T): Response {
  return c.json({ data }, 201);
}

// ─────────────────────────────────────────────
// 에러 응답 (RFC 7807)
// ─────────────────────────────────────────────
export function problem(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
  title: string,
  detail: string,
): Response {
  c.header('Content-Type', 'application/problem+json');
  return c.json(
    {
      type: BASE_URL + slug(title),
      title,
      status,
      detail,
    },
    status,
  );
}

export const badRequest = (c: Context, detail: string) =>
  problem(c, 400, 'Bad Request', detail);

export const unauthorized = (c: Context, detail = 'Authentication required') =>
  problem(c, 401, 'Unauthorized', detail);

export const forbidden = (c: Context, detail = 'Access denied') =>
  problem(c, 403, 'Forbidden', detail);

export const notFound = (c: Context, detail = 'Resource not found') =>
  problem(c, 404, 'Not Found', detail);

export const conflict = (c: Context, detail: string) =>
  problem(c, 409, 'Conflict', detail);

export const unprocessable = (c: Context, detail: string) =>
  problem(c, 422, 'Unprocessable Entity', detail);

export const internalError = (c: Context, detail = 'An unexpected error occurred') =>
  problem(c, 500, 'Internal Server Error', detail);
