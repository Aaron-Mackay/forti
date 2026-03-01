'use client';

import {useMemo, useState} from 'react';
import {Exercise} from '@prisma/client';
import {Autocomplete, Box, Button, TextField, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {useRouter} from 'next/navigation';
import {EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, ExerciseEquipment, ExerciseMuscle} from '@/types/dataTypes';
import ExerciseCard from './ExerciseCard';
import {AddExerciseForm} from './AddExerciseForm';
import CustomAppBar, {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';

function toTitleCase(str: string) {
  return str.split(/[-\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function ExercisesClient({
  initialExercises,
}: {
  initialExercises: Exercise[];
}) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<ExerciseMuscle[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<ExerciseEquipment[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return initialExercises.filter(ex => {
      if (searchText && !ex.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (selectedEquipment.length && !selectedEquipment.every(e => ex.equipment.includes(e))) return false;
      if (selectedMuscles.length && !selectedMuscles.some(m => ex.muscles.includes(m))) return false;
      return true;
    });
  }, [initialExercises, searchText, selectedEquipment, selectedMuscles]);

  const handleExerciseAdded = () => {
    setAddDialogOpen(false);
    router.refresh();
  };

  return (
    <>
      <CustomAppBar title="Exercises"/>
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
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {filtered.map(exercise => (
            <ExerciseCard key={exercise.id} exercise={exercise}/>
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
      </Box>
    </>
  );
}
