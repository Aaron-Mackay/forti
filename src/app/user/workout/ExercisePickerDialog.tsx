'use client';

import {useEffect, useState} from 'react';
import {useExerciseList} from '@lib/hooks/api/useExerciseList';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {Exercise} from '@prisma/client';
import {AddExerciseForm} from '@/app/exercises/AddExerciseForm';

// Maps plain-English search terms to substrings found in muscle IDs.
// Muscle IDs use kebab shorthand (e.g. sternal-pec, ant-delts, lower-back).
const MUSCLE_ALIASES: Record<string, string[]> = {
  // chest
  chest:      ['pec'],
  pecs:       ['pec'],
  // shoulders
  shoulder:   ['delt'],
  shoulders:  ['delt'],
  delts:      ['delt'],
  // back
  back:       ['lats', 'lower-back', 'trap'],
  lats:       ['lats'],
  // traps
  traps:      ['trap'],
  // legs (broad)
  leg:        ['quads', 'ham', 'calves', 'glutes', 'adductors'],
  legs:       ['quads', 'ham', 'calves', 'glutes', 'adductors'],
  lower:      ['quads', 'ham', 'calves', 'glutes'],
  // individual leg muscles
  quad:       ['quads'],
  quads:      ['quads'],
  hamstring:  ['ham'],
  hamstrings: ['ham'],
  ham:        ['ham'],
  glute:      ['glutes'],
  glutes:     ['glutes'],
  calf:       ['calves'],
  calves:     ['calves'],
  // arms (broad)
  arm:        ['biceps', 'triceps', 'forearms'],
  arms:       ['biceps', 'triceps', 'forearms'],
  // individual arm muscles
  bicep:      ['biceps'],
  tricep:     ['triceps'],
  // core
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
  /** When provided, filters to this category and hides the category toggle (use for substitution). */
  defaultCategory?: string;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExercisePickerDialog({
  open,
  title,
  defaultCategory,
  onClose,
  onSelect,
}: ExercisePickerDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const {exercises, loading, addExercise} = useExerciseList(open);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory ?? 'resistance');
  const [createOpen, setCreateOpen] = useState(false);

  // Reset search and sync category when dialog reopens
  useEffect(() => {
    if (open) {
      setSearch('');
      setCategory(defaultCategory ?? 'resistance');
    }
  }, [open, defaultCategory]);

  const filtered = exercises.filter(ex => {
    const matchesCategory = ex.category === category;
    const matchesSearch = exerciseMatchesSearch(ex, search);
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      PaperProps={{sx: {display: 'flex', flexDirection: 'column', maxHeight: fullScreen ? '100dvh' : '80vh'}}}
    >
      <DialogTitle sx={{pb: 1}}>{title}</DialogTitle>
      <Box sx={{px: 3, pb: 1}}>
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
      <DialogContent sx={{p: 0, overflowY: 'auto', flex: 1}}>
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
      </DialogContent>
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
    </Dialog>
  );
}
