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
  CheckInHistoryResponseSchema,
  CurrentCheckInResponseSchema,
  SubmitCheckInRequestSchema,
  SubmitCheckInResponseSchema,
  type CheckInHistoryResponse,
  type CurrentCheckInResponse,
  type SubmitCheckInRequest,
  type SubmitCheckInResponse,
} from './contracts/checkIn';
import {
  GetTargetTemplateResponseSchema,
  TargetTemplateRequestSchema,
  TargetTemplateResponseSchema,
  type GetTargetTemplateResponse,
  type TargetTemplateRequest,
  type TargetTemplateResponse,
} from './contracts/targetTemplates';
import { SessionsListResponseSchema, type SessionsListResponse } from './contracts/sessions';
import { WorkoutDataResponseSchema, type WorkoutDataResponse } from './contracts/workoutData';

export async function saveUserWorkoutData(userData: UserPrisma): Promise<SaveUserWorkoutDataSuccess> {
  return fetchJsonWithSchema('/api/saveUserWorkoutData', SaveUserWorkoutDataSuccessSchema, {
    method: 'POST',
    body: JSON.stringify(userData),
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
  return fetchJsonWithSchema('/api/notifications', NotificationsListResponseSchema);
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
  return fetchJsonWithSchema('/api/user/settings', UserSettingsResponseSchema, options);
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
  return fetchJsonWithSchema(url, CheckInHistoryResponseSchema);
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
