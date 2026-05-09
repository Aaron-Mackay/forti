import { useMemo } from 'react';
import type { CheckInTemplate, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import type { SubmitCheckInRequest } from '@lib/contracts/checkIn';

interface LegacyFormState {
  energyLevel: number | null;
  moodRating: number | null;
  stressLevel: number | null;
  sleepQuality: number | null;
  recoveryRating: number | null;
  adherenceRating: number | null;
  weekReview: string;
  coachMessage: string;
  goalsNextWeek: string;
}

export function useCheckInPayload({
  activeTemplate,
  customResponses,
  legacyForm,
  completedWorkoutsCount,
  plannedWorkoutsCount,
}: {
  activeTemplate: CheckInTemplate | null;
  customResponses: CustomCheckInResponses;
  legacyForm: LegacyFormState;
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
}): SubmitCheckInRequest {
  return useMemo(() => {
    if (activeTemplate !== null) {
      return {
        customResponses,
        completedWorkouts: completedWorkoutsCount,
        plannedWorkouts: plannedWorkoutsCount,
      };
    }

    return {
      ...legacyForm,
      completedWorkouts: completedWorkoutsCount,
      plannedWorkouts: plannedWorkoutsCount,
      energyLevel: legacyForm.energyLevel ?? undefined,
      moodRating: legacyForm.moodRating ?? undefined,
      stressLevel: legacyForm.stressLevel ?? undefined,
      sleepQuality: legacyForm.sleepQuality ?? undefined,
      recoveryRating: legacyForm.recoveryRating ?? undefined,
      adherenceRating: legacyForm.adherenceRating ?? undefined,
      weekReview: legacyForm.weekReview || undefined,
      coachMessage: legacyForm.coachMessage || undefined,
      goalsNextWeek: legacyForm.goalsNextWeek || undefined,
    };
  }, [activeTemplate, customResponses, completedWorkoutsCount, plannedWorkoutsCount, legacyForm]);
}
