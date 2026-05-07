import { z } from 'zod';

// PATCH /api/user/settings — body wraps a partial Settings object whose
// detailed shape is validated by parseDashboardSettings() merged on top of
// the user's stored settings. The contract schema only enforces that
// `settings` is an object so individual keys can evolve without breaking
// the contract.
export const UserSettingsUpdateRequestSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});
export type UserSettingsUpdateRequest = z.infer<typeof UserSettingsUpdateRequestSchema>;
