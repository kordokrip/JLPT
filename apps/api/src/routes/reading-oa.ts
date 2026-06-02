/**
 * apps/api/src/routes/reading-oa.ts
 * OpenAPIHono wrapper + docs for reading routes
 */
import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { reading } from './reading.js';
import { createdResponseSchema, dataResponseSchema, idParamSchema, listResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';

const readingOA = new OpenAPIHono<AppEnv>();
readingOA.route('/', reading);
registerDocsOnlyRoutes(readingOA, [
  {
    method: 'get',
    path: '/reading',
    tags: ['Reading'],
    summary: '독해 지문 목록',
    request: {
      query: z.object({
        level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      }),
    },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '독해 지문 목록' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
    },
  },
  {
    method: 'get',
    path: '/reading/{id}',
    tags: ['Reading'],
    summary: '독해 지문 상세',
    request: { params: idParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '지문 상세' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '지문 없음' },
    },
  },
  {
    method: 'post',
    path: '/reading/{id}/submit',
    tags: ['Reading'],
    summary: '독해 답안 제출',
    request: {
      params: idParamSchema,
      body: {
        content: {
          'application/json': {
            schema: z.object({ answers: z.array(z.number().int()).min(1) }),
          },
        },
      },
    },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '채점 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '문제 없음' },
    },
  },
  {
    method: 'post',
    path: '/admin/reading/tag',
    tags: ['Admin', 'Reading'],
    summary: '독해 지문 어휘/문법 자동 태깅',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              passage_id: z.number().int().positive().optional(),
              all: z.boolean().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '태깅 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '지문 없음' },
    },
  },
]);
export { readingOA };
