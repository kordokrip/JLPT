import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import { LearnerLessonLibrary } from "../features/learning/LearnerLessonLibrary";
import { LEARNING_MAP_ENABLED } from "../lib/features";
import { homePathForTrack } from "../lib/track-registry";
import { isJlptLevel } from "@nihongo-n3/shared";
import { isQuizMode } from "../features/quiz/logic";
import { TOPIK_FOUNDATION_UNITS } from "../features/topik/learning/content";
import { LearningIllustration } from '../components/ui/LearningIllustration';
import "../features/learning/LearnHub.css";
export function jlptPracticeHref(level: string | null, section: string | null): string {
  const safeLevel = isJlptLevel(level) ? level : null;
  const safeMode = isQuizMode(section ?? undefined) ? section : null;
  const path = safeMode ? `/quiz/${safeMode}` : "/quiz";
  return safeLevel ? `${path}?level=${encodeURIComponent(safeLevel)}` : path;
}

export function topikMaterialHrefs(grade: string | null, unit: string | null, section: string | null) {
  const safeGrade = grade && /^[1-6]$/.test(grade) ? grade : null;
  const safeUnit = unit && TOPIK_FOUNDATION_UNITS.some((item) => item.id === unit) ? unit : null;
  const safeSection = section === "listening" || section === "reading" || section === "writing" ? section : null;
  return {
    owner: `/track/topik-ko/learn?view=owner${safeGrade ? `&grade=${safeGrade}` : ""}`,
    foundation: `/track/topik-ko/learn?view=foundation${safeUnit ? `&unit=${encodeURIComponent(safeUnit)}` : ""}`,
    practice: `/track/topik-ko/learn?view=practice${safeSection ? `&section=${safeSection}` : ""}`,
  };
}
export default function LearnHub() {
  const { t, i18n } = useTranslation(),
    track = useSettingsStore((s) => s.learningTrack);
  const [searchParams] = useSearchParams();
  const requestedLevel = searchParams.get("level");
  const requestedSection = searchParams.get("section");
  const jlptLevel = isJlptLevel(requestedLevel) ? requestedLevel : null;
  const jlptMode = isQuizMode(requestedSection ?? undefined) ? requestedSection : null;
  const jlptPracticeTo = jlptPracticeHref(jlptLevel, jlptMode);
  const topikGrade = searchParams.get("grade");
  const topikSection = searchParams.get("section");
  const topikUnit = searchParams.get("unit");
  const topikHrefs = topikMaterialHrefs(topikGrade, topikUnit, topikSection);
  const topikPracticeTo = topikHrefs.practice;
  const materials =
    track === "jlpt-ja"
      ? [
          ["/browse/vocab", "nav.browse"],
          ["/browse/grammar", "browse.grammar"],
          ["/browse/kanji", "browse.kanji"],
          ["/browse/sentence", "study.sections.sentence"],
          ["/characters", "study.characters"],
          ["/reading", "nav.reading"],
          ["/curriculum", "study.curriculum"],
          ["/self-check", "study.placement"],
        ]
      : [
          [topikHrefs.owner, "study.owner"],
          [topikHrefs.foundation, "study.foundation"],
          ["/track/topik-ko/characters", "study.characters"],
          ["/track/topik-ko/placement", "study.placement"],
        ];
  const primaryMaterials = materials.filter(([, label]) => label !== "study.curriculum" && label !== "study.placement");
  const supportingMaterials = materials.filter(([, label]) => label === "study.curriculum" || label === "study.placement");
  const mapCopy = i18n.language.startsWith('ja')
    ? { title: '学習マップ', detail: '今いる場所と次のレッスンを確認できます。' }
    : i18n.language.startsWith('ko')
      ? { title: '학습 지도', detail: '현재 위치와 다음 레슨을 확인하세요.' }
      : { title: 'Learning map', detail: 'Find your place and next lesson.' };
  return (
    <div className="learn-hub app-page mx-auto max-w-3xl space-y-7">
      <h1 className="text-3xl font-bold">{t("study.learn")}</h1>
      {LEARNING_MAP_ENABLED ? <section className="learn-hub__map surface-panel">
        <LearningIllustration kind="growth-journal" size={48} />
        <div className="learn-hub__map-copy">
          <h2>{mapCopy.title}</h2>
          <p>{mapCopy.detail}</p>
        </div>
        <Link to={homePathForTrack(track)} className="learn-hub__map-link" aria-label={i18n.language.startsWith('ja') ? '学習マップを開く' : i18n.language.startsWith('ko') ? '학습 지도 열기' : 'Open learning map'}>
          <span aria-hidden="true">→</span>
        </Link>
      </section> : <LearnerLessonLibrary />}
      <section id="free-practice" className="learn-hub__section scroll-mt-24">
        <div className="learn-hub__section-head">
          <h2 className="text-xl font-bold">{t("study.freePractice")}</h2>
          <p>{t("study.free")}</p>
        </div>
        <div className={'learn-hub__practice-grid' + (track === 'topik-ko' ? ' learn-hub__practice-grid--single' : '')}>
          <Link to={track === 'jlpt-ja' ? jlptPracticeTo : topikPracticeTo} className="learn-hub__practice-card"><LearningIllustration kind="study-book" size={48}/><span>{t("study.practice")}</span><span className="learn-hub__card-arrow" aria-hidden="true">↗</span></Link>
          {track==='jlpt-ja' && <Link to="/quiz/vocab_mc?strategy=weakest" className="learn-hub__practice-card"><LearningIllustration kind="recall-cards" size={48}/><span>{t('study.mistakes')}</span><span className="learn-hub__card-arrow" aria-hidden="true">↗</span></Link>}
        </div>
      </section>
      <section className="learn-hub__section">
        <div className="learn-hub__section-head">
          <h2 className="text-xl font-bold">{t("study.materials")}</h2>
        </div>
      <div className="learn-hub__materials-grid">
        {primaryMaterials.map(([to, label]) => (
          <Link
            key={to}
            to={to!}
            className="learn-hub__material-card"
          >
            <LearningIllustration size={48} glyph={to?.includes('characters') ? track === 'topik-ko' ? '가' : 'あ' : '漢'} kind={to?.includes('kanji') || to?.includes('characters') ? 'kanji-tile' : to?.includes('grammar') ? 'recall-cards' : to?.includes('curriculum') || to?.includes('check') || to?.includes('placement') ? 'growth-journal' : 'study-book'} />
            <span>{t(label!)}</span>
          </Link>
        ))}
      </div>
      {supportingMaterials.length > 0 && <details className="learn-hub__supporting">
        <summary>{supportingMaterials.map(([, label]) => t(label!)).join(' · ')}</summary>
        <div>
          {supportingMaterials.map(([to, label]) => <Link key={to} to={to!}>{t(label!)}</Link>)}
        </div>
      </details>}
      </section>
    </div>
  );
}
