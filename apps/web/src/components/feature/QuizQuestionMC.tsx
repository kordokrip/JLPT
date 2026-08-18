/**
 * QuizQuestionMC — 4지 선다 (vocab_mc | kanji_reading | grammar_fill | listening)
 */
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { audioPlayer } from '../../lib/audio';
import { recordLearningActivity } from '../../lib/activity-events';
import type { JlptLevel, QuizMode } from '../../features/quiz/types';

interface Props {
  questionId:  string;
  prompt:      string;
  choices:     string[];
  audioText?:  string | undefined;
  selected?:   string | undefined;
  onSelect:    (choice: string) => void;
  disabled?:   boolean | undefined;
  activityContext?: { contentId: string; level: JlptLevel; mode: QuizMode } | undefined;
}

export default function QuizQuestionMC({
  questionId,
  prompt,
  choices,
  audioText,
  selected,
  onSelect,
  disabled = false,
  activityContext,
}: Props) {
  const { t } = useTranslation();
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  const promptAudioText = audioText ?? (hasJapanese(prompt) ? prompt : undefined);
  const canPlayAudio = Boolean(promptAudioText);

  const handleAudio = () => {
    setUsingBrowserVoice(false);
    audioPlayer
      .playPronunciation({
        text: promptAudioText,
        surface: 'listening',
        preferGoogleVoice: true,
      })
      .then((played) => {
        setUsingBrowserVoice(played);
        if (activityContext) {
          void recordLearningActivity({
            event_type: 'speech_attempted',
            learning_track: 'jlpt-ja',
            content_type: 'jlpt_practice_question',
            content_id: activityContext.contentId,
            level_tag: activityContext.level,
            mode: activityContext.mode,
            speech_outcome: played ? 'played' : 'unavailable',
          }).catch(() => undefined);
        }
      })
      .catch(() => {
        setUsingBrowserVoice(false);
        if (activityContext) {
          void recordLearningActivity({
            event_type: 'speech_attempted',
            learning_track: 'jlpt-ja',
            content_type: 'jlpt_practice_question',
            content_id: activityContext.contentId,
            level_tag: activityContext.level,
            mode: activityContext.mode,
            speech_outcome: 'error',
          }).catch(() => undefined);
        }
      });
  };

  return (
    <div className="space-y-4">
      {/* 문제 */}
      <div className="text-center">
        {canPlayAudio && (
          <button
            type="button"
            aria-label={t('common.play')}
            onClick={handleAudio}
            className="mb-4 mx-auto flex items-center justify-center w-14 h-14
                       rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]
                       hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          </button>
        )}
        {usingBrowserVoice && promptAudioText && (
          <p className="mb-3 text-[12px] text-[var(--muted-foreground)]" role="status">
            {t('quiz.browserSpeechPreferred')}
          </p>
        )}
        <p
          id={`q-${questionId}-prompt`}
          className="font-sans-jp text-[28px] font-medium text-foreground"
        >
          {prompt}
        </p>
      </div>

      {/* 선택지 */}
      <ul
        role="radiogroup"
        aria-labelledby={`q-${questionId}-prompt`}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        {choices.map((choice, index) => {
          const isSelected = selected === choice;
          return (
            <li key={`${questionId}-${index}-${choice}`}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelect(choice)}
                className={[
                  'w-full text-left px-4 py-3 rounded-lg border transition-colors text-[14px] font-pretendard',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
                  disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                ].join(' ')}
              >
                {choice}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}
