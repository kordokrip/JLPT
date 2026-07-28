import {
  LEARNING_TRACK_DEFINITIONS,
  type LearningTrackId,
} from '@nihongo-n3/shared';

export type NavigationKey =
  | 'home'
  | 'review'
  | 'browse'
  | 'quiz'
  | 'characters'
  | 'reading'
  | 'curriculum'
  | 'selfCheck'
  | 'stats'
  | 'learn'
  | 'placement'
  | 'progress'
  | 'adminUsers'
  | 'settings';

export type NavigationIcon =
  | 'home'
  | 'review'
  | 'browse'
  | 'quiz'
  | 'characters'
  | 'reading'
  | 'curriculum'
  | 'selfCheck'
  | 'stats'
  | 'learn'
  | 'placement'
  | 'progress'
  | 'admin'
  | 'settings';

export interface TrackNavigationItem {
  to: string;
  key: NavigationKey;
  icon: NavigationIcon;
  primary?: boolean;
  adminOnly?: boolean;
}

const JLPT_NAVIGATION: readonly TrackNavigationItem[] = [
  { to: '/', key: 'home', icon: 'home', primary: true },
  { to: '/review', key: 'review', icon: 'review', primary: true },
  { to: '/browse/vocab', key: 'browse', icon: 'browse', primary: true },
  { to: '/quiz', key: 'quiz', icon: 'quiz', primary: true },
  { to: '/characters', key: 'characters', icon: 'characters' },
  { to: '/reading', key: 'reading', icon: 'reading' },
  { to: '/curriculum', key: 'curriculum', icon: 'curriculum' },
  { to: '/self-check', key: 'selfCheck', icon: 'selfCheck' },
  { to: '/stats', key: 'stats', icon: 'stats' },
  { to: '/admin/users', key: 'adminUsers', icon: 'admin', adminOnly: true },
  { to: '/settings', key: 'settings', icon: 'settings', primary: true },
];

const TOPIK_NAVIGATION: readonly TrackNavigationItem[] = [
  { to: '/track/topik-ko', key: 'home', icon: 'home', primary: true },
  { to: '/track/topik-ko/learn', key: 'learn', icon: 'learn', primary: true },
  { to: '/track/topik-ko/characters', key: 'characters', icon: 'characters', primary: true },
  { to: '/track/topik-ko/review', key: 'review', icon: 'review', primary: true },
  { to: '/track/topik-ko/placement', key: 'placement', icon: 'placement', primary: true },
  { to: '/track/topik-ko/progress', key: 'progress', icon: 'progress' },
  { to: '/admin/users', key: 'adminUsers', icon: 'admin', adminOnly: true },
  { to: '/settings', key: 'settings', icon: 'settings', primary: true },
];

export interface WebTrackDefinition {
  id: LearningTrackId;
  homePath: string;
  productLabel: string;
  shortLabel: string;
  navigation: readonly TrackNavigationItem[];
}

export const WEB_TRACK_REGISTRY: Record<LearningTrackId, WebTrackDefinition> = {
  'jlpt-ja': {
    id: 'jlpt-ja',
    homePath: LEARNING_TRACK_DEFINITIONS['jlpt-ja'].homePath,
    productLabel: 'JLPT Japanese',
    shortLabel: 'JLPT',
    navigation: JLPT_NAVIGATION,
  },
  'topik-ko': {
    id: 'topik-ko',
    homePath: LEARNING_TRACK_DEFINITIONS['topik-ko'].homePath,
    productLabel: 'TOPIK Korean',
    shortLabel: 'TOPIK',
    navigation: TOPIK_NAVIGATION,
  },
};

export function webTrackDefinition(track: LearningTrackId): WebTrackDefinition {
  return WEB_TRACK_REGISTRY[track];
}

export function navigationForTrack(
  track: LearningTrackId,
  role?: 'user' | 'admin',
): readonly TrackNavigationItem[] {
  return WEB_TRACK_REGISTRY[track].navigation.filter((item) => !item.adminOnly || role === 'admin');
}

export function homePathForTrack(track: LearningTrackId): string {
  return WEB_TRACK_REGISTRY[track].homePath;
}
