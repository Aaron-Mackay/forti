import React from 'react';
import {getExercises} from '@lib/api';
import ExercisesClient from './ExercisesClient';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@/lib/prisma';

export default async function ExercisesPage() {
  const sessionUser = await getLoggedInUser();
  const [exercises, dbUser] = await Promise.all([
    getExercises(),
    prisma.user.findUniqueOrThrow({where: {id: sessionUser.id}, select: {id: true, coachId: true}}),
  ]);

  const clientCount = await prisma.user.count({where: {coachId: dbUser.id}});
  const isCoach = clientCount > 0;

  let coachDescriptions: Record<number, string> = {};
  const coachId = isCoach ? dbUser.id : (dbUser.coachId ?? null);
  if (coachId) {
    const overrides = await prisma.coachExerciseDescription.findMany({where: {coachId}});
    coachDescriptions = Object.fromEntries(overrides.map(o => [o.exerciseId, o.description]));
  }

  return (
    <ExercisesClient
      initialExercises={exercises}
      coachDescriptions={coachDescriptions}
      isCoach={isCoach}
    />
  );
}
