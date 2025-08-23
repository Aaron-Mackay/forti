import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/api";
import {PlanPrisma} from "@/types/dataTypes";
import confirmPermission from "@lib/confirmPermission";

export type PlanUploadResponse = {
  success: boolean;
  planId?: number;
  error?: string;
}
export async function POST(req: NextRequest) {
  try {
    const receivedPlan = await req.json() as PlanPrisma;
    const permissionResult = await confirmPermission(receivedPlan.userId);
    if (permissionResult) return permissionResult;

    const uploadedPlanId = await saveUserPlan(receivedPlan);

    return NextResponse.json({ success: true, planId: uploadedPlanId } as PlanUploadResponse, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create plan' } as PlanUploadResponse, { status: 500 })
  }
}