export type RandomIndex = (upperBound: number) => number;

export function cryptoRandomIndex(upperBound: number): number {
  if (!Number.isInteger(upperBound) || upperBound < 1) throw new Error('upperBound must be a positive integer');
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0]! % upperBound;
}

export function shuffleChoices<T>(values: readonly T[], randomIndex: RandomIndex = cryptoRandomIndex): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

/**
 * Keeps the correct choice at a caller-selected position while still varying
 * distractors. A generated quiz rotates this position across its session.
 */
export function buildBalancedChoices(
  answer: string,
  candidates: readonly string[],
  answerIndex: number,
  randomIndex: RandomIndex = cryptoRandomIndex,
): string[] {
  const normalizedAnswer = answer.trim();
  if (!normalizedAnswer) return [];
  const seen = new Set([normalizedAnswer]);
  const distractors: string[] = [];
  for (const candidate of shuffleChoices(candidates, randomIndex)) {
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  if (distractors.length !== 3 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return [];
  distractors.splice(answerIndex, 0, answer);
  return distractors;
}

export function rotatingAnswerIndex(offset: number, ordinal: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset > 3) throw new Error('offset must be 0..3');
  if (!Number.isInteger(ordinal) || ordinal < 0) throw new Error('ordinal must be non-negative');
  return (offset + ordinal) % 4;
}
