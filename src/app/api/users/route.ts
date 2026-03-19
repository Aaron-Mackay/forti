import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {requireSession} from '@lib/requireSession';

export async function GET() {
  const session = await requireSession();
  try {
    const currentUser = session.user;

    const userRecord = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { coachId: true },
    });

    // Return only the current user's own record plus users they have a direct
    // relationship with (their clients and their coach), not all users.
    const relatedIds: string[] = [currentUser.id];
    if (userRecord?.coachId) relatedIds.push(userRecord.coachId);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: relatedIds } },
          { coachId: currentUser.id },
        ],
      },
      select: { id: true, name: true },
    });

    return NextResponse.json(users);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
