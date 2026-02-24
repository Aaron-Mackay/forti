import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';

export async function GET() {
  await requireSession();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });
    return NextResponse.json(users);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
