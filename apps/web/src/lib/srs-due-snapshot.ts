import type { ItemType, SrsCard } from './db';
import { isDue } from './fsrs-client';

export const srsCardIdentity = (card: SrsCard) =>
  JSON.stringify([card.user_id, card.item_type, card.item_id]);

// A due response authorizes this exact scoped scheduling snapshot, not the
// card ID forever. An optimistic review invalidates that authorization.
export function srsCardSnapshot(card: SrsCard): string {
  return JSON.stringify([
    card.user_id, card.id, card.item_type, card.item_id, card.state,
    card.stability, card.difficulty, card.lapses, card.reps,
    card.due_at, card.created_at, card.updated_at,
  ]);
}

export function canApplyServerDueSnapshot(
  incoming: SrsCard,
  current: SrsCard | undefined,
  beforeRequest: SrsCard | undefined,
): boolean {
  if (!current) return !beforeRequest;
  if (srsCardIdentity(current) !== srsCardIdentity(incoming)) return false;
  // A pending local review must survive a stale server response even if the
  // device clock is behind the server; timestamp ordering cannot decide this.
  if (current.reps > incoming.reps) return false;
  if (!beforeRequest || srsCardSnapshot(current) !== srsCardSnapshot(beforeRequest)) {
    return srsCardSnapshot(current) === srsCardSnapshot(incoming);
  }
  return true;
}

export function selectDueCardSnapshots(
  localCards: readonly SrsCard[],
  serverDueCards: readonly SrsCard[],
  localUserId: string,
  itemType: ItemType | undefined,
  limit: number,
  now = new Date(),
): SrsCard[] {
  const serverDue = new Set(serverDueCards
    .filter((card) => card.user_id === localUserId)
    .map(srsCardSnapshot));
  return localCards.filter((card) => card.user_id === localUserId
    && (!itemType || card.item_type === itemType)
    && (isDue(card.due_at, now) || serverDue.has(srsCardSnapshot(card))))
    .slice(0, limit);
}
