import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import { studyButton } from "../features/study/StudyComponents";
export default function QuestionsHub() {
  const { t } = useTranslation(),
    track = useSettingsStore((s) => s.learningTrack);
  const links =
    track === "jlpt-ja"
      ? [
          ["/quiz", "study.practice"],
          ["/quiz/vocab_mc?strategy=weakest", "study.mistakes"],
          ["/reading", "nav.reading"],
        ]
      : [["/track/topik-ko/learn?view=practice", "study.practice"]];
  return (
    <div className="app-page mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">{t("study.questions")}</h1>
      <p>{t("study.free")}</p>
      {links.map(([to, label]) => (
        <Link key={to} to={to!} className={studyButton + " flex items-center"}>
          {t(label!)}
        </Link>
      ))}
    </div>
  );
}
