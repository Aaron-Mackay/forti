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
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { useNotifications } from '@lib/hooks/api/useNotifications';
import { useRouter } from 'next/navigation';
import type { Notification } from '@prisma/client';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ChatIcon from '@mui/icons-material/Chat';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HandshakeIcon from '@mui/icons-material/Handshake';

function notificationIcon(type: Notification['type']) {
  switch (type) {
    case 'CheckInSubmitted': return <ChecklistIcon />;
    case 'CoachFeedback': return <ChatIcon />;
    case 'CoachRequestReceived': return <PersonAddIcon />;
    case 'CoachRequestAccepted': return <HandshakeIcon />;
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

export default function NotificationsPage() {
  useAppBar({ title: 'Notifications', showBack: true });
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  const handleClick = async (n: Notification) => {
    if (!n.readAt) await markRead(n.id);
    router.push(n.url);
  };

  return (
    <>
      <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        {unreadCount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 1.5 }}>
            <Button size="small" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && notifications.length === 0 && (
          <Box
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
            {notifications.map((n, i) => {
              const unread = !n.readAt;
              return (
                <Box key={n.id}>
                  <ListItem
                    disablePadding
                    sx={{ bgcolor: unread ? 'action.hover' : 'transparent' }}
                  >
                    <ListItemButton
                      onClick={() => void handleClick(n)}
                      alignItems="flex-start"
                      sx={{ py: 1.5, gap: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                        {notificationIcon(n.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={unread ? 700 : 400}
                            component="span"
                          >
                            {n.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              display="block"
                            >
                              {n.body}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.disabled"
                            >
                              {relativeTime(n.createdAt)}
                            </Typography>
                          </>
                        }
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
                  {i < notifications.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </>
  );
}
