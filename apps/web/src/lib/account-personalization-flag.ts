/**
 * Account personalization is opt-in until the rollback window closes.
 * Keep it off by default: `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true` enables
 * remote preferences, uploaded avatars, and the new profile panel.
 */
export const accountPersonalizationEnabled = import.meta.env.VITE_ACCOUNT_PERSONALIZATION_ENABLED === 'true';
