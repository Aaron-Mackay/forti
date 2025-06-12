import { NextResponse } from 'next/server';
import {Prisma, } from "@prisma/client";

import prisma from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const userId = parseInt((await params).userId);

  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  try {
    const weeks = await prisma.week.findMany({
      where: {
        userId,
      },
    } satisfies Prisma.WeekFindManyArgs);

    return NextResponse.json(weeks);
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Failed to fetch weeks' },
      { status: 500 }
    );
  }
}
