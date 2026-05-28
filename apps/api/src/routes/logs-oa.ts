import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { logs } from './logs.js';
import { dailyLogBodySchema, dailyLogQuerySchema, quizAttemptBodySchema } from '@nihongo-n3/shared';
import { createdResponseSchema, dataResponseSchema, listResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const logsOA = new OpenAPIHono<AppEnv>();
logsOA.route('/', logs);
registerDocsOnlyRoutes(logsOA, [
  {
    method: 'post',
    path: '/logs/daily',
    tags: ['Logs'],
    summary: '일일 학습 로그 저장',
    request: { body: { content: { 'application/json': { schema: dailyLogBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '저장 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/logs/daily',
    tags: ['Logs'],
    summary: '일일 학습 로그 조회',
    request: { query: dailyLogQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '일일 로그 목록' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'post',
    path: '/quiz/attempt',
    tags: ['Logs'],
    summary: '퀴즈 시도 기록',
    request: { body: { content: { 'application/json': { schema: quizAttemptBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '기록 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/logs/streak',
    tags: ['Logs'],
    summary: '학습 스트릭 조회',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '스트릭' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/logs/heatmap',
    tags: ['Logs'],
    summary: '학습 히트맵 조회',
    request: { query: z.object({ year: z.string().optional() }) },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '히트맵 데이터' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { logsOA };
