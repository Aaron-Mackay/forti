'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Props {
  coach: { id: string; name: string | null } | null;
  code: string;
  isOwnCode: boolean;
  currentCoach: { id: string; name: string | null } | null;
  pendingRequestToThisCoach: boolean;
  pendingRequestToOtherCoach: { coachName: string } | null;
  alreadyLinked: boolean;
}

export default function CoachLinkConfirmation({
  coach,
  code,
  isOwnCode,
  currentCoach,
  pendingRequestToThisCoach,
  alreadyLinked,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSendRequest() {
    setLoading(true);
    setError(null);
    try {
      // If already confirmed with a different coach, unlink first
      if (currentCoach) {
        const unlinkRes = await fetch('/api/coach/unlink', { method: 'DELETE' });
        if (!unlinkRes.ok) {
          const body = await unlinkRes.json() as { error?: string };
          setError(body.error ?? 'Failed to unlink current coach');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/coach/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to send request');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const coachName = coach?.name ?? 'this coach';

  return (
    <Container maxWidth="sm" sx={{ py: 4, px: 2 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.back()}
        sx={{ mb: 3, textTransform: 'none' }}
        color="inherit"
      >
        Back
      </Button>

      <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
        {/* Success state */}
        {success && (
          <Box textAlign="center" py={2}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 56, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Request sent!
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {coachName} will be notified. Once they accept, you will be linked.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/user/settings')}>
              Go to Settings
            </Button>
          </Box>
        )}

        {/* Invalid code */}
        {!success && !coach && (
          <Box textAlign="center" py={2}>
            <Typography variant="h6" gutterBottom>
              Invalid invite link
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              This coaching link is not valid. Ask your coach to share their current link.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/user')}>
              Go to Home
            </Button>
          </Box>
        )}

        {/* Own code */}
        {!success && coach && isOwnCode && (
          <Box textAlign="center" py={2}>
            <Typography variant="h6" gutterBottom>
              This is your invite code
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Share this link with your clients so they can send you a coaching request.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/user/settings')}>
              Go to Settings
            </Button>
          </Box>
        )}

        {/* Already linked to this coach */}
        {!success && coach && !isOwnCode && alreadyLinked && (
          <Box textAlign="center" py={2}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Already linked
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              You are already linked to {coachName}.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/user')}>
              Go to Home
            </Button>
          </Box>
        )}

        {/* Pending request to this coach */}
        {!success && coach && !isOwnCode && !alreadyLinked && pendingRequestToThisCoach && (
          <Box textAlign="center" py={2}>
            <Typography variant="h6" gutterBottom>
              Request pending
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Your coaching request to {coachName} is waiting for their approval.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/user/settings')}>
              View in Settings
            </Button>
          </Box>
        )}

        {/* Normal invitation state */}
        {!success && coach && !isOwnCode && !alreadyLinked && !pendingRequestToThisCoach && (
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <PersonIcon color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h6" lineHeight={1.2}>
                  {coachName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  has invited you to be their client
                </Typography>
              </Box>
            </Box>

            {currentCoach && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are currently linked to <strong>{currentCoach.name}</strong>. Sending this
                request will unlink them.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              onClick={handleSendRequest}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ mb: 1.5, borderRadius: 2 }}
            >
              {currentCoach ? 'Replace Coach & Send Request' : 'Send Request'}
            </Button>

            <Button
              fullWidth
              variant="text"
              color="inherit"
              onClick={() => router.back()}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
