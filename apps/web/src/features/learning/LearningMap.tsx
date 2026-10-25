import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LearningProfile, StudySession } from "@nihongo-n3/shared";
import { BookOpen, Check, Flame, Star } from "lucide-react";
import { useDataScope } from "../../hooks/useDataScope";
import { useAuthStore } from "../../stores/auth-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useUiStore } from "../../stores/ui-store";
import { localUserIdFor } from "../../lib/db";
import { learningApi, readStudyLocal, writeStudyLocal } from "../../lib/learning-experience";
import { StudyRequestError } from "../study/StudyRequestError";
import { clearIntentRequest, lessonStartRequestKey, matchesExpectedScope, requestIdForIntent, selectLearningMapAction } from "./LearningMap.helpers";
import "./LearningMap.css";

function copy(language: string) {
  if (language.startsWith("ja")) return { title: "学習マップ", done: "完了", current: "現在地", available: "選べます", resume: "続きから学習", review: "復習する", next: "次のレッスンを始める", unavailable: "学習状況を確認中です。接続後にもう一度お試しください。", empty: "このレベルで公開中のレッスンはまだありません。", complete: "公開中のレッスンをすべて完了しました。", activeNoticeTitle: "進行中の学習", activeNotice: "進行中の学習があります。別のレッスンを選ぶ前に、続きから学習するか確認してください。", later: "あとで", free: "自由練習", routine: "20分の学習を始める", setup: "目標を設定", position: "現在地へ", group: "レッスン", retry: "再試行", close: "セッションを閉じる" };
  if (language.startsWith("ko")) return { title: "학습 지도", done: "완료", current: "현재 위치", available: "선택 가능", resume: "이어서 공부", review: "복습하기", next: "다음 레슨 시작", unavailable: "학습 상태를 확인하고 있어요. 연결 후 다시 시도해 주세요.", empty: "이 급수에 공개된 레슨이 아직 없어요.", complete: "공개된 레슨을 모두 마쳤어요.", activeNoticeTitle: "진행 중인 학습", activeNotice: "진행 중인 학습이 있어요. 다른 레슨을 시작하기 전에 이어서 공부할지 확인해 주세요.", later: "나중에", free: "자유 연습", routine: "20분 공부 시작", setup: "목표 설정", position: "현재 위치로", group: "레슨", retry: "다시 시도", close: "세션 닫기" };
  return { title: "Learning map", done: "Completed", current: "Current", available: "Available", resume: "Resume learning", review: "Review now", next: "Start next lesson", unavailable: "We are checking your learning status. Reconnect and try again.", empty: "There are no published lessons for this level yet.", complete: "You completed all published lessons.", activeNoticeTitle: "Learning in progress", activeNotice: "You have a session in progress. Confirm whether you want to continue it before starting another lesson.", later: "Not now", free: "Free practice", routine: "Start 20-minute routine", setup: "Set goals", position: "Go to current", group: "Lessons", retry: "Retry", close: "Close session" };
}

const dismissedNotices = new Set<string>();
const noticeKey = (scope: string, sessionId: string) => `learning-map:active-session-dismissed:${scope}:${sessionId}`;
function noticeDismissed(key: string) {
  try { return sessionStorage.getItem(key) === "1" || dismissedNotices.has(key); } catch { return dismissedNotices.has(key); }
}
function dismissNotice(key: string) {
  dismissedNotices.add(key);
  try { sessionStorage.setItem(key, "1"); } catch { /* session storage may be unavailable */ }
}

function queryState(query: { isPending: boolean; isError: boolean }) {
  return query.isPending ? "pending" as const : query.isError ? "error" as const : "success" as const;
}

export function LearningMap({ profile, onSetup }: { profile: LearningProfile; onSetup: () => void }) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const scope = useDataScope();
  const track = useSettingsStore((state) => state.learningTrack);
  const isOnline = useUiStore((state) => state.isOnline) && navigator.onLine;
  const c = copy(i18n.language);
  const currentAnchor = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const dialog = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [showPosition, setShowPosition] = useState(false);
  const [notice, setNotice] = useState<{ key: string; sessionId: string } | null>(null);
  const scopeIsCurrent = () => scope === localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack);
  const scopedQuery = <T,>(query: () => Promise<T>) => async () => {
    if (!scopeIsCurrent()) throw new Error("Learning scope changed before request");
    return query();
  };
  const current = useQuery({ queryKey: ["study-current", scope], queryFn: scopedQuery(learningApi.current), retry: 1 });
  const motivation = useQuery({ queryKey: ["learning-motivation", scope, profile.target_level], queryFn: scopedQuery(learningApi.motivation), retry: 1 });
  const catalog = useQuery({
    queryKey: ["learning-lessons", scope, profile.target_level, profile.instruction_language],
    queryFn: scopedQuery(() => learningApi.lessons(profile.target_level)),
    enabled: Boolean(profile.target_level), retry: 1,
  });
  // 강성호 2026-10-13: 기존 오프라인 재개를 보존하되 다른 트랙·철회 응답을 캐시로 덮지 않는다.
  const savedCurrent = !isOnline && !current.isError ? readStudyLocal<StudySession>(scope, "current") : null;
  const savedSession = savedCurrent?.id ? readStudyLocal<StudySession>(scope, "session:" + savedCurrent.id) : null;
  const offlineCurrent = savedSession?.id === savedCurrent?.id && savedSession ? savedSession : savedCurrent;
  const currentData = current.data !== undefined ? current.data : (offlineCurrent?.learning_track === track ? offlineCurrent : null);
  useEffect(() => {
    if (current.isSuccess && scopeIsCurrent()) writeStudyLocal(scope, "current", current.data);
  }, [current.data, current.isSuccess, scope]);
  const action = selectLearningMapAction({ track, current: currentData, motivation: motivation.data, catalog: catalog.data, currentState: !isOnline && currentData && !current.isError ? "success" : queryState(current), motivationState: queryState(motivation), catalogState: queryState(catalog), online: isOnline });
  const activeSessionId = action.kind === "resume" ? action.sessionId : null;
  const activeNoticeKey = activeSessionId ? noticeKey(scope, activeSessionId) : null;
  const openNotice = (sessionId: string) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNotice({ key: noticeKey(scope, sessionId), sessionId });
  };
  const closeNotice = () => {
    if (notice) dismissNotice(notice.key);
    setNotice(null);
  };
  useEffect(() => {
    if (!activeSessionId || !activeNoticeKey || noticeDismissed(activeNoticeKey)) {
      setNotice(null);
      return;
    }
    setNotice((current) => current?.key === activeNoticeKey ? current : { key: activeNoticeKey, sessionId: activeSessionId });
  }, [activeNoticeKey, activeSessionId]);
  useEffect(() => {
    if (!notice) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeNotice(); return; }
      if (event.key !== "Tab") return;
      const nodes = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]");
      const first = nodes?.[0], last = nodes?.[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.getElementById("root"), wasInert = root?.inert;
    if (root) root.inert = true;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (root) root.inert = wasInert ?? false;
      returnFocus.current?.focus();
    };
  }, [notice?.key]);
  const start = useMutation({
    mutationFn: async ({ lessonId, version, mode, expectedScope }: { lessonId?: string; version?: string; mode: "quick" | "daily"; expectedScope: string }) => {
      const startedScope = expectedScope;
      if (!matchesExpectedScope(expectedScope, localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack))) throw new Error("Learning scope changed before start");
      if (current.data?.status === "active" || current.data?.status === "paused") return { session: current.data, startedScope, requestKey: null, requestId: null };
      const requestKey = lessonStartRequestKey(mode, profile.target_level, lessonId ?? "", version ?? "");
      const requestId = requestIdForIntent(scope, requestKey);
      const session = await learningApi.start(requestId, mode, lessonId || undefined);
      return { session, startedScope, requestKey, requestId };
    },
    onSuccess: ({ session, startedScope, requestKey, requestId }) => {
      const liveScope = localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack);
      if (!mounted.current || !matchesExpectedScope(startedScope, liveScope)) return;
      if (requestKey && requestId) clearIntentRequest(startedScope, requestKey, requestId);
      writeStudyLocal(startedScope, "current", session);
      writeStudyLocal(startedScope, "session:" + session.id, session);
      navigate("/study/" + session.id);
    },
  });
  useEffect(() => {
    const root = document.getElementById("main-content");
    const checkPosition = () => setShowPosition(Math.max(root?.scrollTop ?? 0, window.scrollY) > 240);
    root?.addEventListener("scroll", checkPosition, { passive: true });
    window.addEventListener("scroll", checkPosition, { passive: true });
    checkPosition();
    return () => { root?.removeEventListener("scroll", checkPosition); window.removeEventListener("scroll", checkPosition); };
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const lessons = catalog.data?.lessons ?? [];
  const currentLesson = lessons.find((lesson) => lesson.id === catalog.data?.next_lesson_id) ?? lessons.find((lesson) => !lesson.completed) ?? null;
  const activeLesson = currentData?.lesson_id && currentData.lesson_version
    ? lessons.find((lesson) => lesson.id === currentData.lesson_id && lesson.version === currentData.lesson_version) ?? null
    : null;
  const grouped = lessons.reduce<typeof lessons[]>((groups, lesson, index) => { if (index % 5 === 0) groups.push([]); groups[groups.length - 1]?.push(lesson); return groups; }, []);
  // 강성호 2026-10-14: 초기 레슨 삽입으로 시작 버튼이 클릭 도중 이동하지 않도록 목록 준비까지 기다린다.
  const blocked = current.isPending || catalog.isPending || current.isError || !isOnline || start.isPending;
  const selectLesson = (lesson: { id: string; version: string }, mode: "quick" | "daily" = "quick") => {
    if (current.data?.status === "active" || current.data?.status === "paused") { openNotice(current.data.id); return; }
    if (blocked) return;
    start.mutate({ lessonId: lesson.id, version: lesson.version, mode, expectedScope: scope });
  };
  const withdrawn = (current.error as { status?: number } | null)?.status === 410;
  const close = useMutation({
    mutationFn: async ({ expectedScope }: { expectedScope: string }) => {
      const startedScope = expectedScope;
      if (!matchesExpectedScope(startedScope, localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack))) throw new Error("Learning scope changed before close");
      const session = await learningApi.status("current", "abandoned");
      return { session, startedScope };
    },
    onSuccess: ({ startedScope }) => {
      const liveScope = localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack);
      if (mounted.current && matchesExpectedScope(startedScope, liveScope)) void current.refetch();
    },
  });
  const emptyCatalog = catalog.isSuccess && lessons.length === 0;
  const completeCatalog = catalog.isSuccess && lessons.length > 0 && lessons.every((lesson) => lesson.completed);
  const calloutTitle = action.kind === "resume" ? activeLesson?.title ?? c.resume : action.kind === "review" ? t("study.dueCount", { count: motivation.data?.due_count ?? 0 }) : emptyCatalog ? c.empty : completeCatalog ? c.complete : currentLesson?.title ?? c.title;
  return <div className={`learning-map learning-map--${track === "jlpt-ja" ? "jlpt" : "topik"}`}>
    <header className="learning-map__header">
      <div><p className="learning-map__eyebrow">{track === "jlpt-ja" ? "JLPT" : "TOPIK"} · {profile.target_level}</p><h1 className="learning-map__title">{c.title}</h1></div>
      {motivation.data && <span className="learning-map__streak"><Flame size={18} aria-hidden="true" /> {motivation.data.streak}{i18n.language.startsWith('ja') ? '日' : i18n.language.startsWith('ko') ? '일' : ' days'}</span>}
    </header>
    {(current.isError || motivation.isError || catalog.isError || start.isError || close.isError) && <div className="learning-map__notice" role="alert"><StudyRequestError error={current.error ?? motivation.error ?? catalog.error ?? start.error ?? close.error} /><button className="learning-map__button" onClick={() => { void current.refetch(); void motivation.refetch(); void catalog.refetch(); }}>{c.retry}</button></div>}
    {withdrawn && <p className="learning-map__notice" role="alert"><button className="learning-map__button" disabled={close.isPending || !isOnline} onClick={() => close.mutate({ expectedScope: scope })}>{c.close}</button></p>}
    <article className="learning-map__current-card"><p className="learning-map__eyebrow">{action.kind === "review" ? c.review : c.current}</p><h2>{calloutTitle}</h2>
      {action.kind === "resume" && <button className="learning-map__button learning-map__button--primary" onClick={() => navigate(`/study/${action.sessionId}`)}>{c.resume}</button>}
      {action.kind === "review" && <Link className="learning-map__button learning-map__button--primary" to={action.to}>{c.review}</Link>}
      {action.kind === "lesson" && <button className="learning-map__button learning-map__button--primary" disabled={start.isPending} onClick={() => start.mutate({ lessonId: action.lessonId, version: action.version, mode: "quick", expectedScope: scope })}>{c.next}</button>}
      {action.kind === "unavailable" && (emptyCatalog || completeCatalog) && !blocked && current.data === null && motivation.isSuccess && <button className="learning-map__button learning-map__button--primary" disabled={start.isPending} onClick={() => start.mutate({ mode: "quick", expectedScope: scope })}>{t("study.quickStart")}</button>}
      {action.kind === "unavailable" && !emptyCatalog && !completeCatalog && <p role="status">{c.unavailable}</p>}
      <img className="learning-map__journey" src="/learning-journey.png" alt="" />
    </article>
    <section className="learning-map__path" aria-label={c.title}>
      {grouped.map((group, groupIndex) => <section className="learning-map__group" key={groupIndex} aria-label={`${c.group} ${groupIndex * 5 + 1}`}>
        <svg className="learning-map__trail" viewBox="0 0 160 800" preserveAspectRatio="none" aria-hidden="true" style={groupIndex % 2 ? { scale: '-1 1' } : undefined}><path d="M40 30 C40 115 120 115 120 210 S40 300 40 390 S120 480 120 570 S40 670 40 770" fill="none" stroke="#e7e1d5" strokeWidth="16" strokeLinecap="round" /></svg>
        <p className="learning-map__group-title">{c.group} {groupIndex * 5 + 1}–{groupIndex * 5 + group.length}</p>
        {group.map((lesson) => {
          const isCurrent = lesson.id === currentLesson?.id;
          const status = lesson.completed ? c.done : isCurrent ? c.current : c.available;
          return <div ref={isCurrent ? currentAnchor : undefined} key={lesson.id} className={`learning-map__node-wrap learning-map__node-wrap--${(groupIndex + group.indexOf(lesson)) % 2 === 0 ? "left" : "right"}`}><button type="button" className={`learning-map__node ${lesson.completed ? "learning-map__node--done" : ""} ${isCurrent ? "learning-map__node--current" : ""}`} disabled={blocked} onClick={() => selectLesson(lesson)} aria-label={`${lesson.title}: ${status}`}>
            <span className="learning-map__circle" aria-hidden="true">{lesson.completed ? <Check size={28} /> : isCurrent ? <Star size={30} /> : <BookOpen size={26} />}</span><span className="learning-map__label">{lesson.title}</span><span className="learning-map__status">{status}</span>
          </button></div>;
        })}
      </section>)}
    </section>
    <section className="learning-map__secondary" aria-label={c.title}><Link className="learning-map__button" to={track === "jlpt-ja" ? "/quiz" : "/track/topik-ko/learn?view=practice"}>{c.free}</Link><button className="learning-map__button" disabled={blocked || Boolean(current.data)} onClick={() => start.mutate({ mode: "daily", expectedScope: scope })}>{t("study.start", { minutes: profile.daily_minutes })}</button><button className="learning-map__button" onClick={onSetup}>{c.setup}</button></section>
    {showPosition && currentLesson && <button className="learning-map__position" type="button" aria-label={c.position} onClick={() => currentAnchor.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "auto" : "smooth", block: "center" })}><Star size={22} aria-hidden="true" /></button>}
    {notice && activeNoticeKey === notice.key && createPortal(<div className="learning-map__dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNotice(); }}><div ref={dialog} className="learning-map__dialog" role="dialog" aria-modal="true" aria-labelledby="learning-map-active-session-title" aria-describedby="learning-map-active-session-body"><h2 id="learning-map-active-session-title">{c.activeNoticeTitle}</h2><p id="learning-map-active-session-body">{c.activeNotice}</p><div className="learning-map__dialog-actions"><button type="button" className="learning-map__button learning-map__button--primary" onClick={() => { dismissNotice(notice.key); navigate(`/study/${notice.sessionId}`); }}>{c.resume}</button><button type="button" className="learning-map__button" onClick={closeNotice}>{c.later}</button></div></div></div>, document.body)}
  </div>;
}
