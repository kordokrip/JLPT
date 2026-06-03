import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { selfCheck } from './self-check.js';
import { selfCheckBodySchema } from '@nihongo-n3/shared';
import { createdResponseSchema, dataResponseSchema, listResponseSchema, problemSchema, registerDocsOnlyRoutes, weekParamSchema } from './openapi-docs.js';
const selfCheckOA = new OpenAPIHono<AppEnv>();
selfCheckOA.route('/', selfCheck);
registerDocsOnlyRoutes(selfCheckOA, [
  {
    method: 'get',
    path: '/self-check/templates',
    tags: ['SelfCheck'],
    summary: '자가진단 한국어 템플릿 목록',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '자가진단 템플릿 목록' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/self-check/scores',
    tags: ['SelfCheck'],
    summary: '자가진단 점수 목록',
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '자가진단 점수 목록' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/self-check/{week}',
    tags: ['SelfCheck'],
    summary: '특정 주차 자가진단',
    request: { params: weekParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '자가진단 항목 또는 미작성 상태(null)' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
    },
  },
  {
    method: 'post',
    path: '/self-check',
    tags: ['SelfCheck'],
    summary: '자가진단 저장',
    request: { body: { content: { 'application/json': { schema: selfCheckBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '저장 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { selfCheckOA };
