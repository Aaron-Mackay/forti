'use client';

import {useState} from 'react';
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
  Typography,
} from '@mui/material';
import {EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, ExerciseEquipment, ExerciseMuscle} from '@/types/dataTypes';
import MuscleHighlight from '@/components/MuscleHighlight';

interface AddExerciseFormProps {
  open: boolean;
  onClose: () => void;
  onExerciseAdded?: () => void;
  existingCategories: string[];
}

export function AddExerciseForm({open, onClose, onExerciseAdded, existingCategories}: AddExerciseFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState<ExerciseEquipment[]>([]);
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setName('');
    setCategory(null);
    setDescription('');
    setEquipment([]);
    setMuscles([]);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: name.trim(),
          category: category || null,
          description: description.trim() || null,
          equipment,
          muscles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setError('An exercise with this name and category already exists');
        } else {
          setError(errorData.error || 'Failed to add exercise');
        }
        return;
      }

      handleClose();
      if (onExerciseAdded) onExerciseAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && equipment.length > 0 && muscles.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
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

            <Autocomplete
              freeSolo
              options={existingCategories}
              value={category ?? ''}
              onInputChange={(_e, val) => setCategory(val || null)}
              renderInput={params => <TextField {...params} label="Category" placeholder="e.g., Chest"/>}
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

            <Box>
              <Typography variant="body2" color={equipment.length === 0 ? 'error' : 'text.secondary'} sx={{mb: 1}}>
                Equipment (required)
              </Typography>
              <Autocomplete
                multiple
                options={[...EXERCISE_EQUIPMENT]}
                value={equipment}
                onChange={(_e, val: ExerciseEquipment[]) => setEquipment(val)}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder={equipment.length === 0 ? 'Select equipment...' : ''}
                    error={equipment.length === 0}
                    helperText={equipment.length === 0 ? 'Select at least one' : undefined}
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="body2" color={muscles.length === 0 ? 'error' : 'text.secondary'} sx={{mb: 1}}>
                Muscles (required)
              </Typography>
              <Autocomplete
                multiple
                options={[...EXERCISE_MUSCLES]}
                value={muscles}
                onChange={(_e, val: ExerciseMuscle[]) => setMuscles(val)}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder={muscles.length === 0 ? 'Select muscles...' : ''}
                    error={muscles.length === 0}
                    helperText={muscles.length === 0 ? 'Select at least one' : undefined}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Right column — live anatomy preview */}
          <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
              Muscles preview
            </Typography>
            <Box sx={{flex: 1, width: '100%', minHeight: 200}}>
              {/* exerciseId={0} is safe here: the dialog is modal so only one
                  anatomy-0 scope exists on the page at a time */}
              <MuscleHighlight muscles={muscles} exerciseId={0}/>
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
