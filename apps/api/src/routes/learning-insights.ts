import { Hono } from 'hono';
import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, badRequest, conflict } from '../lib/response.js';
import { learningTimezone, studyDate } from '../lib/motivation.js';
import { learningInsights, validInsightDate, validInsightYear } from '../lib/learning-insights.js';
import { mountLegacyRouteWithOpenApiDocs, problemSchema } from './openapi-docs.js';

const routes = new Hono<AppEnv>();
for (const path of ['/learning/insights', '/learning/insights/*']) {
routes.use(path, cfAccessAuth);
routes.use(path, async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  const expected = c.req.query('expected_track');
  if (expected && expected !== c.get('learningTrack')) return conflict(c, 'Learning track changed on another device; reload before continuing');
  return next();
});
}
for (const day of [false, true]) {
  routes.get(day ? '/learning/insights/day' : '/learning/insights', async c => {
    const user = c.get('userId'), track = c.get('learningTrack');
    const timezone = await learningTimezone(c.env.DB, user, track), now = Math.floor(Date.now() / 1000), today = studyDate(now, timezone);
    const value = c.req.query(day ? 'date' : 'year') ?? '';
    if (day ? !validInsightDate(value, today) : !validInsightYear(value, today)) return badRequest(c, day ? 'Expected a valid past or current date (YYYY-MM-DD), year 2000 or later' : 'Expected year 2000 through the current local year (YYYY)');
    return ok(c, await learningInsights(c.env.DB, user, track, day ? { date: value } : { year: Number(value) }, now));
  });
}
const count = z.number().int().nonnegative();
export const insightDaySchema = z.object({ date: z.string(), studied: z.boolean(), guided: z.object({ learned: count, reviews: count, answers: count, correct: count, retries: count }), saved: z.object({ daily_log: z.boolean(), quiz_attempts: count, owner_completions: count, reviews: count }) });
const common = z.object({ learning_track: z.enum(['jlpt-ja', 'topik-ko']), timezone: z.string(), today: z.string(), completed_lessons: z.array(z.object({ session_id: z.string(), lesson_id: z.string(), lesson_version: z.string(), title: z.object({ ko: z.string(), ja: z.string(), en: z.string() }), level: z.string(), completed_at: count, date: z.string(), answers: count, correct: count })), completed_lessons_truncated: z.boolean() });
export const annualInsightsSchema = common.extend({ year: z.number().int(), total_study_days: count, months: z.array(z.object({ month: z.number().int().min(1).max(12), study_days: count })), days: z.array(insightDaySchema) });
export const dayInsightsSchema = common.extend({ date: z.string(), day: insightDaySchema });
export const learningInsightsOA = new OpenAPIHono<AppEnv>();
mountLegacyRouteWithOpenApiDocs(learningInsightsOA, routes, [false, true].map(day => ({
  method: 'get' as const, path: day ? '/learning/insights/day' : '/learning/insights', tags: ['Learning experience'], summary: day ? 'Authoritative local-day learning evidence' : 'Authoritative annual learning days (not summed source totals)',
  request: { query: z.object({ expected_track: z.enum(['jlpt-ja', 'topik-ko']).optional(), ...(day ? { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) } : { year: z.string().regex(/^\d{4}$/) }) }) },
  responses: { 200: { description: 'Saved evidence only; saved counts overlap guided metrics. Latest 200 completed lesson sessions with explicit truncation.', content: { 'application/json': { schema: z.object({ data: day ? dayInsightsSchema : annualInsightsSchema }) } } }, 400: { description: 'Invalid or out-of-range date', content: { 'application/json': { schema: problemSchema } } }, 401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } }, 409: { description: 'Track changed', content: { 'application/json': { schema: problemSchema } } } },
})));
