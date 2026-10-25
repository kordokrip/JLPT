import { useTranslation } from 'react-i18next';
import type { LearningRecords } from '@nihongo-n3/shared';
import { accuracyLabel, recordsCopy, recordsLanguage } from '../../lib/learning-insights';

/** 강성호 · 2026-10-14: 기존 안내 세션 집계만 시각화하며 재시도·자유 학습은 합산하지 않는다. */
export function AnswerDistribution({groups, window}: Pick<LearningRecords,'groups'|'window'>) {
  const {t,i18n}=useTranslation();
  const total=groups.reduce((sum,group)=>sum+group.answered,0);
  const copy=recordsCopy[recordsLanguage(i18n.language)];
  return <section className="surface-panel space-y-4 p-5" aria-label={t('study.accuracy')}>
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">{t('study.accuracy')}</h2><p className="text-sm">{t('study.period',{days:window==='7d'?7:30})} · {t('study.count')}: {total}</p></div>
    <p className="text-sm text-[var(--text-secondary)]">{t('study.newRecords')}</p>
    {total===0 ? <p>{copy.noAnswers}</p> : <ul className="space-y-4">{groups.map(group=><li key={group.level+group.section}>
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{group.level} · {t('study.sections.'+group.section)}</span><span>{group.answered}/{total} · {copy.accuracy}: {accuracyLabel(group.correct,group.answered)??copy.noAnswers} ({group.correct}/{group.answered})</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--accent)]" style={{width:`${group.answered/total*100}%`}}/></div>
      {group.answered<10&&<p className="mt-1 text-xs text-[var(--text-secondary)]">{t('study.insufficient')}</p>}
    </li>)}</ul>}
  </section>;
}
