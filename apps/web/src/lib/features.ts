// Build-time rollback switch. It does not alter learner data or API behavior.
export const LEARNING_MAP_ENABLED =
  import.meta.env.VITE_LEARNING_MAP_ENABLED !== "false";
