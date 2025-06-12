import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';


export async function PATCH(req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const { reps, weight } = await req.json();
  const data: { [p: string]: string | number } = {};

  if (typeof reps === 'number') data.reps = reps;
  if (typeof weight === 'string') data.weight = weight;

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  try {
    const updated = await prisma.exerciseSet.update({
      where: { id: Number(params.setId) },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err)

    let message = "Unknown error";
    if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }

    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
