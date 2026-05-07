import {NextResponse} from 'next/server';
import prisma from '@/lib/prisma';
import {requireSession} from "@lib/requireSession";

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const [userPlansCount, coachedPlansCount] = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.plan.count({ where: { user: { coachId: userId } } }),
  ]);

  return NextResponse.json({count: userPlansCount + coachedPlansCount});
}