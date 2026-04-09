import {fetchJson} from './fetchWrapper';
import {UserPrisma, PlanPrisma} from "@/types/dataTypes";
import {PlanUploadResponse} from "@/app/api/plan/route";

export async function saveUserWorkoutData(userData: UserPrisma) {
  return fetchJson('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function savePlan(plan: PlanPrisma): Promise<PlanUploadResponse> {
  return fetchJson('/api/plan', {
    method: 'POST',
    body: JSON.stringify(plan),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function setActivePlan(planId: number | null, targetUserId?: string) {
  return fetchJson('/api/plan/active', {
    method: 'PATCH',
    body: JSON.stringify({ planId, targetUserId }),
    headers: {'Content-Type': 'application/json'},
  });
}
