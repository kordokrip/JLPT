import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { srs } from './srs.js';
import { FsrsOptionsSchema } from '@nihongo-n3/shared/schemas';
import { srsDueQuerySchema, srsInitBodySchema, srsReviewBodySchema } from '@nihongo-n3/shared';
import {
  createdResponseSchema,
  dataResponseSchema,
  listResponseSchema,
  problemSchema,
  registerDocsOnlyRoutes,
} from './openapi-docs.js';
const srsOA = new OpenAPIHono<AppEnv>();
srsOA.route('/', srs);
registerDocsOnlyRoutes(srsOA, [
  {
    method: 'post',
    path: '/srs/init',
    tags: ['SRS'],
    summary: 'SRS 카드 초기화',
    request: { body: { content: { 'application/json': { schema: srsInitBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '초기화 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/srs/due',
    tags: ['SRS'],
    summary: '복습 예정 카드 조회',
    request: { query: srsDueQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '복습 카드 목록' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'post',
    path: '/srs/review',
    tags: ['SRS'],
    summary: '복습 결과 제출',
    request: { body: { content: { 'application/json': { schema: srsReviewBodySchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '스케줄 갱신 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '카드 없음' },
    },
  },
  {
    method: 'get',
    path: '/srs/settings',
    tags: ['SRS'],
    summary: 'FSRS 설정 조회',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'FSRS 설정' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'put',
    path: '/srs/settings',
    tags: ['SRS'],
    summary: 'FSRS 설정 저장',
    request: { body: { content: { 'application/json': { schema: FsrsOptionsSchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '저장 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/srs/stats',
    tags: ['SRS'],
    summary: 'SRS 통계',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'SRS 통계' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { srsOA };
