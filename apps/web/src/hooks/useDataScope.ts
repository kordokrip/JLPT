import { localUserIdFor } from '../lib/db';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';

/** React Query와 브라우저 저장소를 계정과 학습 트랙 단위로 분리한다. */
export function useDataScope(): string {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const track = useSettingsStore((state) => state.learningTrack);
  return localUserIdFor(userId, track);
}
