-- Performance indexes from 2026-05-05 backend review.
--
-- Notification(userId, type, readAt): coach unread-by-type badges currently
--   filter on (userId, type, readAt) but only (userId, readAt) is indexed.
-- Exercise(createdByUserId, name): per-user exercise lookups will get
--   pagination + name search; this covers both filters.

CREATE INDEX "Notification_userId_type_readAt_idx" ON "Notification"("userId", "type", "readAt");
CREATE INDEX "Exercise_createdByUserId_name_idx" ON "Exercise"("createdByUserId", "name");
