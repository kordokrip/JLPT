import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDataScope } from "../../hooks/useDataScope";
import { useSettingsStore } from "../../stores/settings-store";
import {
  accuracyLabel,
  getLearningInsights,
  recordsCopy,
  recordsLanguage,
  type AnnualInsights,
  type DayInsights,
  type CompletedLesson,
} from "../../lib/learning-insights";
import { studyButton } from "../study/StudyComponents";

export function LearningInsights({ today }: { today: string }) {
  const scope = useDataScope(),
    track = useSettingsStore((s) => s.learningTrack);
  // Remount selection on account/track change, not just query data.
  return (
    <ScopedInsights
      key={scope + today}
      scope={scope}
      track={track}
      today={today}
    />
  );
}
function ScopedInsights({
  scope,
  track,
  today,
}: {
  scope: string;
  track: string;
  today: string;
}) {
  const { i18n } = useTranslation(),
    language = recordsLanguage(i18n.language),
    copy = recordsCopy[language];
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear),
    [month, setMonth] = useState(Number(today.slice(5, 7))),
    [date, setDate] = useState(today);
  const annual = useQuery({
    queryKey: ["learning-insights", scope, track, year],
    queryFn: () => getLearningInsights<AnnualInsights>(scope, track, { year }),
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ["learning-insights-day", scope, track, date],
    queryFn: () => getLearningInsights<DayInsights>(scope, track, { date }),
    retry: 1,
  });
  const data = annual.data,
    day = detail.data?.day;
  const monthName = (n: number) =>
    new Intl.DateTimeFormat(language, {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, n - 1, 1)));
  const setPeriod = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setDate(`${y}-${String(m).padStart(2, "0")}-01`);
  };
  const monthDays =
    data?.days.filter((d) => Number(d.date.slice(5, 7)) === month) ?? [];
  const pad = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const yearPad = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const maxMonth = year === currentYear ? Number(today.slice(5, 7)) : 12;
  return (
    <section className="min-w-0 space-y-5" aria-label={copy.annual}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {copy.annual}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {year} · {data ? data.total_study_days : "—"} {copy.days}
          </h2>
        </div>
        <label className="flex items-center gap-2 text-sm">
          {copy.year}
          <select
            className="study-select rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={year}
            onChange={(e) => setPeriod(Number(e.target.value), 1)}
          >
            {Array.from(
              { length: currentYear - 1999 },
              (_, i) => currentYear - i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{copy.authority}</p>
      {annual.isError ? (
        <div role="alert">
          <p>{copy.unavailable}</p>
          <button className={studyButton} onClick={() => void annual.refetch()}>
            {copy.retry}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{copy.loading}</p>
      ) : (
        <>
          <div className="surface-panel min-w-0 space-y-4 rounded-3xl p-5">
            <h3 className="font-semibold">{copy.monthly}</h3>
            {data.total_study_days === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">
                {copy.empty}
              </p>
            )}
            <div className="overflow-x-auto">
              <div
                className={`flex min-w-[624px] items-end gap-2 ${data.total_study_days ? 'h-44' : 'h-20'}`}
                aria-label={copy.monthly}
              >
                {data.months.map((m) => (
                  <button
                    key={m.month}
                    disabled={m.month > maxMonth}
                    onClick={() => setPeriod(year, m.month)}
                    aria-label={`${monthName(m.month)}: ${m.study_days} ${copy.days}`}
                    aria-pressed={month === m.month}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40"
                  >
                    <span className="text-xs tabular-nums">{m.study_days}</span>
                    <span
                      aria-hidden="true"
                      className="w-full max-w-7 rounded-t-lg bg-[var(--accent)] transition-opacity group-hover:opacity-70"
                      style={{
                        height: `${Math.max(2, (m.study_days / 31) * 110)}px`,
                        opacity: m.study_days === 0 ? 0.15 : 1,
                      }}
                    />
                    <span className="text-xs">{monthName(m.month)}</span>
                  </button>
                ))}
              </div>
            </div>
            <details>
              <summary className="cursor-pointer py-2 text-sm">
                {copy.summary}
              </summary>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{copy.monthly}</caption>
                <thead>
                  <tr>
                    <th scope="col">{copy.month}</th>
                    <th scope="col">{copy.days}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row" className="py-1 font-normal">
                        {monthName(m.month)}
                      </th>
                      <td>{m.study_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
          <div className="surface-panel min-w-0 space-y-3 rounded-3xl p-5">
            <h3 className="font-semibold">{copy.heatmap}</h3>
            <div
              className="overflow-x-auto pb-2"
              tabIndex={0}
              role="region"
              aria-label={copy.heatmap}
            >
              <div
                aria-hidden="true"
                className="grid w-max grid-flow-col grid-rows-7 gap-1"
              >
                {Array.from({ length: yearPad }, (_, i) => (
                  <span key={`pad-${i}`} className="h-3 w-3" />
                ))}
                {data.days.map((d) => (
                  <span
                    key={d.date}
                    title={`${d.date} · ${d.studied ? copy.yes : copy.no}`}
                    className={`h-3 w-3 rounded-[3px] ${d.studied ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                    style={{ opacity: d.date > data.today ? 0.3 : 1 }}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {data.total_study_days} {copy.days} · {data.timezone}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {copy.savedNote}
            </p>
          </div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <section
              className="surface-panel min-w-0 space-y-3 rounded-3xl p-4"
              aria-label={copy.calendar}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  className={studyButton}
                  aria-label={copy.previous}
                  disabled={month === 1}
                  onClick={() => setPeriod(year, month - 1)}
                >
                  ‹
                </button>
                <h3 className="font-semibold">
                  {year} · {monthName(month)}
                </h3>
                <button
                  className={studyButton}
                  aria-label={copy.next}
                  disabled={month >= maxMonth}
                  onClick={() => setPeriod(year, month + 1)}
                >
                  ›
                </button>
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[308px] grid-cols-7 gap-0.5">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span
                      key={`w-${i}`}
                      className="py-1 text-center text-xs text-[var(--text-secondary)]"
                    >
                      {new Intl.DateTimeFormat(language, {
                        weekday: "narrow",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2026, 0, 4 + i)))}
                    </span>
                  ))}
                  {Array.from({ length: pad }, (_, i) => (
                    <span key={`p-${i}`} />
                  ))}
                  {monthDays.map((d) => (
                    <button
                      key={d.date}
                      disabled={d.date > data.today}
                      onClick={() => setDate(d.date)}
                      aria-pressed={date === d.date}
                      aria-label={`${d.date}: ${copy.days} ${d.studied ? "1" : "0"}`}
                      className={`relative min-h-11 rounded-xl text-sm tabular-nums disabled:opacity-30 ${date === d.date ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-[var(--accent-soft)]"}`}
                    >
                      <span>{Number(d.date.slice(8))}</span>
                      {d.studied && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${date === d.date ? "bg-current" : "bg-[var(--accent)]"}`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <section
              className="surface-panel space-y-3 rounded-3xl p-5"
              aria-label={copy.selected}
              aria-live="polite"
            >
              <h3 className="font-semibold">{date}</h3>
              {detail.isError ? (
                <>
                  <p role="alert">{copy.unavailable}</p>
                  <button
                    className={studyButton}
                    onClick={() => void detail.refetch()}
                  >
                    {copy.retry}
                  </button>
                </>
              ) : !day ? (
                <p>{copy.loading}</p>
              ) : (
                <>
                  {!day.studied && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {copy.empty}
                    </p>
                  )}
                  <h4 className="text-sm font-semibold">{copy.guided}</h4>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {[
                      [copy.learned, day.guided.learned],
                      [copy.reviews, day.guided.reviews],
                      [copy.answers, day.guided.answers],
                      [
                        copy.accuracy,
                        accuracyLabel(day.guided.correct, day.guided.answers) ??
                          copy.noAnswers,
                      ],
                      [copy.retries, day.guided.retries],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[var(--text-secondary)]">
                          {label}
                        </dt>
                        <dd className="font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <h4 className="pt-2 text-sm font-semibold">{copy.saved}</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      [copy.quiz, day.saved.quiz_attempts],
                      [copy.owner, day.saved.owner_completions],
                      [copy.reviews, day.saved.reviews],
                      [copy.daily, day.saved.daily_log ? copy.yes : copy.no],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[var(--text-secondary)]">
                          {label}
                        </dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {copy.overlap}
                  </p>
                </>
              )}
            </section>
          </div>
          {!!detail.data?.completed_lessons.length && (
            <LessonHistory
              lessons={detail.data.completed_lessons}
              language={language}
              truncated={detail.data.completed_lessons_truncated}
              date={date}
            />
          )}
          <LessonHistory
            lessons={data.completed_lessons}
            language={language}
            truncated={data.completed_lessons_truncated}
          />
        </>
      )}
    </section>
  );
}
function LessonHistory({
  lessons,
  language,
  truncated,
  date,
}: {
  lessons: CompletedLesson[];
  language: "ko" | "ja" | "en";
  truncated: boolean;
  date?: string;
}) {
  const copy = recordsCopy[language];
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">
        {copy.history}
        {date ? ` · ${date}` : ""}
      </h3>
      {lessons.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{copy.noLessons}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lessons.map((l) => (
            <li key={l.session_id} className="surface-panel rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">
                {l.level} · {l.date}
              </p>
              <h4 className="mt-2 font-semibold"><Link className="inline-flex min-h-12 items-center underline decoration-[var(--accent)] underline-offset-4" to={'/study/' + encodeURIComponent(l.session_id)}>{l.title[language]}</Link></h4>
              <p className="mt-2 text-sm">
                {copy.answers}: {l.correct}/{l.answers} · {copy.accuracy}:{" "}
                {accuracyLabel(l.correct, l.answers) ?? copy.noAnswers}
              </p>
            </li>
          ))}
        </ul>
      )}
      {truncated && (
        <p role="status" className="text-sm">
          {copy.truncated}
        </p>
      )}
    </section>
  );
}
