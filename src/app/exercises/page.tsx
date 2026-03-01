import React from 'react';
import {getExercises} from '@lib/api';
import ExercisesClient from './ExercisesClient';

export default async function ExercisesPage() {
  const exercises = await getExercises();
  const categories = [...new Set(exercises.map(e => e.category).filter(Boolean))] as string[];
  return <ExercisesClient initialExercises={exercises} categories={categories} />;
}
