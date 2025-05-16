import { NextResponse } from 'next/server';
import {Prisma, PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

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
    return NextResponse.json(
      { error: 'Failed to fetch weeks' },
      { status: 500 }
    );
  }
}
