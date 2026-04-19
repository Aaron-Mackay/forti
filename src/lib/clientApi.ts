import {fetchJsonWithSchema} from './fetchWrapper';
import {UserPrisma, PlanPrisma} from "@/types/dataTypes";
import { ActivePlanSuccessSchema, type ActivePlanSuccess } from './contracts/activePlan';
import { PlanUploadSuccessSchema, type PlanUploadSuccess } from './contracts/plan';
import { SaveUserWorkoutDataSuccessSchema, type SaveUserWorkoutDataSuccess } from './contracts/saveUserWorkoutData';

export async function saveUserWorkoutData(userData: UserPrisma): Promise<SaveUserWorkoutDataSuccess> {
  return fetchJsonWithSchema('/api/saveUserWorkoutData', SaveUserWorkoutDataSuccessSchema, {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json'},
  });
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
