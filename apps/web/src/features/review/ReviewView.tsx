import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SRSCard } from '../../components/feature/SRSCard';
import { Button, Card, Progress } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useDataScope } from '../../hooks/useDataScope';
import { useVocabItem } from '../../hooks/useVocab';
import type { ReviewViewProps } from './types';
import type { Rating } from '../../lib/fsrs-client';
import type { SrsCard } from '../../lib/db';

export function ReviewView(props: ReviewViewProps) {
  const {
    screen,
    current,
    reviewed,
    total,
    reviewing,
    starterVocab,
    starterLoading,
    starterPending,
    starterError,
    onRate,
    onStartCards,
    onRefresh,
  } = props;
  const { t } = useTranslation();

  if (screen === 'complete') {
    return (
      <div className="app-page flex min-h-[70vh] items-center justify-center">
        <Card elevated className="w-full max-w-[520px] p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mb-4 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">
            {t('review.sessionCompleteTitle')}
          </h1>
          <p className="mb-8 text-sm text-[var(--muted-foreground)]">
            {t('review.sessionDone', { count: reviewed })}
          </p>
          <Button asChild size="lg">
            <Link to="/">{t('review.backToHome')}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === 'empty') {
    const canStart = starterVocab.length > 0 && !starterPending;
    return (
      <div className="app-page flex min-h-[70vh] items-center justify-center">
        <Card elevated className="w-full max-w-[620px] p-6 text-center sm:p-8">
          <h1 className="mb-3 font-serif-jp text-[var(--text-2xl)] font-normal text-foreground">{t('review.emptyTitle')}</h1>
          <p className="mb-5 text-sm leading-6 text-[var(--muted-foreground)]">{t('review.noDueCards')}</p>
          <div className="surface-panel mx-auto mb-7 max-w-[480px] p-4 text-left">
            <p className="mb-1 text-sm font-semibold text-foreground">{t('review.starterTitle')}</p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t('review.starterDesc')}</p>
            {starterError && (
              <p className="text-[12px] text-red-600 mt-2" role="alert">{t('review.starterError')}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" onClick={onStartCards} disabled={!canStart} size="lg">
              {starterPending || starterLoading ? t('common.loading') : t('review.startStarterCards')}
            </Button>
            <Button onClick={() => void onRefresh()} variant="outline" size="lg">
              {t('common.refresh')}
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/">{t('review.backToHome')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif-jp text-[var(--text-xl)] font-normal leading-tight text-foreground">{t('nav.review')}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('review.subtitle')}</p>
        </div>
        <div data-visual-dynamic className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-3 py-2 text-right">
          <div className="text-base font-semibold text-foreground">
            {t('review.progress', { done: reviewed + 1, total })}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">{t('review.completed', { count: reviewed })}</div>
        </div>
      </div>

      <Progress data-visual-dynamic value={total > 0 ? reviewed : 0} max={Math.max(total, 1)} size="sm" className="mb-5" />

      {current && (current.item_type === 'vocab'
        ? <VocabReviewCard card={current} onRate={onRate} loading={reviewing} />
        : <TypedReviewCard card={current} onRate={onRate} loading={reviewing} />)}
    </div>
  );
}

function TypedReviewCard({card,onRate,loading}:{card:SrsCard;onRate:(rating:Rating)=>Promise<void>;loading:boolean}){
 const scope=useDataScope(),{t}=useTranslation();
 const query=useQuery({queryKey:['review-content',scope,card.item_type,card.item_id],queryFn:async()=>{
 const res=await api.get<{prompt:string;reading:string|null;solution:{explanation:string}}>('/learning/content/'+card.item_type+'/'+card.item_id,{expected_track:'jlpt-ja'});
 if(!res.ok)throw new Error(res.message);return res.data;
 },retry:1});
 if(query.isError)return <div role="alert"><p>{t('study.unavailable')}</p><Button onClick={()=>void query.refetch()}>{t('study.retry')}</Button></div>;
 if(!query.data)return <p role="status">{t('study.loading')}</p>;
 return <SRSCard key={card.item_type+':'+card.item_id} card={card} heading={query.data.prompt}
 {...(query.data.reading?{reading:query.data.reading}:{})} meaning={query.data.solution.explanation} onRate={onRate} loading={loading}/>;
}
function VocabReviewCard({card,onRate,loading}:{card:SrsCard;onRate:(rating:Rating)=>Promise<void>;loading:boolean}){
 const {item}=useVocabItem(card.item_id);
 if(!item)return <div className="border-[0.5px] border-[var(--border)] rounded-2xl bg-card flex items-center justify-center" style={{height:'220px'}}><span className="h-6 w-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"/></div>;
 return <SRSCard card={card} heading={item.word} {...(item.reading?{reading:item.reading}:{})} meaning={item.meaning}
 {...(item.part_of_speech?{partOfSpeech:item.part_of_speech}:{})} {...(item.example_jp?{example:item.example_jp}:{})}
 {...(item.example_ko?{exampleKo:item.example_ko}:{})} onRate={onRate} loading={loading}/>;
}
