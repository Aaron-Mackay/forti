'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CancelIcon from '@mui/icons-material/Cancel';

interface CoachInfo {
  coachCode: string | null;
  coachModeActive: boolean;
  currentCoach: { id: string; name: string } | null;
  sentRequest: { id: number; status: 'Pending' | 'Rejected'; coach: { id: string; name: string } } | null;
  pendingRequests: { id: number; client: { id: string; name: string } }[];
  confirmedClients: { id: string; name: string }[];
}

export default function CoachingSettings() {
  const { updateSetting } = useSettings();
  const [info, setInfo] = useState<CoachInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // tracks which action is in-flight
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/coach');
      if (!res.ok) throw new Error('Failed to load coaching info');
      const data = await res.json() as CoachInfo;
      setInfo(data);
    } catch {
      setFetchError('Could not load coaching information');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doAction(key: string, fn: () => Promise<Response>, errorPrefix: string) {
    setBusy(key);
    setActionError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setActionError(body.error ?? errorPrefix);
      } else {
        await load();
      }
    } catch {
      setActionError(errorPrefix);
    } finally {
      setBusy(null);
    }
  }

  function handleLink() {
    const code = codeInput.trim();
    if (!/^\d{6}$/.test(code)) {
      setActionError('Please enter a valid 6-digit code');
      return;
    }
    doAction('link', () => fetch('/api/coach/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }), 'Failed to send request');
    setCodeInput('');
  }

  function handleCancelRequest() {
    doAction('cancel', () => fetch('/api/coach/request', { method: 'DELETE' }), 'Failed to cancel request');
  }

  function handleUnlink() {
    doAction('unlink', () => fetch('/api/coach/unlink', { method: 'DELETE' }), 'Failed to unlink coach');
  }

  function handleAccept(requestId: number) {
    doAction(`accept-${requestId}`, () => fetch(`/api/coach/request/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    }), 'Failed to accept request');
  }

  function handleReject(requestId: number) {
    doAction(`reject-${requestId}`, () => fetch(`/api/coach/request/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }), 'Failed to reject request');
  }

  function handleRemoveClient(clientId: string) {
    doAction(`remove-${clientId}`, () => fetch(`/api/coach/clients/${clientId}`, { method: 'DELETE' }), 'Failed to remove client');
  }

  async function handleToggleCoachMode(active: boolean) {
    setBusy('coach-mode');
    setActionError(null);
    try {
      const res = await fetch('/api/coach/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setActionError(body.error ?? 'Failed to update coach mode');
      } else {
        // Update SettingsProvider so the sidebar reflects the change immediately
        updateSetting('coachModeActive', active);
        await load();
      }
    } catch {
      setActionError('Failed to update coach mode');
    } finally {
      setBusy(null);
    }
  }

  function handleCopyCode() {
    if (!info?.coachCode) return;
    navigator.clipboard.writeText(info.coachCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyLink() {
    if (!info?.coachCode) return;
    const link = `${window.location.origin}/coach/${info.coachCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function handleSendInvite() {
    const email = inviteEmail.trim();
    setBusy('invite');
    setActionError(null);
    try {
      const res = await fetch('/api/coach/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setActionError(body.error ?? 'Failed to send invite');
      } else {
        setInviteEmail('');
        setInviteSent(email);
        setTimeout(() => setInviteSent(null), 3000);
      }
    } catch {
      setActionError('Failed to send invite');
    } finally {
      setBusy(null);
    }
  }

  if (fetchError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>{fetchError}</Alert>
    );
  }

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* ── Your Coach ─────────────────────────────────── */}
      <Typography variant="overline" color="text.secondary">Your Coach</Typography>

      {!info ? (
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="rounded" height={56} />
        </Box>
      ) : info.currentCoach ? (
        // Confirmed coach
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'success.main',
            borderRadius: 1,
            px: 2,
            py: 1.5,
            mb: 2,
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleOutlineIcon color="success" fontSize="small" />
            <Typography variant="body2">
              Coach: <strong>{info.currentCoach.name}</strong>
            </Typography>
          </Box>
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={busy === 'unlink'}
            onClick={handleUnlink}
            startIcon={busy === 'unlink' ? <CircularProgress size={14} /> : undefined}
          >
            Unlink
          </Button>
        </Box>
      ) : info.sentRequest?.status === 'Pending' ? (
        // Pending request
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'warning.main',
            borderRadius: 1,
            px: 2,
            py: 1.5,
            mb: 2,
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HourglassTopIcon color="warning" fontSize="small" />
            <Typography variant="body2">
              Pending: <strong>{info.sentRequest.coach.name}</strong>
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            variant="outlined"
            disabled={busy === 'cancel'}
            onClick={handleCancelRequest}
            startIcon={busy === 'cancel' ? <CircularProgress size={14} /> : undefined}
          >
            Cancel
          </Button>
        </Box>
      ) : info.sentRequest?.status === 'Rejected' ? (
        // Rejected request
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'error.main',
            borderRadius: 1,
            px: 2,
            py: 1.5,
            mb: 2,
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CancelIcon color="error" fontSize="small" />
            <Typography variant="body2">
              Request declined by <strong>{info.sentRequest.coach.name}</strong>
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            variant="outlined"
            disabled={busy === 'cancel'}
            onClick={handleCancelRequest}
            startIcon={busy === 'cancel' ? <CircularProgress size={14} /> : undefined}
          >
            Dismiss
          </Button>
        </Box>
      ) : (
        // No coach — show input
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Enter coach code"
            value={codeInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCodeInput(val);
            }}
            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            size="small"
            sx={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLink(); }}
          />
          <Button
            variant="contained"
            onClick={handleLink}
            disabled={busy === 'link' || codeInput.length !== 6}
            startIcon={busy === 'link' ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ whiteSpace: 'nowrap', height: 40 }}
          >
            Link
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Coach Mode ─────────────────────────────────── */}
      <Typography variant="overline" color="text.secondary">Coaching</Typography>

      {!info ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
          <Typography variant="body1">Enable coach features</Typography>
          <Skeleton variant="rounded" width={52} height={32} />
        </Box>
      ) : (
        <FormControlLabel
          control={
            <Switch
              checked={info.coachModeActive}
              onChange={(e) => handleToggleCoachMode(e.target.checked)}
              disabled={busy === 'coach-mode'}
            />
          }
          label="Enable coach features"
          labelPlacement="start"
          sx={{ width: '100%', mx: 0, justifyContent: 'space-between' }}
        />
      )}

      {info?.coachModeActive && (
        <Box sx={{ mt: 2 }}>
          {/* Invite code display */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Share this code with your clients:
          </Typography>
          <TextField
            value={info.coachCode ?? ''}
            size="small"
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.3em' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                      <IconButton onClick={handleCopyCode} edge="end" size="small">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1.5, maxWidth: 200 }}
          />

          {/* Shareable link */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Or share this link:
          </Typography>
          <TextField
            value={info.coachCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/coach/${info.coachCode}` : ''}
            size="small"
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'}>
                      <IconButton onClick={handleCopyLink} edge="end" size="small">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3, maxWidth: 360 }}
          />

          {/* Invite by email */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Invite by email:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'flex-start' }}>
            <TextField
              label="Client's email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
            />
            <Button
              variant="contained"
              onClick={handleSendInvite}
              disabled={busy === 'invite' || !inviteEmail.trim()}
              startIcon={busy === 'invite' ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ whiteSpace: 'nowrap', height: 40 }}
            >
              Send
            </Button>
          </Box>
          {inviteSent && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Invite sent to {inviteSent}
            </Alert>
          )}

          {/* Pending requests */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Pending Requests
          </Typography>
          {info.pendingRequests.length === 0 ? (
            <Typography variant="body2" sx={{ mb: 2, pl: 1 }}>No pending requests.</Typography>
          ) : (
            <List disablePadding sx={{ mb: 2 }}>
              {info.pendingRequests.map((req, i) => (
                <React.Fragment key={req.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    sx={{ py: 1, gap: 1 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1, pr: 0 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={!!busy}
                          onClick={() => handleAccept(req.id)}
                          startIcon={busy === `accept-${req.id}` ? <CircularProgress size={12} color="inherit" /> : undefined}
                        >
                          Accept
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={!!busy}
                          onClick={() => handleReject(req.id)}
                          startIcon={busy === `reject-${req.id}` ? <CircularProgress size={12} color="inherit" /> : undefined}
                        >
                          Reject
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemText primary={req.client.name} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Confirmed clients */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Confirmed Clients
          </Typography>
          {info.confirmedClients.length === 0 ? (
            <Typography variant="body2" sx={{ pl: 1 }}>No confirmed clients.</Typography>
          ) : (
            <List disablePadding>
              {info.confirmedClients.map((client, i) => (
                <React.Fragment key={client.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    sx={{ py: 1 }}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={!!busy}
                        onClick={() => handleRemoveClient(client.id)}
                        startIcon={busy === `remove-${client.id}` ? <CircularProgress size={12} color="inherit" /> : undefined}
                      >
                        Remove
                      </Button>
                    }
                  >
                    <ListItemText primary={client.name} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
}
