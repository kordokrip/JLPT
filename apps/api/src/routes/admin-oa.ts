import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { admin } from './admin.js';
import { createdResponseSchema, dataResponseSchema, mountLegacyRouteWithOpenApiDocs, problemSchema } from './openapi-docs.js';
const adminOA = new OpenAPIHono<AppEnv>();
mountLegacyRouteWithOpenApiDocs(adminOA, admin, [
  {
    method: 'get',
    path: '/dashboard',
    tags: ['Admin'],
    summary: '관리자 대시보드 HTML',
    responses: {
      200: { content: { 'text/html': { schema: { type: 'string' } } }, description: '대시보드 HTML' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
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
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
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
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/queue',
    tags: ['Admin', 'Audio'],
    summary: '폐기된 R2 발음 생성 경로',
    description: 'R2 발음 저장·생성은 정책상 비활성이다. Google 우선 동일 언어 브라우저 음성을 사용한다.',
    responses: {
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
      410: { content: { 'application/json': { schema: problemSchema } }, description: 'R2 발음 생성은 비활성' },
    },
  },
  {
    method: 'post',
    path: '/audio/curriculum-queue',
    tags: ['Admin', 'Audio'],
    summary: '폐기된 R2 curriculum 발음 생성 경로',
    description: 'R2 발음 저장·생성은 정책상 비활성이다. Google 우선 동일 언어 브라우저 음성을 사용한다.',
    responses: {
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
      410: { content: { 'application/json': { schema: problemSchema } }, description: 'R2 발음 생성은 비활성' },
    },
  },
  {
    method: 'get',
    path: '/audio/providers',
    tags: ['Admin', 'Audio'],
    summary: '폐기된 서버 TTS provider 경로',
    description: '발음은 Google 우선 동일 언어 브라우저 음성을 사용하며 서버 provider 탐색은 비활성이다.',
    responses: {
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
      410: { content: { 'application/json': { schema: problemSchema } }, description: '서버 TTS provider 경로는 비활성' },
    },
  },
  {
    method: 'post',
    path: '/audio/qa/warmup',
    tags: ['Admin', 'Audio'],
    summary: '폐기된 R2 QA 발음 생성 경로',
    description: 'R2 발음 저장·생성은 정책상 비활성이다. Google 우선 동일 언어 브라우저 음성을 사용한다.',
    responses: {
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
      410: { content: { 'application/json': { schema: problemSchema } }, description: 'R2 QA 발음 생성은 비활성' },
    },
  },
]);
export { adminOA };
