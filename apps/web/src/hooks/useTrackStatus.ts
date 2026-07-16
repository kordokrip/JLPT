import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_JLPT_CONTENT_RELEASE,
  levelsForContentRelease,
  type TrackStatusDto,
} from '@nihongo-n3/shared';
import { tracksApi } from '../lib/api';
import { useSettingsStore } from '../stores/settings-store';

const FALLBACK_JLPT_STATUS: TrackStatusDto = {
  track: 'jlpt-ja',
  available: true,
  content_release: DEFAULT_JLPT_CONTENT_RELEASE,
  available_levels: levelsForContentRelease(DEFAULT_JLPT_CONTENT_RELEASE),
  write_enabled: true,
};

export function useTrackStatus() {
  const track = useSettingsStore((state) => state.learningTrack);
  const query = useQuery({
    queryKey: ['track-status', track],
    queryFn: async () => {
      const result = await tracksApi.status(track);
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const status = query.data ?? (track === 'jlpt-ja' ? FALLBACK_JLPT_STATUS : undefined);
  // `available_levels` is produced from the database distribution by the API.
  // The fallback above still comes from the shared release policy for offline startup.
  const levels = status?.available ? status.available_levels : [];

  return { ...query, status, levels };
}
