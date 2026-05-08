import { z } from 'zod';
import { NotificationType } from '@/generated/prisma/browser';

export const NotificationResponseSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  url: z.string(),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

export const NotificationsListResponseSchema = z.object({
  notifications: z.array(NotificationResponseSchema),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationsListResponse = z.infer<typeof NotificationsListResponseSchema>;

export const NotificationMutationResponseSchema = z.object({
  ok: z.literal(true),
});
export type NotificationMutationResponse = z.infer<typeof NotificationMutationResponseSchema>;
