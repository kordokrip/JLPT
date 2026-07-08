import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useCurrentWeek } from '../../hooks/useCurrentWeek';
import { DEFAULT_SELF_CHECK_TEMPLATES, SELF_CHECK_STORAGE_PREFIX } from './data';
import { buildRecommendations, calcScore, parseRouteWeek, scoresFromSaved, sectionsFromTemplates } from './logic';
import type { SelfCheckPayload, SelfCheckRow, TemplateResponse } from './types';

export function useSelfCheck() {
  const qc = useQueryClient();
  const { week: routeWeek } = useParams<{ week?: string }>();
  const { week: currentWeek, isLoading: isCurrentWeekLoading } = useCurrentWeek();
  const selectedWeek = parseRouteWeek(routeWeek) ?? currentWeek;
  const storageKey = `${SELF_CHECK_STORAGE_PREFIX}:${selectedWeek}`;
  const [local, setLocal] = useState<Set<string>>(new Set());

  const { data: savedCheck, isLoading } = useQuery<SelfCheckRow | null>({
    queryKey: ['self-check', selectedWeek],
    queryFn: async ({ signal }) => {
      const res = await api.get<SelfCheckRow>(`/self-check/${selectedWeek}`, undefined, { signal });
      return res.ok ? res.data : null;
    },
    enabled: !isCurrentWeekLoading,
    staleTime: 1000 * 60 * 5,
  });

  const submit = useMutation({
    mutationFn: (payload: SelfCheckPayload) => api.post('/self-check', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['self-check', selectedWeek] });
      void qc.invalidateQueries({ queryKey: ['self-check-scores'] });
    },
  });

  const { data: templateData } = useQuery<TemplateResponse>({
    queryKey: ['self-check-templates', 'N3'],
    queryFn: async ({ signal }) => {
      const res = await api.get<TemplateResponse>('/self-check/templates', { level: 'N3' }, { signal });
      return res.ok ? res.data : { level: 'N3', templates: [] };
    },
    staleTime: 1000 * 60 * 60,
  });

  const templates = templateData?.templates.length ? templateData.templates : DEFAULT_SELF_CHECK_TEMPLATES;
  const sections = useMemo(() => sectionsFromTemplates(templates), [templates]);
  const validCodes = useMemo(() => new Set(templates.map((item) => item.code)), [templates]);
  const checkedLocal = useMemo(
    () => new Set([...local].filter((key) => validCodes.has(key))),
    [local, validCodes],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      const keys = saved ? JSON.parse(saved) as string[] : [];
      setLocal(new Set(keys));
    } catch {
      setLocal(new Set());
    }
  }, [storageKey]);

  const toggle = (key: string) => {
    setLocal((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const checkedCount = checkedLocal.size;
  const totalCount = templates.length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const localRadarScores = useMemo(() => [
    calcScore('vocab', checkedLocal, templates),
    calcScore('grammar', checkedLocal, templates),
    calcScore('reading', checkedLocal, templates),
    calcScore('listening', checkedLocal, templates),
    calcScore('speaking', checkedLocal, templates),
    calcScore('writing', checkedLocal, templates),
  ], [checkedLocal, templates]);

  const { data: scoresData } = useQuery<{ scores: number[]; hasData: boolean }>({
    queryKey: ['self-check-scores'],
    queryFn: async ({ signal }) => {
      const res = await api.get<{ scores: number[]; hasData: boolean }>('/self-check/scores', undefined, { signal });
      return res.ok ? res.data : { scores: [0, 0, 0, 0, 0, 0], hasData: false };
    },
    staleTime: 1000 * 60 * 5,
  });

  const savedRadarScores = scoresFromSaved(savedCheck);
  const radarScores = checkedCount > 0
    ? localRadarScores
    : savedRadarScores ?? (scoresData?.hasData ? scoresData.scores : localRadarScores);
  const recommendations = buildRecommendations(checkedLocal, templates);

  return {
    selectedWeek,
    isLoading,
    checkedLocal,
    checkedCount,
    totalCount,
    pct,
    sections,
    templates,
    radarScores,
    recommendations,
    submit,
    toggle,
  };
}
