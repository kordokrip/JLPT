import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { admin } from './admin.js';
import { createdResponseSchema, dataResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const adminOA = new OpenAPIHono<AppEnv>();
adminOA.route('/', admin);
registerDocsOnlyRoutes(adminOA, [
  {
    method: 'get',
    path: '/dashboard',
    tags: ['Admin'],
    summary: '관리자 대시보드 HTML',
    responses: {
      200: { content: { 'text/html': { schema: { type: 'string' } } }, description: '대시보드 HTML' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/weekly-report',
    tags: ['Admin'],
    summary: '주간 리포트 조회',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '주간 리포트' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '리포트 없음' },
    },
  },
  {
    method: 'post',
    path: '/weekly-report',
    tags: ['Admin'],
    summary: '주간 리포트 즉시 생성',
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '생성 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/queue',
    tags: ['Admin', 'Audio'],
    summary: '오디오 생성 큐 실행',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '큐 실행 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/audio/providers',
    tags: ['Admin', 'Audio'],
    summary: 'TTS provider 운영 연결 상태 확인',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'provider 상태' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/qa/warmup',
    tags: ['Admin', 'Audio'],
    summary: '30개 QA 샘플 오디오 일괄 생성',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'QA 샘플 생성 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { adminOA };
