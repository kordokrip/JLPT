import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import { studyButton } from "../features/study/StudyComponents";
import { LearnerLessonLibrary } from "../features/learning/LearnerLessonLibrary";
import { LEARNING_MAP_ENABLED } from "../lib/features";
import { homePathForTrack } from "../lib/track-registry";
import { isJlptLevel } from "@nihongo-n3/shared";
import { isQuizMode } from "../features/quiz/logic";
import { TOPIK_FOUNDATION_UNITS } from "../features/topik/learning/content";
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
          ["/browse/sentence", "study.concepts"],
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
  return (
    <div className="app-page mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">{t("study.learn")}</h1>
      {LEARNING_MAP_ENABLED ? <section className="surface-panel space-y-3 p-5">
        <h2 className="text-xl font-bold">{i18n.language.startsWith('ja') ? '学習マップ' : i18n.language.startsWith('ko') ? '학습 지도' : 'Learning map'}</h2>
        <p>{i18n.language.startsWith('ja') ? '今いる場所と次のレッスンを確認できます。自由な練習はこの下から選べます。' : i18n.language.startsWith('ko') ? '현재 위치와 다음 레슨을 확인하세요. 자유 연습은 아래에서 선택할 수 있어요.' : 'Find your place and next lesson. Choose free practice below.'}</p>
        <Link to={homePathForTrack(track)} className={studyButton + ' inline-flex items-center'}>{i18n.language.startsWith('ja') ? 'マップを開く' : i18n.language.startsWith('ko') ? '지도 열기' : 'Open map'}</Link>
      </section> : <LearnerLessonLibrary />}
      <section id="free-practice" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold">{t("study.freePractice")}</h2>
        <p>{t("study.free")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {track === "jlpt-ja" ? <Link to={jlptPracticeTo} className={studyButton + " flex items-center"}>{t("study.practice")}</Link> : <Link to={topikPracticeTo} className={studyButton + " flex items-center"}>{t("study.practice")}</Link>}
          {track==='jlpt-ja' && <Link to="/quiz/vocab_mc?strategy=weakest" className={studyButton + ' flex items-center'}>{t('study.mistakes')}</Link>}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("study.materials")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {materials.map(([to, label]) => (
          <Link
            key={to}
            to={to!}
            className={studyButton + " flex items-center"}
          >
            {t(label!)}
          </Link>
        ))}
      </div>
      </section>
    </div>
  );
}
