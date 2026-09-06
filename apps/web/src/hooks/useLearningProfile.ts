import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import {
  learningApi,
  learningExperienceEnabled,
} from "../lib/learning-experience";
import { useDataScope } from "./useDataScope";
export function useLearningProfile() {
  const scope = useDataScope();
  const query = useQuery({
    queryKey: ["learning-profile", scope],
    queryFn: learningApi.profile,
    enabled: learningExperienceEnabled,
    retry: 1,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (query.data?.configured)
      useSettingsStore
        .getState()
        .setInstructionLanguage(
          query.data.learning_track,
          query.data.instruction_language,
        );
  }, [query.data]);
  return query;
}
