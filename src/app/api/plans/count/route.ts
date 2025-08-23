import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import getLoggedInUser from "@lib/getLoggedInUser";

export async function GET() {
  const userId = (await getLoggedInUser()).id

  const count = await prisma.plan.count({
    where: { userId },
  });

  return NextResponse.json({ count });
}