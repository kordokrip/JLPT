import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { quiz } from './quiz.js';
import { quizGenerateBodySchema, quizSubmitBodySchema } from '@nihongo-n3/shared';
import { createdResponseSchema, dataResponseSchema, listResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const quizOA = new OpenAPIHono<AppEnv>();
quizOA.route('/', quiz);
registerDocsOnlyRoutes(quizOA, [
  {
    method: 'post',
    path: '/quiz/generate',
    tags: ['Quiz'],
    summary: '퀴즈 생성',
    request: { body: { content: { 'application/json': { schema: quizGenerateBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '생성된 퀴즈' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'post',
    path: '/quiz/submit',
    tags: ['Quiz'],
    summary: '퀴즈 제출',
    request: { body: { content: { 'application/json': { schema: quizSubmitBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '채점 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '퀴즈 없음' },
    },
  },
  {
    method: 'get',
    path: '/quiz/history',
    tags: ['Quiz'],
    summary: '퀴즈 기록',
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '퀴즈 기록' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { quizOA };
