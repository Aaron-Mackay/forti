'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { useNewPlan } from './useNewPlan';
import { PLACEHOLDER_ID } from './PlanBuilderWithContext';
import type { ParsedPlan } from '@/utils/aiPlanParser';
import type { PlanPrisma, WeekPrisma, WorkoutPrisma, WorkoutExercisePrisma, SetPrisma } from '@/types/dataTypes';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert the AI API response (ParsedPlan) into a PlanPrisma shape with
 * placeholder IDs that the WorkoutEditorContext can manage before saving.
 */
function parsedPlanToPlanPrisma(parsed: ParsedPlan, currentPlan: PlanPrisma): PlanPrisma {
  let idCounter = 0;
  const nextId = () => -(++idCounter);

  return {
    id: PLACEHOLDER_ID,
    userId: currentPlan.userId,
    name: parsed.name,
    description: parsed.description ?? null,
    order: currentPlan.order,
    weeks: parsed.weeks.map((week): WeekPrisma => {
      const weekId = nextId();
      return {
        id: weekId,
        planId: PLACEHOLDER_ID,
        order: week.order,
        workouts: week.workouts.map((workout): WorkoutPrisma => {
          const workoutId = nextId();
          return {
            id: workoutId,
            weekId,
            name: workout.name,
            notes: workout.notes ?? null,
            order: workout.order,
            dateCompleted: null,
            exercises: workout.exercises.map((ex): WorkoutExercisePrisma => {
              const exerciseId = nextId();
              return {
                id: exerciseId,
                workoutId,
                exerciseId: PLACEHOLDER_ID,
                order: ex.order,
                repRange: ex.repRange ?? null,
                restTime: ex.restTime ?? null,
                notes: ex.notes ?? null,
                exercise: {
                  id: PLACEHOLDER_ID,
                  name: ex.exercise.name,
                  category: ex.exercise.category,
                  description: null,
                  equipment: []
                },
                sets: ex.sets.map((set): SetPrisma => ({
                  id: nextId(),
                  workoutExerciseId: exerciseId,
                  order: set.order,
                  weight: set.weight ?? null,
                  reps: set.reps ?? null,
                })),
              };
            }),
          };
        }),
      };
    }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AiImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the imported week count so the parent can sync its UI state. */
  onImportSuccess: (weekCount: string) => void;
}

export function AiImportDialog({ open, onClose, onImportSuccess }: AiImportDialogProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { dispatch } = useWorkoutEditorContext();
  const { statePlan } = useNewPlan();

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const data: { plan?: ParsedPlan; error?: string } = await res.json();

      if (!res.ok || !data.plan) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const planPrisma = parsedPlanToPlanPrisma(data.plan, statePlan);
      dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: planPrisma });

      setInput('');
      onClose();
      onImportSuccess(planPrisma.weeks.length.toString());
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Plan with AI</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste your workout plan in any format — plain text, spreadsheet paste, or CSV. AI will
          parse it into a structured plan for you to review and edit.
        </Typography>
        <TextField
          multiline
          rows={8}
          fullWidth
          placeholder={
            'e.g. Push Day: Bench Press 3x8 @ 80kg, OHP 3x10, Tricep pushdown 3x12\n' +
            'Pull Day: Barbell Row 3x8, Lat pulldown 3x10, Face pulls 3x15\n' +
            'Legs: Squat 3x5 @ 100kg, RDL 3x10, Leg press 3x15'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          slotProps={{ htmlInput: { 'aria-label': 'Workout plan text' } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Box>
              <Typography variant="body2">{error}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
                You can still build the plan manually using the form.
              </Typography>
            </Box>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={loading || !input.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
        >
          {loading ? 'Importing…' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
