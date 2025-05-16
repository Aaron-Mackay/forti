// app/api/users/route.ts

import {PrismaClient} from "@prisma/client";
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET request to fetch users from the database
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        weeks: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
