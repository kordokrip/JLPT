import { CATEGORY_ORDER, CATEGORY_TITLE, DEFAULT_SELF_CHECK_TEMPLATES } from './data';
import type { SelfCheckCategory, SelfCheckPayload, SelfCheckRow, SelfCheckSection, SelfCheckTemplate } from './types';

export function parseRouteWeek(rawWeek: string | undefined): number | null {
  if (!rawWeek) return null;
  const week = Number(rawWeek);
  return Number.isInteger(week) && week >= 1 && week <= 52 ? week : null;
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

export function templatesFor(category: SelfCheckCategory, templates: SelfCheckTemplate[]): SelfCheckTemplate[] {
  return templates.filter((item) => item.category === category);
}

export function calcScore(category: SelfCheckCategory, local: Set<string>, templates: SelfCheckTemplate[] = DEFAULT_SELF_CHECK_TEMPLATES): number {
  const items = templatesFor(category, templates);
  const checked = items.filter((item) => local.has(item.code)).length;
  return items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
}

export function buildSelfCheckPayload(
  weekNo: number,
  local: Set<string>,
  templates: SelfCheckTemplate[] = DEFAULT_SELF_CHECK_TEMPLATES,
): SelfCheckPayload {
  const strategyScore = calcScore('strategy', local, templates);
  const speakingScore = calcScore('speaking', local, templates);
  const writingScore = calcScore('writing', local, templates);

  return {
    week_no: weekNo,
    vocab_score: calcScore('vocab', local, templates),
    grammar_score: calcScore('grammar', local, templates),
    reading_score: calcScore('reading', local, templates),
    listening_score: calcScore('listening', local, templates),
    speaking_score: speakingScore,
    writing_score: writingScore,
    domain_score: average([strategyScore, speakingScore, writingScore]),
    notes: JSON.stringify({ checked_items: [...local].sort(), template_level: 'N3' }),
  };
}

export function scoresFromSaved(row: SelfCheckRow | null | undefined): number[] | null {
  if (!row) return null;
  return [
    row.vocab_score ?? 0,
    row.grammar_score ?? 0,
    row.reading_score ?? row.writing_score ?? 0,
    row.listening_score ?? 0,
    row.speaking_score ?? row.domain_score ?? 0,
    row.writing_score ?? 0,
  ];
}

export function sectionsFromTemplates(templates: SelfCheckTemplate[]): SelfCheckSection[] {
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      title: CATEGORY_TITLE[category],
      items: templatesFor(category, templates).sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((section) => section.items.length > 0);
}

export function buildRecommendations(local: Set<string>, templates: SelfCheckTemplate[]): SelfCheckTemplate[] {
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      score: calcScore(category, local, templates),
      item: templatesFor(category, templates).find((template) => !local.has(template.code)),
    }))
    .filter((entry): entry is { category: SelfCheckCategory; score: number; item: SelfCheckTemplate } => Boolean(entry.item))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((entry) => entry.item);
}
