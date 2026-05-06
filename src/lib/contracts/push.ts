import { z } from 'zod';

// POST /api/push/subscribe
export const PushSubscribeRequestSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscribeRequest = z.infer<typeof PushSubscribeRequestSchema>;

// DELETE /api/push/subscribe
export const PushUnsubscribeRequestSchema = z.object({
  endpoint: z.string().min(1),
});
export type PushUnsubscribeRequest = z.infer<typeof PushUnsubscribeRequestSchema>;
