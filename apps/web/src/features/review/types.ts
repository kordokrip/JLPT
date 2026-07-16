import type { Rating } from '../../lib/fsrs-client';
import type { SrsCard, VocabItem } from '../../lib/db';

export type ReviewScreen = 'active' | 'complete' | 'empty';

export interface ReviewViewProps {
  screen: ReviewScreen;
  current: SrsCard | undefined;
  reviewed: number;
  total: number;
  reviewing: boolean;
  starterVocab: VocabItem[];
  starterLoading: boolean;
  starterPending: boolean;
  starterError: boolean;
  onRate: (rating: Rating) => Promise<void>;
  onStartCards: () => Promise<void>;
  onRefresh: () => Promise<unknown>;
}
