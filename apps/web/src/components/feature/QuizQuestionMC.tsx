/**
 * QuizQuestionMC — 4지 선다 (vocab_mc | kanji_reading | grammar_fill | listening)
 */
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { audioPlayer } from '../../lib/audio';

interface Props {
  questionId:  string;
  prompt:      string;
  choices:     string[];
  audioKey?:   string | undefined;
  audioText?:  string | undefined;
  selected?:   string | undefined;
  onSelect:    (choice: string) => void;
  disabled?:   boolean | undefined;
}

export default function QuizQuestionMC({
  questionId,
  prompt,
  choices,
  audioKey,
  audioText,
  selected,
  onSelect,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const [usingSpeechFallback, setUsingSpeechFallback] = useState(false);
  const promptAudioText = audioText ?? (hasJapanese(prompt) ? prompt : undefined);
  const canPlayAudio = !!audioKey || !!promptAudioText;

  const handleAudio = () => {
    setUsingSpeechFallback(false);
    audioPlayer
      .playPronunciation({ text: promptAudioText, audioPath: audioKey })
      .then(() => setUsingSpeechFallback(!audioKey))
      .catch(() => setUsingSpeechFallback(!!promptAudioText));
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
        {usingSpeechFallback && promptAudioText && (
          <p className="mb-3 text-[12px] text-[var(--muted-foreground)]" role="status">
            {t('quiz.browserSpeechFallback')}
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
