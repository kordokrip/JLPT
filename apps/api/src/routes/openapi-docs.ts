import { createRoute, z } from '@hono/zod-openapi';

import type { AppEnv } from '../types.js';

export const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

export const dataResponseSchema = z
  .object({ data: z.unknown(), meta: cursorMetaSchema.optional() })
  .openapi('GenericDataResponse');

export const listResponseSchema = z
  .object({ data: z.array(z.record(z.string(), z.unknown())), meta: cursorMetaSchema.optional() })
  .openapi('GenericListResponse');

export const createdResponseSchema = z
  .object({ data: z.unknown() })
  .openapi('GenericCreatedResponse');

export const problemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
  })
  .openapi('ProblemDetail');

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, '정수 ID 필요').openapi({ example: '1' }),
});

export const weekParamSchema = z.object({
  week: z.string().regex(/^\d+$/, '1~52 사이 정수').openapi({ example: '1' }),
});

export const audioKeyParamSchema = z.object({
  key: z.string().min(1).openapi({ example: 'vocab/N5/example.mp3' }),
});

export const docOnlyHandler = ((c: {
  json: (body: unknown, status?: number) => Response;
}) => c.json({ data: null }, 200)) as never;

type App = {
  openapi: (route: ReturnType<typeof createRoute>, handler: never) => unknown;
};

type RouteConfig = Parameters<typeof createRoute>[0];

export function registerDocsOnlyRoutes(app: App, routes: RouteConfig[]): void {
  for (const route of routes) {
    app.openapi(createRoute(route), docOnlyHandler);
  }
}

export type { AppEnv };
