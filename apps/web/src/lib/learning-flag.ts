// Build-time rollback switch. Does not change or delete persisted learning data.
export const learningExperienceEnabled =
  import.meta.env.VITE_LEARNING_EXPERIENCE !== "false";
