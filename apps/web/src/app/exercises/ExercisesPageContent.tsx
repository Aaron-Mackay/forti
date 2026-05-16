import { getExercises } from '@lib/exerciseService';
import ExercisesClient from './ExercisesClient';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@/lib/prisma';
import type { ExerciseCoachNote } from './types';

type Props = {
  isCoachPortal: boolean;
};

export async function ExercisesPageContent({ isCoachPortal }: Props) {
  const sessionUser = await getLoggedInUser();
  const [exercises, dbUser] = await Promise.all([
    getExercises(),
    prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, select: { id: true, coachId: true } }),
  ]);

  let coachNotes: Record<number, ExerciseCoachNote> = {};
  const coachId = isCoachPortal ? dbUser.id : (dbUser.coachId ?? null);
  if (coachId) {
    const notes = await prisma.coachExerciseNote.findMany({ where: { coachId } });
    coachNotes = Object.fromEntries(notes.map((note) => [note.exerciseId, { note: note.note, url: note.url }]));
  }

  const userNotes = await prisma.userExerciseNote.findMany({
    where: { userId: dbUser.id },
  });
  const userExerciseNotes = Object.fromEntries(userNotes.map((note) => [note.exerciseId, note.note]));

  return (
    <ExercisesClient
      initialExercises={exercises}
      coachNotes={coachNotes}
      userExerciseNotes={userExerciseNotes}
      isCoachPortal={isCoachPortal}
    />
  );
}
