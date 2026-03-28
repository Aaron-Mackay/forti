'use client';

import React, { useState, Suspense } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter, useSearchParams } from 'next/navigation';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

const TOTAL_STEPS = 3; // steps 0–2, then a done screen at step 3

interface Props {
  userId: string;
  initialName: string;
  initialImage: string | null;
}

function OnboardingWizardInner({ userId, initialName, initialImage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [initialWeight, setInitialWeight] = useState('');
  const [checkInDay, setCheckInDay] = useState(0);
  const [coachCode, setCoachCode] = useState(searchParams.get('coachCode') ?? '');
  const [coachModeActive, setCoachModeActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coachCodeError, setCoachCodeError] = useState<string | null>(null);

  // ── Avatar initials ──────────────────────────────────────────────────────
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  // ── Submission ───────────────────────────────────────────────────────────
  async function handleFinish() {
    setSubmitting(true);
    setCoachCodeError(null);

    try {
      // 1. Update display name if changed
      if (name.trim() && name.trim() !== initialName) {
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
      }

      // 2. Persist settings
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightUnit,
          checkInDay,
          coachModeActive,
          registrationComplete: true,
          onboardingSeenWelcome: true,
          onboardingDismissed: true,
        }),
      });

      // 3. Save initial body weight (today's day metric)
      const parsedWeight = parseFloat(initialWeight);
      if (initialWeight.trim() !== '' && !isNaN(parsedWeight) && parsedWeight > 0) {
        const weightKg = weightUnit === 'lbs' ? parsedWeight * 0.453592 : parsedWeight;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await fetch('/api/dayMetric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            date: today.toISOString(),
            weight: weightKg,
          }),
        });
      }

      // 4. Link with coach (non-blocking: error shown but doesn't prevent completion)
      if (coachCode.trim()) {
        const res = await fetch('/api/coach/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: coachCode.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setCoachCodeError(
            (data as { error?: string }).error ?? 'Invalid coach code. You can add this in Settings later.'
          );
          setSubmitting(false);
          // Go back to the coach step so the user can see the error
          setStep(2);
          return;
        }
      }

      router.push('/user');
    } catch {
      setSubmitting(false);
    }
  }

  // ── Step navigation ──────────────────────────────────────────────────────
  function next() {
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep(s => Math.max(s - 1, 0));
  }

  // ── Progress dots ────────────────────────────────────────────────────────
  function ProgressDots() {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: i === step ? 'primary.main' : 'action.disabled',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </Box>
    );
  }

  // ── Step 0: Profile ──────────────────────────────────────────────────────
  function StepProfile() {
    return (
      <>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Welcome to Forti!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Let&apos;s get your profile set up.
        </Typography>

        {/* Avatar */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={initialImage ?? undefined}
            sx={{ width: 88, height: 88, mb: 1.5, fontSize: '1.75rem' }}
          >
            {!initialImage && initials}
          </Avatar>
          <Tooltip title="Photo upload coming soon" placement="bottom">
            <span>
              <Button variant="outlined" size="small" disabled>
                Change photo
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Name */}
        <TextField
          label="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          autoComplete="name"
          inputProps={{ maxLength: 100 }}
        />
      </>
    );
  }

  // ── Step 1: Stats ────────────────────────────────────────────────────────
  function StepStats() {
    return (
      <>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Your stats
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          We&apos;ll use these to personalise your experience.
        </Typography>

        {/* Weight unit */}
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Weight unit
        </Typography>
        <ToggleButtonGroup
          value={weightUnit}
          exclusive
          onChange={(_, v) => { if (v) setWeightUnit(v); }}
          size="small"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="kg">kg</ToggleButton>
          <ToggleButton value="lbs">lbs</ToggleButton>
        </ToggleButtonGroup>

        {/* Starting weight */}
        <TextField
          label="Starting weight (optional)"
          value={initialWeight}
          onChange={e => setInitialWeight(e.target.value)}
          type="number"
          inputProps={{ min: 0, step: 0.1 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">{weightUnit}</InputAdornment>,
          }}
          fullWidth
          sx={{ mb: 3 }}
        />

        {/* Check-in day */}
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Weekly check-in day
        </Typography>
        <ToggleButtonGroup
          value={checkInDay}
          exclusive
          onChange={(_, v) => { if (v !== null) setCheckInDay(v); }}
          size="small"
          sx={{ width: '100%', gap: 0.5 }}
        >
          {CHECK_IN_DAY_NAMES.map((day, i) => (
            <ToggleButton key={day} value={i} sx={{ flex: 1 }}>
              {day.slice(0, 3)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </>
    );
  }

  // ── Step 2: Coach ────────────────────────────────────────────────────────
  function StepCoach() {
    return (
      <>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Coach setup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Both options are optional — you can always update these in Settings.
        </Typography>

        {/* Coach code */}
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          I have a coach
        </Typography>
        <TextField
          label="Coach invite code"
          value={coachCode}
          onChange={e => {
            setCoachCode(e.target.value);
            setCoachCodeError(null);
          }}
          inputProps={{ maxLength: 6, pattern: '[0-9]*', inputMode: 'numeric' }}
          placeholder="6-digit code"
          fullWidth
          error={!!coachCodeError}
          helperText={coachCodeError ?? 'Ask your coach for their 6-digit invite code'}
          sx={{ mb: 4 }}
        />

        {/* Coach mode */}
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          I&apos;m a coach
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={coachModeActive}
              onChange={e => setCoachModeActive(e.target.checked)}
            />
          }
          label="Enable coach mode"
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Unlocks tools for managing clients and reviewing their check-ins.
        </Typography>
      </>
    );
  }

  // ── Step 3: Done ─────────────────────────────────────────────────────────
  function StepDone() {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <CheckCircleOutlineIcon
          color="success"
          sx={{ fontSize: 72, mb: 2 }}
        />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          You&apos;re all set!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your profile is ready. Let&apos;s get to work.
        </Typography>
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const isDoneStep = step === TOTAL_STEPS;

  return (
    <Box
      sx={{
        minHeight: HEIGHT_EXC_APPBAR,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {!isDoneStep && <ProgressDots />}

        <Box sx={{ mb: 4 }}>
          {step === 0 && <StepProfile />}
          {step === 1 && <StepStats />}
          {step === 2 && <StepCoach />}
          {isDoneStep && <StepDone />}
        </Box>

        {/* Navigation */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isDoneStep ? (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleFinish}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {submitting ? 'Setting up…' : 'Get Started'}
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={next}
                disabled={step === 0 && !name.trim()}
              >
                Next
              </Button>
              {step > 0 && (
                <Button variant="text" size="large" fullWidth onClick={back}>
                  Back
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function OnboardingWizard(props: Props) {
  return (
    <Suspense>
      <OnboardingWizardInner {...props} />
    </Suspense>
  );
}
