'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

const FEEDBACK_TYPES = ['Bug Report', 'Feature Request', 'Improvement Suggestion'] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

const palette = signalTokens.surface.planning;

function LegacyFeedbackForm() {
  useAppBar({ title: 'Feedback' });
  const [type, setType] = useState<FeedbackType>('Bug Report');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('description', description);
      if (screenshot) formData.append('screenshot', screenshot);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to send feedback');

      setMessage('✅ Feedback submitted successfully!');
      setType('Bug Report');
      setDescription('');
      setScreenshot(null);
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 500,
        mx: 'auto',
        mt: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
      }}
    >
      <Typography variant="h5">Send Feedback</Typography>

      <FormControl fullWidth>
        <InputLabel id="feedback-type-label">Type</InputLabel>
        <Select
          labelId="feedback-type-label"
          value={type}
          label="Type"
          onChange={(e) => setType(e.target.value as FeedbackType)}
        >
          {FEEDBACK_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Description"
        multiline
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <Button variant="outlined" component="label">
        {screenshot ? screenshot.name : 'Upload Screenshot'}
        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
      </Button>

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : undefined}
      >
        {loading ? 'Sending...' : 'Submit Feedback'}
      </Button>

      {message && (
        <Typography color={message.startsWith('✅') ? 'green' : 'red'}>
          {message}
        </Typography>
      )}
    </Box>
  );
}

function SignalFeedbackForm() {
  const [type, setType] = useState<FeedbackType>('Bug Report');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('description', description);
      if (screenshot) formData.append('screenshot', screenshot);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to send feedback');

      setMessage('Feedback submitted successfully.');
      setType('Bug Report');
      setDescription('');
      setScreenshot(null);
    } catch (err) {
      console.error(err);
      setMessage('Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px 16px 16px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
          Feedback type
        </div>
        <FormControl fullWidth>
          <InputLabel id="signal-feedback-type-label">Type</InputLabel>
          <Select
            labelId="signal-feedback-type-label"
            value={type}
            label="Type"
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            {FEEDBACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </section>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px 16px 16px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
          Details
        </div>
        <TextField
          label="Description"
          multiline
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
        />
        <Typography variant="body2" sx={{ color: palette.inkMid, mt: 1.25 }}>
          Include what you expected, what happened, and anything that made it worse.
        </Typography>
      </section>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px 16px 16px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
          Screenshot
        </div>
        <Button variant="outlined" component="label" fullWidth>
          {screenshot ? screenshot.name : 'Upload screenshot'}
          <input type="file" hidden accept="image/*" onChange={handleFileChange} />
        </Button>
      </section>

      <section
        style={{
          background: palette.surfaceAlt,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px 16px 16px',
        }}
      >
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
          fullWidth
        >
          {loading ? 'Sending...' : 'Submit feedback'}
        </Button>

        {message && (
          <Typography
            sx={{
              mt: 1.5,
              fontSize: 14,
              color: message.startsWith('Feedback submitted') ? palette.ink : 'error.main',
            }}
          >
            {message}
          </Typography>
        )}
      </section>
    </form>
  );
}

export default function FeedbackClient({ signalEnabled = false }: { signalEnabled?: boolean }) {
  if (signalEnabled) {
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
            [data-signal-feedback-shell] {
              max-width: 760px;
              margin: 0 auto;
            }
          }
        `}</style>

        <div data-signal-feedback-shell>
          <section
            style={{
              background: palette.surface,
              border: `1px solid ${palette.borderStrong}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '20px 20px 18px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
              Feedback
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
              Tell us what broke
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 620 }}>
              Bug reports, feature requests, and rough edges all go here. Add a screenshot if it helps us reproduce the issue faster.
            </div>
          </section>

          <SignalFeedbackForm />
        </div>
      </div>
    );
  }

  return <LegacyFeedbackForm />;
}
