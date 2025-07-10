import {NextRequest, NextResponse} from 'next/server';
import {updateUserDayMetric} from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const dayMetric = await req.json();
    const updated = await updateUserDayMetric(dayMetric);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({error: 'Failed to update day metric'}, {status: 500});
  }
}