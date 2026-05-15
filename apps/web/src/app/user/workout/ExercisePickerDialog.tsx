'use client';

import {useEffect, useState} from 'react';
import {useExerciseList} from '@lib/hooks/api/useExerciseList';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {Exercise} from '@/generated/prisma/browser';
import {AddExerciseForm} from '@/app/exercises/AddExerciseForm';
import {Overlay} from '@/components/signal/overlay';

const MUSCLE_ALIASES: Record<string, string[]> = {
  chest:      ['pec'],
  pecs:       ['pec'],
  shoulder:   ['delt'],
  shoulders:  ['delt'],
  delts:      ['delt'],
  back:       ['lats', 'lower-back', 'trap'],
  lats:       ['lats'],
  traps:      ['trap'],
  leg:        ['quads', 'ham', 'calves', 'glutes', 'adductors'],
  legs:       ['quads', 'ham', 'calves', 'glutes', 'adductors'],
  lower:      ['quads', 'ham', 'calves', 'glutes'],
  quad:       ['quads'],
  quads:      ['quads'],
  hamstring:  ['ham'],
  hamstrings: ['ham'],
  ham:        ['ham'],
  glute:      ['glutes'],
  glutes:     ['glutes'],
  calf:       ['calves'],
  calves:     ['calves'],
  arm:        ['biceps', 'triceps', 'forearms'],
  arms:       ['biceps', 'triceps', 'forearms'],
  bicep:      ['biceps'],
  tricep:     ['triceps'],
  core:       ['abs', 'obliques'],
  abs:        ['abs'],
};

function matchesMuscle(muscle: string, term: string): boolean {
  if (muscle.includes(term)) return true;
  return (MUSCLE_ALIASES[term] ?? []).some(alias => muscle.includes(alias));
}

function exerciseMatchesSearch(ex: Exercise, search: string): boolean {
  const term = search.toLowerCase().trim();
  if (!term) return true;
  if (ex.name.toLowerCase().includes(term)) return true;
  const muscles = [...(ex.primaryMuscles ?? []), ...(ex.secondaryMuscles ?? [])];
  return muscles.some(m => matchesMuscle(m, term));
}

interface ExercisePickerDialogProps {
  open: boolean;
  title: string;
  defaultCategory?: string;
  excludeExerciseId?: number;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExercisePickerDialog({
  open,
  title,
  defaultCategory,
  excludeExerciseId,
  onClose,
  onSelect,
}: ExercisePickerDialogProps) {
  const {exercises, loading, addExercise} = useExerciseList(open);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory ?? 'resistance');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setCategory(defaultCategory ?? 'resistance');
    }
  }, [open, defaultCategory]);

  const filtered = exercises.filter(ex => {
    const matchesCategory = ex.category === category;
    const matchesSearch = exerciseMatchesSearch(ex, search);
    const notExcluded = excludeExerciseId == null || ex.id !== excludeExerciseId;
    return matchesCategory && matchesSearch && notExcluded;
  });

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      height="tall"
    >
      <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320, pt: 1}}>
        <Box sx={{pb: 1}}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            inputProps={{'aria-label': 'Search exercises'}}
          />
          {!defaultCategory && (
            <ToggleButtonGroup
              exclusive
              value={category}
              onChange={(_e, val) => { if (val) setCategory(val); }}
              size="small"
              sx={{mt: 1}}
            >
              <ToggleButton value="resistance">Resistance</ToggleButton>
              <ToggleButton value="cardio">Cardio</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
        <Divider />
        <Box sx={{flex: 1, overflowY: 'auto', minHeight: 0, mx: -2.75}}>
          {!loading && typeof navigator !== 'undefined' && !navigator.onLine && exercises.length === 0 && (
            <Alert severity="info" sx={{m: 2}}>
              Offline and no cached exercise library yet. Go online once to load exercises for offline use.
            </Alert>
          )}
          {loading ? (
            <Box sx={{display: 'flex', justifyContent: 'center', p: 3}}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <List disablePadding>
              {filtered.map(ex => (
                <ListItemButton
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  divider
                >
                  <ListItemText primary={ex.name} />
                </ListItemButton>
              ))}
              {filtered.length === 0 && !loading && search.trim().length === 0 && (
                <ListItemText
                  primary="No exercises found"
                  sx={{px: 2, py: 2, color: 'text.secondary'}}
                />
              )}
              {!loading && search.trim().length > 0 && !exercises.some(e => e.name.toLowerCase() === search.toLowerCase()) && (
                <ListItemButton onClick={() => setCreateOpen(true)} divider>
                  <ListItemText
                    primary={<em>+ Create &quot;{search}&quot;</em>}
                    sx={{color: 'primary.main'}}
                  />
                </ListItemButton>
              )}
            </List>
          )}
        </Box>
      </Box>
      <AddExerciseForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialName={search}
        onExerciseAdded={(newExercise) => {
          addExercise(newExercise);
          setCreateOpen(false);
          onSelect(newExercise);
        }}
      />
    </Overlay>
  );
}
