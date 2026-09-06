import { OpenAPIHono, z } from '@hono/zod-openapi';
import { learningTrackIdSchema } from '@nihongo-n3/shared';

import type { AppEnv } from '../types.js';
import { auth } from './auth.js';
import {
  dataResponseSchema,
  listResponseSchema,
  mountLegacyRouteWithOpenApiDocs,
  problemSchema,
} from './openapi-docs.js';

const authOA = new OpenAPIHono<AppEnv>();
const credentialsBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});

mountLegacyRouteWithOpenApiDocs(authOA, auth, [
  {
    method: 'get', path: '/auth/config', tags: ['Auth'], summary: '인증 설정 조회',
    responses: { 200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '인증 설정' } },
  },
  {
    method: 'get', path: '/auth/me', tags: ['Auth'], summary: '현재 세션 조회',
    responses: { 200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '현재 사용자' } },
  },
  {
    method: 'post', path: '/auth/register', tags: ['Auth'], summary: '이메일 회원가입',
    request: {
      body: {
        content: {
          'application/json': {
            schema: credentialsBody.extend({ display_name: z.string().min(1).max(80) }),
          },
        },
      },
    },
    responses: {
      201: { content: { 'application/json': { schema: dataResponseSchema } }, description: '가입 및 세션 생성' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      409: { content: { 'application/json': { schema: problemSchema } }, description: '이미 가입된 이메일' },
    },
  },
  {
    method: 'post', path: '/auth/login', tags: ['Auth'], summary: '이메일 로그인',
    request: { body: { content: { 'application/json': { schema: credentialsBody } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '로그인 성공' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 실패' },
    },
  },
  {
    method: 'post', path: '/auth/logout', tags: ['Auth'], summary: '현재 세션 로그아웃',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '로그아웃 완료' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'patch', path: '/auth/track', tags: ['Auth'], summary: '학습 트랙 변경',
    request: {
      body: {
        content: {
          'application/json': { schema: z.object({ track: learningTrackIdSchema }) },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '변경된 트랙' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '지원하지 않는 트랙' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get', path: '/auth/google/start', tags: ['Auth'], summary: 'Google OAuth 시작',
    request: { query: z.object({ track: learningTrackIdSchema.optional() }) },
    responses: {
      302: { description: 'Google 승인 화면으로 이동' },
      503: { content: { 'application/json': { schema: problemSchema } }, description: 'Google OAuth 미설정' },
    },
  },
  {
    method: 'get', path: '/auth/google/callback', tags: ['Auth'], summary: 'Google OAuth callback',
    request: { query: z.object({ code: z.string(), state: z.string() }) },
    responses: { 302: { description: '앱 또는 OAuth 완료 endpoint로 이동' } },
  },
  {
    method: 'get', path: '/auth/complete', tags: ['Auth'], summary: '교차 origin OAuth 세션 완료',
    request: { query: z.object({ token: z.string().min(1) }) },
    responses: { 302: { description: '세션 생성 후 앱으로 이동' } },
  },
  {
    method: 'post', path: '/auth/bootstrap-admin', tags: ['Admin'], summary: '초기 관리자 계정 설정',
    request: {
      body: {
        content: {
          'application/json': {
            schema: credentialsBody.extend({ token: z.string().min(1) }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '관리자 설정 완료' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '초기화 토큰 거부' },
    },
  },
  {
    method: 'get', path: '/auth/admin/users', tags: ['Admin'], summary: '회원 및 로그인 현황',
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '회원 관리 데이터' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
]);

export { authOA };
