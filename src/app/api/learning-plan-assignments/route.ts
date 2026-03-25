import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

/**
 * GET /api/learning-plan-assignments
 * Returns all learning plan assignments for the authenticated client,
 * including plan title, ordered steps, and the client's stepProgress.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const assignments = await prisma.learningPlanAssignment.findMany({
    where: { clientId: userId },
    orderBy: { createdAt: 'asc' },
    include: {
      plan: {
        select: {
          id: true,
          title: true,
          description: true,
          steps: {
            orderBy: { order: 'asc' },
            include: {
              asset: { select: { id: true, title: true, type: true, url: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ assignments });
}
