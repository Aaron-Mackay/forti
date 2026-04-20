'use client';

import {useCallback, useMemo, useState} from 'react';
import {Exercise} from '@/generated/prisma/browser';
import {Autocomplete, Box, Button, TextField, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {useRouter} from 'next/navigation';
import {EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, ExerciseEquipment, ExerciseMuscle} from '@/types/dataTypes';
import ExerciseCard from './ExerciseCard';
import {AddExerciseForm} from './AddExerciseForm';
import ExerciseDetailDrawer from './ExerciseDetailDrawer';
import {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';
import type {ExerciseCoachNote} from './types';

function toTitleCase(str: string) {
  return str.split(/[-\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function ExercisesClient({
  initialExercises,
  coachNotes: initialCoachNotes,
  userExerciseNotes: initialUserExerciseNotes,
  isCoachPortal,
}: {
  initialExercises: Exercise[];
  coachNotes: Record<number, ExerciseCoachNote>;
  userExerciseNotes: Record<number, string>;
  isCoachPortal: boolean;
}) {
  useAppBar({ title: 'Exercises' });
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<ExerciseMuscle[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<ExerciseEquipment[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [coachNotes, setCoachNotes] = useState<Record<number, ExerciseCoachNote>>(initialCoachNotes);
  const [userExerciseNotes, setUserExerciseNotes] = useState<Record<number, string>>(initialUserExerciseNotes);

  const filtered = useMemo(() => {
    return initialExercises.filter(ex => {
      if (searchText && !ex.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (selectedEquipment.length && !selectedEquipment.every(e => ex.equipment.includes(e))) return false;
      if (selectedMuscles.length && !selectedMuscles.some(m => ex.primaryMuscles.includes(m) || ex.secondaryMuscles.includes(m))) return false;
      return true;
    });
  }, [initialExercises, searchText, selectedEquipment, selectedMuscles]);

  const handleExerciseAdded = () => {
    setAddDialogOpen(false);
    router.refresh();
  };

  const handleCoachNoteSave = useCallback((exerciseId: number, note: ExerciseCoachNote | null) => {
    setCoachNotes(prev => {
      if (note === null) {
        const next = {...prev};
        delete next[exerciseId];
        return next;
      }
      return {...prev, [exerciseId]: note};
    });
  }, []);

  const handleUserExerciseNoteSave = useCallback((exerciseId: number, note: string) => {
    setUserExerciseNotes(prev => ({...prev, [exerciseId]: note}));
  }, []);

  return (
    <>
      <Box sx={{height: HEIGHT_EXC_APPBAR, overflowY: 'auto', p: {xs: 2, sm: 3}}}>
      {/* Filters */}
      <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center'}}>
        <TextField
          label="Search"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          size="small"
          sx={{flex: '1 1 200px'}}
          placeholder="Search by name..."
        />
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={[...EXERCISE_MUSCLES]}
          value={selectedMuscles}
          onChange={(_e, val) => setSelectedMuscles(val as ExerciseMuscle[])}
          getOptionLabel={toTitleCase}
          renderInput={params => <TextField {...params} label="Muscles" size="small"/>}
          sx={{flex: '1 1 250px'}}
          size="small"
        />
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={[...EXERCISE_EQUIPMENT]}
          value={selectedEquipment}
          onChange={(_e, val) => setSelectedEquipment(val as ExerciseEquipment[])}
          getOptionLabel={toTitleCase}
          renderInput={params => <TextField {...params} label="Equipment" size="small"/>}
          sx={{flex: '1 1 250px'}}
          size="small"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon/>}
          onClick={() => setAddDialogOpen(true)}
          sx={{flexShrink: 0}}
        >
          ADD
        </Button>
      </Box>

      {/* Exercise grid */}
      {filtered.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {filtered.map(exercise => (
            <Box
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              sx={{cursor: 'pointer', minWidth: 0}}
            >
              <ExerciseCard
                exercise={exercise}
                coachDescription={coachNotes[exercise.id]?.note}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{mt: 4, textAlign: 'center'}}>
          No exercises match your filters.
        </Typography>
      )}

      <AddExerciseForm
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onExerciseAdded={handleExerciseAdded}
      />
      <ExerciseDetailDrawer
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        coachNote={selectedExercise ? coachNotes[selectedExercise.id] : undefined}
        userExerciseNote={selectedExercise ? (userExerciseNotes[selectedExercise.id] ?? '') : ''}
        isCoachPortal={isCoachPortal}
        onCoachNoteSave={handleCoachNoteSave}
        onUserExerciseNoteSave={handleUserExerciseNoteSave}
      />
      </Box>
    </>
  );
}
