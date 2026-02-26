import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/api";
import {PlanPrisma} from "@/types/dataTypes";
import confirmPermission from "@lib/confirmPermission";
import {PlanPostSchema} from "@lib/planSchemas";

export type PlanUploadResponse = {
  success: boolean;
  planId?: number;
  error?: string;
}
export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = PlanPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {success: false, error: 'Invalid request', issues: parsed.error.flatten()} as PlanUploadResponse,
      {status: 400}
    );
  }

  try {
    await confirmPermission(parsed.data.userId);

    const uploadedPlanId = await saveUserPlan(parsed.data as PlanPrisma);

    return NextResponse.json({ success: true, planId: uploadedPlanId } as PlanUploadResponse, { status: 200 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create plan' } as PlanUploadResponse, { status: 500 })
  }
}