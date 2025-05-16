import {PrismaClient} from "@prisma/client";
import {NextResponse} from "next/server";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const exercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      category: true,
    },
  });

  const categories = [...new Set(exercises
    .map(e => e.category)
    .filter(Boolean))
  ];

  return NextResponse.json({exercises, categories});
}