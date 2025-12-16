import {NextResponse} from 'next/server';
import prisma from '@/lib/prisma';
import getLoggedInUser from "@lib/getLoggedInUser";

export async function GET() {
  const userId = (await getLoggedInUser()).id

  const [userPlansCount, coachedPlansCount] = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.plan.count({ where: { user: { coachId: userId } } }),
  ]);

  return NextResponse.json({count: userPlansCount + coachedPlansCount});
}