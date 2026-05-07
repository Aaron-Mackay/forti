import { randomInt } from 'crypto';
import prisma from '@lib/prisma';

export async function generateUniqueCoachCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(randomInt(10000000, 100000000));
    const existing = await prisma.user.findUnique({ where: { coachCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique coach code');
}
