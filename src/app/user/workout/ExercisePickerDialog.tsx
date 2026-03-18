'use client';

import {useEffect, useState} from 'react';
import {
  Box,
  Button,
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

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory ?? 'resistance');
  const [createOpen, setCreateOpen] = useState(false);

  // Lazy-fetch exercises on first open
  useEffect(() => {
    if (!open || exercises.length > 0) return;
    setLoading(true);
    fetch('/api/exercises')
      .then(r => r.ok ? r.json() : [])
      .then((data: Exercise[]) => setExercises(data))
      .catch(() => {/* non-fatal */})
      .finally(() => setLoading(false));
  }, [open, exercises.length]);

  // Reset search and sync category when dialog reopens
  useEffect(() => {
    if (open) {
      setSearch('');
      setCategory(defaultCategory ?? 'resistance');
    }
  }, [open, defaultCategory]);

  const filtered = exercises.filter(ex => {
    const matchesCategory = ex.category === category;
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
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
            {filtered.length === 0 && !loading && (
              search.trim().length > 0 ? (
                <Box sx={{px: 2, py: 2}}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCreateOpen(true)}
                  >
                    {`+ Create "${search}"`}
                  </Button>
                </Box>
              ) : (
                <ListItemText
                  primary="No exercises found"
                  sx={{px: 2, py: 2, color: 'text.secondary'}}
                />
              )
            )}
          </List>
        )}
      </DialogContent>
      <AddExerciseForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialName={search}
        onExerciseAdded={(newExercise) => {
          setExercises(prev => [...prev, newExercise]);
          setCreateOpen(false);
          onSelect(newExercise);
        }}
      />
    </Dialog>
  );
}
