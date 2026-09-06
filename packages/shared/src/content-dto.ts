import { DEFAULT_JLPT_LEVEL, isJlptLevel, type JlptLevel } from './jlpt-levels';

export type ContentLevel = JlptLevel;

export interface VocabContentItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  level: ContentLevel;
  part_of_speech?: string;
  example_jp?: string;
  example_ko?: string;
  source_id?: number;
  category_id?: number;
}

export interface GrammarContentItem {
  id: number;
  pattern: string;
  meaning: string;
  level: ContentLevel;
  structure?: string;
  notes?: string;
  example_jp?: string;
  example_ko?: string;
  source_id?: number;
}

export interface KanjiContentItem {
  id: number;
  character: string;
  reading_on?: string;
  reading_kun?: string;
  meaning: string;
  stroke_count?: number;
  level: ContentLevel;
  source_id?: number;
}

export interface ContentTableVersion {
  count: number;
  updatedAt: number | null;
}

export interface ContentVersionDto {
  version: string;
  generatedAt: string;
  tables: Record<string, ContentTableVersion>;
}

export type ApiRawContentRecord = Record<string, unknown>;

function text(row: ApiRawContentRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function numberValue(row: ApiRawContentRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function contentLevel(value: string | undefined): ContentLevel {
  return isJlptLevel(value) ? value : DEFAULT_JLPT_LEVEL;
}

function firstExample(row: ApiRawContentRecord): { jp?: string; ko?: string } {
  const raw = text(row, 'examples');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Array<ApiRawContentRecord>;
    const first = parsed[0];
    if (!first) return {};
    const result: { jp?: string; ko?: string } = {};
    const jp = text(first, 'ja', 'jp', 'example_ja', 'example_jp');
    const ko = text(first, 'ko', 'meaning_ko', 'example_ko');
    if (jp !== undefined) result.jp = jp;
    if (ko !== undefined) result.ko = ko;
    return result;
  } catch {
    return {};
  }
}

export function normalizeVocabContentItem(row: ApiRawContentRecord): VocabContentItem {
  const id = Number(row.id);
  const level = contentLevel(text(row, 'level'));
  const item: VocabContentItem = {
    id,
    word: text(row, 'word', 'ja') ?? '',
    reading: text(row, 'reading', 'kana') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level,
  };
  const partOfSpeech = text(row, 'part_of_speech', 'pos');
  const exampleJp = text(row, 'example_jp');
  const exampleKo = text(row, 'example_ko');
  const sourceId = numberValue(row, 'source_id');
  const categoryId = numberValue(row, 'category_id');
  if (partOfSpeech !== undefined) item.part_of_speech = partOfSpeech;
  if (exampleJp !== undefined) item.example_jp = exampleJp;
  if (exampleKo !== undefined) item.example_ko = exampleKo;
  // Pronunciation is requested from Google at playback time. Never expose a
  // legacy R2 key through a learner DTO.
  if (sourceId !== undefined) item.source_id = sourceId;
  if (categoryId !== undefined) item.category_id = categoryId;
  return item;
}

export function normalizeGrammarContentItem(row: ApiRawContentRecord): GrammarContentItem {
  const example = firstExample(row);
  const item: GrammarContentItem = {
    id: Number(row.id),
    pattern: text(row, 'pattern') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level: contentLevel(text(row, 'level')),
  };
  const structure = text(row, 'structure', 'connection');
  const notes = text(row, 'notes', 'error_note', 'contrast_ko');
  const sourceId = numberValue(row, 'source_id');
  if (structure !== undefined) item.structure = structure;
  if (notes !== undefined) item.notes = notes;
  if (example.jp !== undefined) item.example_jp = example.jp;
  if (example.ko !== undefined) item.example_ko = example.ko;
  if (sourceId !== undefined) item.source_id = sourceId;
  return item;
}

export function normalizeKanjiContentItem(row: ApiRawContentRecord): KanjiContentItem {
  const id = Number(row.id);
  const level = contentLevel(text(row, 'level', 'jlpt_level'));
  const item: KanjiContentItem = {
    id,
    character: text(row, 'character', 'char', 'kanji') ?? '',
    reading_on: text(row, 'reading_on', 'on_yomi', 'onyomi') ?? '',
    reading_kun: text(row, 'reading_kun', 'kun_yomi', 'kunyomi') ?? '',
    meaning: text(row, 'meaning', 'meaning_ko', 'ko') ?? '',
    level,
  };
  const strokeCount = numberValue(row, 'stroke_count');
  const sourceId = numberValue(row, 'source_id');
  if (strokeCount !== undefined) item.stroke_count = strokeCount;
  if (sourceId !== undefined) item.source_id = sourceId;
  return item;
}
