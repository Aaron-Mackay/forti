import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserProfileUpdateRequestSchema = z.object({
  name: z.string().min(1).max(100),
});
export type UserProfileUpdateRequest = z.infer<typeof UserProfileUpdateRequestSchema>;
