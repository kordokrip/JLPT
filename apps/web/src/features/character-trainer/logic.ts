import type { KanjiItem } from '../../lib/db';
import { getActiveLocalUserId } from '../../lib/db';
import { HIRAGANA_EXAMPLES, KATAKANA_EXAMPLES } from './data';
import type { CharacterMode, DrawingEvaluation, DrawingStats, JlptLevel, KanaPronunciationExample, StudyCard } from './types';

export function makeKanjiCard(item: KanjiItem): StudyCard {
  const reading = [item.reading_on, item.reading_kun].filter(Boolean).join(' / ') || '-';
  const card: StudyCard = {
    id: `kanji-${item.id}`,
    mode: 'kanji',
    char: item.character,
    reading,
    meaning: item.meaning,
    strokeCount: item.stroke_count ?? 0,
    hint: `${item.meaning}의 핵심 이미지를 떠올린 뒤 한국 한자음/일본어 읽기를 분리해서 말하세요.`,
    level: item.level as JlptLevel,
  };
  if (item.audio_path) card.audioPath = item.audio_path;
  return card;
}

export function getCardAudioText(card: StudyCard): string {
  if (card.mode !== 'kanji') {
    const example = getKanaPronunciationExample(card);
    return example ? `${card.char}、${example.word}` : elongateKanaForSpeech(card.char, card.reading);
  }
  const firstReading = card.reading
    .split(/[\/,、，・\s]+/)
    .map((value) => value.trim())
    .find((value) => value.length > 0 && value !== '-');
  return firstReading ?? card.char;
}

export function getCardAudioPath(card: StudyCard): string | undefined {
  return card.audioPath;
}

export function elongateKanaForSpeech(char: string, _reading = ''): string {
  const value = char.trim();
  if (!/^[\u3040-\u309f\u30a0-\u30ff]$/u.test(value)) return value;
  return value;
}

export function getKanaPronunciationExample(card: StudyCard): KanaPronunciationExample | null {
  if (card.mode === 'hiragana') return HIRAGANA_EXAMPLES[card.reading] ?? null;
  if (card.mode === 'katakana') return KATAKANA_EXAMPLES[card.reading] ?? null;
  return null;
}

export function evaluateDrawing(stats: DrawingStats): DrawingEvaluation {
  if (!stats.bounds || stats.pointCount < 10 || stats.strokeCount < 1) {
    return {
      status: 'empty',
      score: 0,
      message: '아직 충분히 쓰지 않았습니다.',
      details: ['캔버스에 크게 한 번 써 보세요.'],
    };
  }

  const width = stats.bounds.maxX - stats.bounds.minX;
  const height = stats.bounds.maxY - stats.bounds.minY;
  const widthRatio = width / stats.canvasWidth;
  const heightRatio = height / stats.canvasHeight;
  const centerX = (stats.bounds.minX + stats.bounds.maxX) / 2 / stats.canvasWidth;
  const centerY = (stats.bounds.minY + stats.bounds.maxY) / 2 / stats.canvasHeight;
  const expected = Math.max(0, stats.expectedStrokes);
  const strokeScore = expected > 0
    ? Math.max(0, 1 - Math.abs(stats.strokeCount - expected) / Math.max(expected, 2))
    : 0.75;
  const sizeScore = Math.min(1, Math.min(widthRatio / 0.32, heightRatio / 0.32));
  const centerScore = centerX >= 0.18 && centerX <= 0.82 && centerY >= 0.15 && centerY <= 0.85 ? 1 : 0.55;
  const inkScore = Math.min(1, stats.pointCount / 45);
  const score = Math.round((strokeScore * 0.38 + sizeScore * 0.28 + centerScore * 0.18 + inkScore * 0.16) * 100);
  const details = [
    `입력 획수 ${stats.strokeCount}${expected ? ` / 권장 ${expected}` : ''}`,
    widthRatio < 0.26 || heightRatio < 0.26 ? '글자를 더 크게 써 보세요.' : '크기는 충분합니다.',
    centerScore < 1 ? '글자를 중앙에 맞춰 다시 써 보세요.' : '위치는 안정적입니다.',
  ];

  if (score >= 72) {
    return { status: 'good', score, message: '통과입니다. 한 번 더 쓰면 기억이 더 안정됩니다.', details };
  }
  return { status: 'retry', score, message: '다시 쓰는 편이 좋습니다.', details };
}

export function buildChoices(card: StudyCard, deck: StudyCard[]): string[] {
  const target = card.mode === 'kanji' ? card.meaning : card.reading;
  const seen = new Set([target]);
  const others = deck
    .filter((item) => item.id !== card.id)
    .map((item) => item.mode === 'kanji' ? item.meaning : item.reading)
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 3);
  return [target, ...others].sort(() => Math.random() - 0.5);
}

export function readProgress(id: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(`nihongo-n3:char-trainer:${getActiveLocalUserId()}:${id}`);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function writeProgress(id: string, delta: number) {
  if (typeof window === 'undefined') return;
  const next = Math.max(0, Math.min(5, readProgress(id) + delta));
  window.localStorage.setItem(`nihongo-n3:char-trainer:${getActiveLocalUserId()}:${id}`, String(next));
}

export function getExpectedAnswer(card: StudyCard | undefined): string | undefined {
  if (!card) return undefined;
  return card.mode === 'kanji' ? card.meaning : card.reading;
}

export function resetModeState(next: CharacterMode) {
  return { mode: next, index: 0, stage: 'observe' as const, revealed: false, answer: null };
}
