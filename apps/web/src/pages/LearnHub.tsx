import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import { studyButton } from "../features/study/StudyComponents";
import { LearnerLessonLibrary } from "../features/learning/LearnerLessonLibrary";
export default function LearnHub() {
  const { t } = useTranslation(),
    track = useSettingsStore((s) => s.learningTrack);
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
          ["/track/topik-ko/learn?view=owner", "study.owner"],
          ["/track/topik-ko/learn?view=foundation", "study.foundation"],
          ["/track/topik-ko/characters", "study.characters"],
          ["/track/topik-ko/placement", "study.placement"],
        ];
  return (
    <div className="app-page mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">{t("study.learn")}</h1>
      <LearnerLessonLibrary />
      <section id="free-practice" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold">{t("study.freePractice")}</h2>
        <p>{t("study.free")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {track === "jlpt-ja" ? <Link to="/quiz" className={studyButton + " flex items-center"}>{t("study.practice")}</Link> : <Link to="/track/topik-ko/learn?view=practice" className={studyButton + " flex items-center"}>{t("study.practice")}</Link>}
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
