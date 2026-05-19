import {fetchJsonWithSchema} from './fetchWrapper';
import {UserPrisma, PlanPrisma} from "@/types/dataTypes";
import {
  UserSettingsResponseSchema,
  UserSettingsUpdateRequestSchema,
  type UserSettingsResponse,
  type UserSettingsUpdateRequest,
} from '@forti/shared';
import {
  ActivePlanGetResponseSchema,
  ActivePlanSuccessSchema,
  type ActivePlanGetResponse,
  type ActivePlanSuccess,
} from './contracts/activePlan';
import { PlanUploadSuccessSchema, type PlanUploadSuccess } from './contracts/plan';
import { SaveUserWorkoutDataSuccessSchema, type SaveUserWorkoutDataSuccess } from './contracts/saveUserWorkoutData';
import { CalendarDataResponseSchema, type CalendarDataResponse } from './contracts/calendarData';
import {
  NotificationMutationResponseSchema,
  NotificationsListResponseSchema,
  type NotificationMutationResponse,
  type NotificationsListResponse,
} from './contracts/notifications';
import {
  CheckInTemplateResponseSchema,
  CheckInHistoryResponseSchema,
  CurrentCheckInResponseSchema,
  PhotoHistoryResponseSchema,
  SaveCheckInDraftRequestSchema,
  SaveCheckInDraftResponseSchema,
  SubmitCheckInRequestSchema,
  SubmitCheckInResponseSchema,
  type CheckInTemplateResponse,
  type CheckInHistoryResponse,
  type CurrentCheckInResponse,
  type PhotoHistoryResponse,
  type SaveCheckInDraftRequest,
  type SaveCheckInDraftResponse,
  type SubmitCheckInRequest,
  type SubmitCheckInResponse,
} from './contracts/checkIn';
import {
  CoachCheckInDetailResponseSchema,
  CoachCheckInNotesRequestSchema,
  CoachCheckInNotesResponseSchema,
  CoachCheckInsResponseSchema,
  CoachClientsResponseSchema,
  CoachHomeResponseSchema,
  CoachMutationSuccessResponseSchema,
  type CoachCheckInDetailResponse,
  type CoachCheckInNotesRequest,
  type CoachCheckInNotesResponse,
  type CoachCheckInsResponse,
  type CoachClientsResponse,
  type CoachHomeResponse,
  type CoachMutationSuccessResponse,
} from './contracts/coach';
import {
  GetTargetTemplateResponseSchema,
  TargetTemplateRequestSchema,
  TargetTemplateResponseSchema,
  type GetTargetTemplateResponse,
  type TargetTemplateRequest,
  type TargetTemplateResponse,
} from './contracts/targetTemplates';
import {
  CreateExerciseRequestSchema,
  ExerciseListQuerySchema,
  ExerciseListResponseSchema,
  ExerciseSchema,
  type CreateExerciseRequest,
  type ExerciseListQuery,
  type ExerciseListResponse,
} from './contracts/exercises';
import {
  E1rmHistoryResponseSchema,
  ExcludedSessionsResponseSchema,
  PreviousCardioResponseSchema,
  PreviousExerciseHistorySchema,
  type E1rmHistoryResponse,
  type ExcludedSessionsResponse,
  type PreviousCardioResponse,
  type PreviousExerciseHistory,
} from './contracts/exerciseHistory';
import {
  ExerciseNoteResponseSchema,
  ExerciseNoteUpdateRequestSchema,
  type ExerciseNoteResponse,
  type ExerciseNoteUpdateRequest,
} from './contracts/exerciseNote';
import {
  EnrichResponseSchema,
  ExerciseEnrichRequestSchema,
  type EnrichResponse,
  type ExerciseEnrichRequest,
} from './contracts/exerciseEnrich';
import { SessionsListResponseSchema, type SessionsListResponse } from './contracts/sessions';
import { WorkoutDataResponseSchema, type WorkoutDataResponse } from './contracts/workoutData';

const inFlightReadRequests = new Map<string, Promise<unknown>>();

function coalesceReadRequest<T>(key: string, requestFactory: () => Promise<T>): Promise<T> {
  const existingRequest = inFlightReadRequests.get(key);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = requestFactory().finally(() => {
    inFlightReadRequests.delete(key);
  });

  inFlightReadRequests.set(key, request as Promise<unknown>);
  return request;
}

function normalizeUserWorkoutDataForSave(userData: UserPrisma): UserPrisma {
  if (!Array.isArray(userData.plans)) return userData;

  return {
    ...userData,
    plans: userData.plans.map((plan) => ({
      ...plan,
      weeks: (plan.weeks ?? []).map((week) => ({
        ...week,
        workouts: (week.workouts ?? []).map((workout) => ({
          ...workout,
          exercises: (workout.exercises ?? []).map((exercise) => ({
            ...exercise,
            exercise: exercise.exercise
              ? {
                  ...exercise.exercise,
                  category: exercise.exercise.category ?? 'resistance',
                }
              : exercise.exercise,
          })),
        })),
      })),
    })),
  };
}

export async function saveUserWorkoutData(userData: UserPrisma): Promise<SaveUserWorkoutDataSuccess> {
  const normalizedUserData = normalizeUserWorkoutDataForSave(userData);
  return fetchJsonWithSchema('/api/saveUserWorkoutData', SaveUserWorkoutDataSuccessSchema, {
    method: 'POST',
    body: JSON.stringify(normalizedUserData),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function getWorkoutData(): Promise<WorkoutDataResponse> {
  return fetchJsonWithSchema('/api/workout-data', WorkoutDataResponseSchema);
}

export async function savePlan(plan: PlanPrisma): Promise<PlanUploadSuccess> {
  return fetchJsonWithSchema('/api/plan', PlanUploadSuccessSchema, {
    method: 'POST',
    body: JSON.stringify(plan),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function setActivePlan(planId: number | null, targetUserId?: string): Promise<ActivePlanSuccess> {
  return fetchJsonWithSchema('/api/plan/active', ActivePlanSuccessSchema, {
    method: 'PATCH',
    body: JSON.stringify({ planId, targetUserId }),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function getActivePlan(targetUserId?: string): Promise<ActivePlanGetResponse> {
  const url = targetUserId
    ? `/api/plan/active?targetUserId=${encodeURIComponent(targetUserId)}`
    : '/api/plan/active';
  return fetchJsonWithSchema(url, ActivePlanGetResponseSchema);
}

export async function getCalendarData(): Promise<CalendarDataResponse> {
  return fetchJsonWithSchema('/api/calendar-data', CalendarDataResponseSchema);
}

export async function getNotifications(): Promise<NotificationsListResponse> {
  return coalesceReadRequest('GET:/api/notifications', () =>
    fetchJsonWithSchema('/api/notifications', NotificationsListResponseSchema),
  );
}

export async function markNotificationRead(id: number): Promise<NotificationMutationResponse> {
  return fetchJsonWithSchema(`/api/notifications/${id}/read`, NotificationMutationResponseSchema, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<NotificationMutationResponse> {
  return fetchJsonWithSchema('/api/notifications/read-all', NotificationMutationResponseSchema, {
    method: 'PATCH',
  });
}

export async function getUserSettings(options?: Pick<RequestInit, 'cache' | 'signal'>): Promise<UserSettingsResponse> {
  const key = `GET:/api/user/settings:${options?.cache ?? 'default'}`;

  if (options?.signal) {
    return fetchJsonWithSchema('/api/user/settings', UserSettingsResponseSchema, options);
  }

  return coalesceReadRequest(key, () =>
    fetchJsonWithSchema('/api/user/settings', UserSettingsResponseSchema, options),
  );
}

export async function updateUserSettings(
  settings: UserSettingsUpdateRequest['settings'],
  options?: Pick<RequestInit, 'signal'>,
): Promise<UserSettingsResponse> {
  return fetchJsonWithSchema('/api/user/settings', UserSettingsResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(UserSettingsUpdateRequestSchema.parse({ settings })),
    headers: {'Content-Type': 'application/json'},
    ...options,
  });
}

export interface CheckInHistoryOptions {
  limit?: number;
  offset?: number;
  excludeCurrent?: boolean;
}

export async function getCheckInHistory(opts: CheckInHistoryOptions = {}): Promise<CheckInHistoryResponse> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.offset !== undefined) params.set('offset', String(opts.offset));
  if (opts.excludeCurrent) params.set('excludeCurrent', 'true');
  const qs = params.toString();
  const url = qs ? `/api/check-in?${qs}` : '/api/check-in';
  return coalesceReadRequest(`GET:${url}`, () => fetchJsonWithSchema(url, CheckInHistoryResponseSchema));
}

export async function getCurrentCheckIn(): Promise<CurrentCheckInResponse> {
  return fetchJsonWithSchema('/api/check-in/current', CurrentCheckInResponseSchema);
}

export async function submitCheckIn(payload: SubmitCheckInRequest): Promise<SubmitCheckInResponse> {
  return fetchJsonWithSchema('/api/check-in', SubmitCheckInResponseSchema, {
    method: 'POST',
    body: JSON.stringify(SubmitCheckInRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function saveCheckInDraft(payload: SaveCheckInDraftRequest): Promise<SaveCheckInDraftResponse> {
  return fetchJsonWithSchema('/api/check-in/draft', SaveCheckInDraftResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(SaveCheckInDraftRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function getCoachClients(): Promise<CoachClientsResponse> {
  return fetchJsonWithSchema('/api/coach/clients', CoachClientsResponseSchema);
}

export async function getCoachHome(): Promise<CoachHomeResponse> {
  return fetchJsonWithSchema('/api/coach/home', CoachHomeResponseSchema);
}

export interface CoachCheckInsOptions {
  clientId?: string;
  from?: string;
  to?: string;
  unread?: boolean;
  limit?: number;
  offset?: number;
}

export async function listCoachCheckIns(opts: CoachCheckInsOptions = {}): Promise<CoachCheckInsResponse> {
  const params = new URLSearchParams();
  if (opts.clientId) params.set('clientId', opts.clientId);
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.unread) params.set('unread', 'true');
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.offset !== undefined) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const url = qs ? `/api/coach/check-ins?${qs}` : '/api/coach/check-ins';
  return fetchJsonWithSchema(url, CoachCheckInsResponseSchema);
}

export async function getCoachCheckInDetail(checkInId: number): Promise<CoachCheckInDetailResponse> {
  return fetchJsonWithSchema(`/api/coach/check-ins/${checkInId}`, CoachCheckInDetailResponseSchema);
}

export async function saveCoachCheckInNotes(
  checkInId: number,
  payload: CoachCheckInNotesRequest,
): Promise<CoachCheckInNotesResponse> {
  return fetchJsonWithSchema(`/api/coach/check-ins/${checkInId}/notes`, CoachCheckInNotesResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(CoachCheckInNotesRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function getCoachCheckInPhotoHistory(checkInId: number): Promise<PhotoHistoryResponse> {
  return fetchJsonWithSchema(`/api/coach/check-ins/${checkInId}/photo-history`, PhotoHistoryResponseSchema);
}

export async function getCoachCheckInTemplate(): Promise<CheckInTemplateResponse> {
  return fetchJsonWithSchema('/api/coach/check-in-template', CheckInTemplateResponseSchema);
}

export async function removeCoachClient(clientId: string): Promise<CoachMutationSuccessResponse> {
  return fetchJsonWithSchema(`/api/coach/clients/${clientId}`, CoachMutationSuccessResponseSchema, {
    method: 'DELETE',
  });
}

export async function getTargetTemplate(weekStart: string): Promise<GetTargetTemplateResponse> {
  const params = new URLSearchParams({ weekStart });
  return fetchJsonWithSchema(`/api/target-templates?${params.toString()}`, GetTargetTemplateResponseSchema);
}

export async function saveTargetTemplate(payload: TargetTemplateRequest): Promise<TargetTemplateResponse> {
  return fetchJsonWithSchema('/api/target-templates', TargetTemplateResponseSchema, {
    method: 'POST',
    body: JSON.stringify(TargetTemplateRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function listExercises(query: ExerciseListQuery = {}): Promise<ExerciseListResponse> {
  const parsed = ExerciseListQuerySchema.parse(query);
  const params = new URLSearchParams();
  if (parsed.search) params.set('search', parsed.search);
  if (parsed.take !== undefined) params.set('take', String(parsed.take));
  if (parsed.skip !== undefined) params.set('skip', String(parsed.skip));
  if (parsed.sortBy) params.set('sortBy', parsed.sortBy);
  const qs = params.toString();
  const url = qs ? `/api/exercises?${qs}` : '/api/exercises';
  return fetchJsonWithSchema(url, ExerciseListResponseSchema);
}

export async function createExercise(payload: CreateExerciseRequest): Promise<ExerciseListResponse[number]> {
  return fetchJsonWithSchema('/api/exercises', ExerciseSchema, {
    method: 'POST',
    body: JSON.stringify(CreateExerciseRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function getExerciseE1rmHistory(
  exerciseId: number,
  options: { currentWorkoutId?: number } = {},
): Promise<E1rmHistoryResponse> {
  const params = new URLSearchParams();
  if (options.currentWorkoutId !== undefined) params.set('currentWorkoutId', String(options.currentWorkoutId));
  const qs = params.toString();
  const url = qs ? `/api/exercises/${exerciseId}/e1rm-history?${qs}` : `/api/exercises/${exerciseId}/e1rm-history`;
  return fetchJsonWithSchema(url, E1rmHistoryResponseSchema);
}

export async function getExcludedSessions(exerciseId: number): Promise<ExcludedSessionsResponse> {
  return fetchJsonWithSchema(`/api/exercises/${exerciseId}/excluded-sessions`, ExcludedSessionsResponseSchema);
}

export async function reincludeSession(workoutExerciseId: number): Promise<void> {
  await fetch(`/api/workoutExercise/${workoutExerciseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ excludeFromHistory: false }),
  });
}

export async function getPreviousCardio(
  exerciseId: number,
  options: { currentWorkoutId?: number } = {},
): Promise<PreviousCardioResponse> {
  const params = new URLSearchParams();
  if (options.currentWorkoutId !== undefined) params.set('currentWorkoutId', String(options.currentWorkoutId));
  const qs = params.toString();
  const url = qs ? `/api/exercises/${exerciseId}/previous-cardio?${qs}` : `/api/exercises/${exerciseId}/previous-cardio`;
  return fetchJsonWithSchema(url, PreviousCardioResponseSchema);
}

export async function getPreviousExerciseHistory(
  exerciseId: number,
  options: { currentWorkoutId: number; currentWorkoutExerciseId: number },
): Promise<PreviousExerciseHistory> {
  const params = new URLSearchParams({
    currentWorkoutId: String(options.currentWorkoutId),
    currentWorkoutExerciseId: String(options.currentWorkoutExerciseId),
  });
  return fetchJsonWithSchema(`/api/exercises/${exerciseId}/previous-sets?${params.toString()}`, PreviousExerciseHistorySchema);
}

export async function updateExerciseNote(
  exerciseId: number,
  payload: ExerciseNoteUpdateRequest,
): Promise<ExerciseNoteResponse> {
  return fetchJsonWithSchema(`/api/exerciseNote/${exerciseId}`, ExerciseNoteResponseSchema, {
    method: 'PUT',
    body: JSON.stringify(ExerciseNoteUpdateRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function enrichExercises(payload: ExerciseEnrichRequest): Promise<EnrichResponse> {
  return fetchJsonWithSchema('/api/exercises/enrich', EnrichResponseSchema, {
    method: 'POST',
    body: JSON.stringify(ExerciseEnrichRequestSchema.parse(payload)),
    headers: {'Content-Type': 'application/json'},
  });
}

export interface SessionsListOptions {
  type?: 'all' | 'workout' | 'cardio';
  status?: 'planned' | 'completed';
}

export async function listSessions(opts: SessionsListOptions = {}): Promise<SessionsListResponse> {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.status) params.set('status', opts.status);
  const qs = params.toString();
  const url = qs ? `/api/sessions?${qs}` : '/api/sessions';
  return fetchJsonWithSchema(url, SessionsListResponseSchema);
}
