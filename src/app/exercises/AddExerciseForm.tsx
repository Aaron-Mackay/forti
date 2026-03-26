'use client';

import {useState, useEffect} from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import {EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, ExerciseEquipment, ExerciseMuscle} from '@/types/dataTypes';
import MuscleHighlight from '@/components/MuscleHighlight';
import {Exercise} from '@prisma/client';

interface AddExerciseFormProps {
  open: boolean;
  onClose: () => void;
  onExerciseAdded?: (exercise: Exercise) => void;
  initialName?: string;
}

export function AddExerciseForm({open, onClose, onExerciseAdded, initialName}: AddExerciseFormProps) {
  const [name, setName] = useState(initialName ?? '');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState<ExerciseEquipment[]>([]);
  const [primaryMuscles, setPrimaryMuscles] = useState<ExerciseMuscle[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<ExerciseMuscle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedEquipment, setTouchedEquipment] = useState(false);
  const [touchedPrimaryMuscles, setTouchedPrimaryMuscles] = useState(false);

  // Sync name when initialName changes (e.g. dialog reopens with different pre-fill)
  useEffect(() => {
    if (open) setName(initialName ?? '');
  }, [open, initialName]);

  const handleClose = () => {
    if (loading) return;
    setName('');
    setDescription('');
    setEquipment([]);
    setPrimaryMuscles([]);
    setSecondaryMuscles([]);
    setError(null);
    setTouchedEquipment(false);
    setTouchedPrimaryMuscles(false);
    onClose();
  };

  const handleSubmit = async () => {
    setTouchedEquipment(true);
    setTouchedPrimaryMuscles(true);
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: name.trim(),
          category: null,
          description: description.trim() || null,
          equipment,
          primaryMuscles,
          secondaryMuscles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setError('An exercise with this name already exists');
        } else {
          setError(errorData.error || 'Failed to add exercise');
        }
        return;
      }

      const createdExercise: Exercise = await response.json();
      handleClose();
      if (onExerciseAdded) onExerciseAdded(createdExercise);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && equipment.length > 0 && primaryMuscles.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth sx={{ zIndex: 1510 }}>
      <DialogTitle>Add New Exercise</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{mb: 2, mt: 1}}>{error}</Alert>}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
            gap: 3,
            mt: 1,
          }}
        >
          {/* Left column — form fields */}
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            <TextField
              label="Exercise Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              fullWidth
              autoComplete="off"
              placeholder="e.g., Barbell Bench Press"
            />

            <TextField
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Optional: brief description or form cues"
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={[...EXERCISE_EQUIPMENT]}
              value={equipment}
              onChange={(_e, val: ExerciseEquipment[]) => setEquipment(val)}
              onBlur={() => setTouchedEquipment(true)}
              slotProps={{ popper: { style: { zIndex: 1520 } } }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Equipment (required)"
                  placeholder={equipment.length === 0 ? 'Select equipment...' : ''}
                  error={touchedEquipment && equipment.length === 0}
                  helperText={touchedEquipment && equipment.length === 0 ? 'Select at least one' : undefined}
                />
              )}
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={[...EXERCISE_MUSCLES]}
              value={primaryMuscles}
              onChange={(_e, val: ExerciseMuscle[]) => setPrimaryMuscles(val)}
              onBlur={() => setTouchedPrimaryMuscles(true)}
              slotProps={{ popper: { style: { zIndex: 1520 } } }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Primary Muscles (required)"
                  placeholder={primaryMuscles.length === 0 ? 'Select primary muscles...' : ''}
                  error={touchedPrimaryMuscles && primaryMuscles.length === 0}
                  helperText={touchedPrimaryMuscles && primaryMuscles.length === 0 ? 'Select at least one' : undefined}
                />
              )}
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={[...EXERCISE_MUSCLES]}
              value={secondaryMuscles}
              onChange={(_e, val: ExerciseMuscle[]) => setSecondaryMuscles(val)}
              slotProps={{ popper: { style: { zIndex: 1520 } } }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Secondary Muscles (optional)"
                  placeholder={secondaryMuscles.length === 0 ? 'Select secondary muscles...' : ''}
                />
              )}
            />
          </Box>

          {/* Right column — live anatomy preview */}
          <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Box sx={{flex: 1, width: '100%', minHeight: 200}}>
              {/* exerciseId={0} is safe here: the dialog is modal so only one
                  anatomy-0 scope exists on the page at a time */}
              <MuscleHighlight primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} exerciseId={0} alwaysShow/>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !canSubmit}
          startIcon={loading ? <CircularProgress size={16} color="inherit"/> : null}
        >
          {loading ? 'Adding...' : 'Add Exercise'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
