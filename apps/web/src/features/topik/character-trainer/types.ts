import type { CharacterStage } from '../../character-trainer/types';
import type { InstructionLanguage } from '@nihongo-n3/shared';

export type HangulTrainerMode = 'syllables' | 'consonants' | 'vowels';
export type { CharacterStage } from '../../character-trainer/types';

export type LocalizedLabel = Record<InstructionLanguage, string>;

export type HangulCard = {
  id: string;
  mode: HangulTrainerMode;
  char: string;
  romanization: string;
  exampleWord: string;
  exampleGloss: LocalizedLabel;
  strokeCount: number;
  composition: string;
};
