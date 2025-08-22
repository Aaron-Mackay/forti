import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/api";
import {PlanPrisma} from "@/types/dataTypes";

export type PlanUploadResponse = {
  success: boolean;
  planId?: number;
  error?: string;
}
export async function POST(req: NextRequest) {
  try {
    const uploadedPlanId = await saveUserPlan(await req.json() as PlanPrisma);

    return NextResponse.json({ success: true, planId: uploadedPlanId } as PlanUploadResponse, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create plan' } as PlanUploadResponse, { status: 500 })
  }
}