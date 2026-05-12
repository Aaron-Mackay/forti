'use client';

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { useNotifications } from '@lib/providers/NotificationsProvider';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/generated/prisma/browser';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ChatIcon from '@mui/icons-material/Chat';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MenuBookIcon from '@mui/icons-material/MenuBook';

type Props = {
  signalEnabled?: boolean;
};

const palette = signalTokens.surface.calm;

function notificationIcon(type: Notification['type']) {
  switch (type) {
    case 'CheckInSubmitted':
      return <ChecklistIcon />;
    case 'CoachFeedback':
      return <ChatIcon />;
    case 'CoachRequestReceived':
      return <PersonAddIcon />;
    case 'CoachRequestAccepted':
      return <HandshakeIcon />;
    case 'LearningPlanStepDelivered':
      return <MenuBookIcon />;
    default:
      return <NotificationsNoneIcon />;
  }
}

function notificationLabel(type: Notification['type']) {
  switch (type) {
    case 'CheckInSubmitted':
      return 'Check-in';
    case 'CoachFeedback':
      return 'Feedback';
    case 'CoachRequestReceived':
      return 'Coach request';
    case 'CoachRequestAccepted':
      return 'Connection';
    case 'LearningPlanStepDelivered':
      return 'Learning';
    default:
      return 'Inbox';
  }
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function LegacyNotificationsPage() {
  useAppBar({ title: 'Notifications', showBack: true });
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  const handleClick = async (notification: Notification) => {
    if (!notification.readAt) await markRead(notification.id);
    router.push(notification.url);
  };

  return (
    <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
      {unreadCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 1.5 }}>
          <Button size="small" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </Box>
      )}

      {loading && (
        <Box data-signal-notifications-loading sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && notifications.length === 0 && (
        <Box
          data-signal-notifications-empty
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60%',
            gap: 1,
            color: 'text.secondary',
          }}
        >
          <NotificationsNoneIcon sx={{ fontSize: 56 }} />
          <Typography variant="body1">No notifications yet</Typography>
        </Box>
      )}

      {!loading && notifications.length > 0 && (
        <List disablePadding>
          {notifications.map((notification, index) => {
            const unread = !notification.readAt;
            return (
              <Box key={notification.id}>
                <ListItem disablePadding sx={{ bgcolor: unread ? 'action.hover' : 'transparent' }}>
                  <ListItemButton
                    data-signal-notification-row
                    onClick={() => void handleClick(notification)}
                    alignItems="flex-start"
                    sx={{ py: 1.5, gap: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      {notificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={(
                        <Typography variant="body2" fontWeight={unread ? 700 : 400} component="span">
                          {notification.title}
                        </Typography>
                      )}
                      secondary={(
                        <>
                          <Typography component="span" variant="body2" color="text.secondary" display="block">
                            {notification.body}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.disabled">
                            {relativeTime(notification.createdAt)}
                          </Typography>
                        </>
                      )}
                    />
                    {unread && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          mt: 1,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            );
          })}
        </List>
      )}
    </Box>
  );
}

function SignalNotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const readNotifications = notifications.filter((notification) => Boolean(notification.readAt));

  const handleClick = async (notification: Notification) => {
    if (!notification.readAt) await markRead(notification.id);
    router.push(notification.url);
  };

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        minHeight: '100%',
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        padding: '14px 16px 28px',
      }}
    >
      <style>{`
        @media (min-width: 960px) {
          [data-signal-notifications-shell] {
            max-width: 880px;
            margin: 0 auto;
          }

          [data-signal-notifications-summary] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>

      <div data-signal-notifications-shell>
        <section
          style={{
            background: palette.surface,
            border: `1px solid ${palette.borderStrong}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '20px 20px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 11,
                  color: signalTokens.signal.deep,
                  marginBottom: 6,
                }}
              >
                Notifications
              </div>
              <div
                style={{
                  fontFamily: signalTokens.fontVar.cond,
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                Your inbox
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: palette.inkMid,
                  lineHeight: 1.5,
                  maxWidth: 540,
                }}
              >
                Coach feedback, check-in alerts, connection updates, and learning-plan drops all land here.
              </div>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 40,
                  padding: '0 14px',
                  borderRadius: signalTokens.radii.card,
                  border: `1px solid ${palette.border}`,
                  background: palette.surfaceAlt,
                  color: palette.ink,
                  fontFamily: signalTokens.fontVar.body,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div
            data-signal-notifications-summary
            style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            <SignalSummaryCell
              label="Unread"
              value={String(unreadCount)}
              detail={unreadCount > 0 ? 'New items still need a pass.' : 'Everything has been cleared.'}
            />
            <SignalSummaryCell
              label="History"
              value={String(readNotifications.length)}
              detail={readNotifications.length > 0 ? 'Recent reads stay visible below.' : 'Read history will build here.'}
            />
            <SignalSummaryCell
              label="Total"
              value={String(notifications.length)}
              detail={notifications.length > 0 ? 'Latest items are sorted first.' : 'No alerts have arrived yet.'}
            />
          </div>
        </section>

        {loading ? (
          <section
            data-signal-notifications-loading
            style={{
              marginTop: 16,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '22px 18px 20px',
              background: palette.surfaceAlt,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <CircularProgress size={24} />
              <div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                  Inbox
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 6 }}>
                  Checking for new activity
                </div>
                <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
                  Pulling your latest coaching updates and reminders.
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <section
            data-signal-notifications-empty
            style={{
              marginTop: 16,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '22px 18px 20px',
              background: palette.surfaceAlt,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                marginBottom: 16,
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 22, color: palette.inkMid }} />
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
              Inbox
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 8 }}>
              No notifications yet
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.6, maxWidth: 520 }}>
              New coaching activity, check-in updates, and learning-plan deliveries will show up here as they happen.
            </div>
          </section>
        ) : null}

        {!loading && unreadNotifications.length > 0 ? (
          <SignalNotificationSection
            eyebrow="Unread"
            title="Needs a quick pass"
            notifications={unreadNotifications}
            onOpen={handleClick}
          />
        ) : null}

        {!loading && readNotifications.length > 0 ? (
          <SignalNotificationSection
            eyebrow="Earlier"
            title="Already reviewed"
            notifications={readNotifications}
            onOpen={handleClick}
          />
        ) : null}
      </div>
    </div>
  );
}

function SignalSummaryCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 12px 11px',
        background: palette.surfaceAlt,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.4 }}>
        {detail}
      </div>
    </div>
  );
}

function SignalNotificationSection({
  eyebrow,
  title,
  notifications,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  notifications: Notification[];
  onOpen: (notification: Notification) => Promise<void>;
}) {
  return (
    <section
      style={{
        marginTop: 16,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 16px 16px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {notifications.map((notification) => (
          <SignalNotificationRow
            key={notification.id}
            notification={notification}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function SignalNotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => Promise<void>;
}) {
  const unread = !notification.readAt;

  return (
    <button
      type="button"
      data-signal-notification-row
      onClick={() => void onOpen(notification)}
      style={{
        textAlign: 'left',
        width: '100%',
        border: `1px solid ${unread ? palette.borderStrong : palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: unread ? palette.surfaceAlt : palette.bg,
        padding: '14px 14px 13px',
        cursor: 'pointer',
        color: palette.ink,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: signalTokens.radii.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            color: unread ? signalTokens.signal.deep : palette.inkMid,
            flexShrink: 0,
          }}
        >
          {notificationIcon(notification.type)}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: unread ? signalTokens.signal.deep : palette.inkLight, marginBottom: 5 }}>
                {notificationLabel(notification.type)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
                {notification.title}
              </div>
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, flexShrink: 0, paddingTop: 1 }}>
              {relativeTime(notification.createdAt)}
            </div>
          </div>

          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
            {notification.body}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 28,
                padding: '0 10px',
                borderRadius: 999,
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                color: unread ? signalTokens.signal.deep : palette.inkMid,
                background: unread ? signalTokens.signal.dim : palette.surface,
                border: `1px solid ${palette.border}`,
              }}
            >
              {unread ? 'Unread' : 'Read'}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                color: unread ? signalTokens.signal.deep : palette.inkLight,
              }}
            >
              {unread ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: signalTokens.signal.base,
                    boxShadow: `0 0 0 3px ${signalTokens.signal.dim}`,
                  }}
                />
              ) : null}
              Open
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function NotificationsClient({ signalEnabled = false }: Props) {
  if (signalEnabled) {
    return <SignalNotificationsPage />;
  }

  return <LegacyNotificationsPage />;
}
