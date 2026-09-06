import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEARNING_TRACK_DEFINITIONS, LEARNING_TRACK_IDS, type LearningTrackId } from '@nihongo-n3/shared';
import { homePathForTrack } from '../../lib/track-registry';
import { useAuthStore } from '../../stores/auth-store';
import { useSettingsStore } from '../../stores/settings-store';

/** Keeps the server session and account×track local data scope in sync. */
export function LearningTrackSwitch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const track = useSettingsStore((state) => state.learningTrack);
  const switchTrack = useAuthStore((state) => state.switchTrack);
  const status = useAuthStore((state) => state.status);
  const [pending, setPending] = useState<LearningTrackId | null>(null);

  const changeTrack = async (nextTrack: LearningTrackId) => {
    if (nextTrack === track || pending) return;
    setPending(nextTrack);
    try {
      const changed = status === 'authenticated'
        ? await switchTrack(nextTrack)
        : (useSettingsStore.getState().setLearningTrack(nextTrack), true);
      if (changed) navigate(homePathForTrack(nextTrack));
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="surface-panel mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" aria-label={t('study.track')}>
      <div className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
        <Languages aria-hidden="true" size={18} className="text-[var(--accent)]" />
        {t('study.track')}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-1" role="tablist" aria-label={t('study.track')}>
        {LEARNING_TRACK_IDS.map((id) => {
          const definition = LEARNING_TRACK_DEFINITIONS[id];
          const selected = id === track;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="main-content"
              disabled={pending !== null}
              onClick={() => void changeTrack(id)}
              className={[
                'min-h-11 rounded-[calc(var(--radius-md)-2px)] px-3 text-sm font-semibold transition-colors',
                selected ? 'bg-[var(--card)] text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'text-[var(--muted-foreground)] hover:text-foreground',
                pending !== null ? 'cursor-wait opacity-70' : '',
              ].join(' ')}
            >
              {t(pending === id ? 'study.switching' : id === 'jlpt-ja' ? 'study.jlpt' : 'study.topik')}
            </button>
          );
        })}
      </div>
    </section>
  );
}
