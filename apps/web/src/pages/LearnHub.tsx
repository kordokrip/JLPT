import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settings-store";
import { studyButton } from "../features/study/StudyComponents";
export default function LearnHub() {
  const { t } = useTranslation(),
    track = useSettingsStore((s) => s.learningTrack);
  const links =
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
      <p>{t("study.free")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(([to, label]) => (
          <Link
            key={to}
            to={to!}
            className={studyButton + " flex items-center"}
          >
            {t(label!)}
          </Link>
        ))}
      </div>
    </div>
  );
}
