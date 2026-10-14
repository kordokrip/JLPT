import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { quiz } from './quiz.js';
import { quizGenerateBodySchema, quizSubmitBodySchema } from '@nihongo-n3/shared';
import { dataResponseSchema, listResponseSchema, mountLegacyRouteWithOpenApiDocs, problemSchema } from './openapi-docs.js';
// 강성호 2026-10-13: 실제200 성공과 철회409/410을 문서화한다. 요청/성공 payload는 변경하지 않는다.
const quizOA = new OpenAPIHono<AppEnv>();
mountLegacyRouteWithOpenApiDocs(quizOA, quiz, [
  {
    method: 'get', path: '/quiz/attempts/{id}', tags: ['Quiz'], summary: '본인의 제출 완료 결과 재조회',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'Saved grading result' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: 'Missing, unsubmitted or another account' },
      410: { content: { 'application/json': { schema: problemSchema } }, description: 'Withdrawn content or unverifiable legacy snapshot; summary history is retained' },
    },
  },
  {
    method: 'post',
    path: '/quiz/generate',
    tags: ['Quiz'],
    summary: '퀴즈 생성',
    request: { body: { content: { 'application/json': { schema: quizGenerateBodySchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '생성된 퀴즈, 정답/내부 버전 미노출' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      409: { content: { 'application/json': { schema: problemSchema } }, description: '생성 도중 공개 상태 변경' },
    },
  },
  {
    method: 'post',
    path: '/quiz/submit',
    tags: ['Quiz'],
    summary: '퀴즈 제출',
    request: { body: { content: { 'application/json': { schema: quizSubmitBodySchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '채점 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '퀴즈 없음' },
      409: { content: { 'application/json': { schema: problemSchema } }, description: '이미 제출되거나 철회된 퀴즈 또는 제출 중 공개 상태 변경' },
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
