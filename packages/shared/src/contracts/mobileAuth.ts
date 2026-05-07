import { z } from 'zod';

export const MobileTokenExchangeRequestSchema = z.object({
  idToken: z.string().min(1),
});
export type MobileTokenExchangeRequest = z.infer<typeof MobileTokenExchangeRequestSchema>;

export const MobileRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type MobileRefreshRequest = z.infer<typeof MobileRefreshRequestSchema>;

export const MobileSignOutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type MobileSignOutRequest = z.infer<typeof MobileSignOutRequestSchema>;

export const MobileAuthUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.email(),
});
export type MobileAuthUser = z.infer<typeof MobileAuthUserSchema>;

export const MobileAuthSuccessSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshTokenExpiresAt: z.iso.datetime(),
  user: MobileAuthUserSchema,
});
export type MobileAuthSuccess = z.infer<typeof MobileAuthSuccessSchema>;
