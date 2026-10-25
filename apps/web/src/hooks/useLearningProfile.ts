import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { useAuthStore } from "../stores/auth-store";
import { localUserIdFor } from "../lib/db";
import {
  learningApi,
  learningExperienceEnabled,
} from "../lib/learning-experience";
import { useDataScope } from "./useDataScope";
export function useLearningProfile() {
  const scope = useDataScope();
  const scopeIsCurrent = () => scope === localUserIdFor(
    useAuthStore.getState().user?.id,
    useSettingsStore.getState().learningTrack,
  );
  const query = useQuery({
    queryKey: ["learning-profile", scope],
    queryFn: async () => {
      if (!scopeIsCurrent()) throw new Error("Learning scope changed before profile request");
      const profile = await learningApi.profile();
      if (!scopeIsCurrent()) throw new Error("Learning scope changed during profile request");
      return profile;
    },
    enabled: learningExperienceEnabled,
    retry: 1,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (query.data?.configured && scopeIsCurrent()
      && query.data.learning_track === useSettingsStore.getState().learningTrack)
      useSettingsStore
        .getState()
        .setInstructionLanguage(
          query.data.learning_track,
          query.data.instruction_language,
        );
  }, [query.data, scope]);
  return query;
}
