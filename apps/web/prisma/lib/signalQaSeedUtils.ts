import prisma from '../../src/lib/prisma';
import { getWeekStart, toDateOnly } from '../../src/lib/checkInUtils';
import { defaultSettingsForDemoUser } from '../../src/lib/demoUsers';

export const SIGNAL_QA_PLACEHOLDER_PHOTOS = {
  front: '/forti-icon.svg',
  back: '/forti-icon.svg',
  side: '/forti-icon.svg',
} as const;

export function assertNonProductionSeed(seedName: string): void {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error(`${seedName} is a manual QA seed and must not be run in production.`);
  }
}

export function atDay(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + deltaDays);
  return d;
}

export function weekStartFor(date: Date): Date {
  return toDateOnly(getWeekStart(date));
}

export async function upsertSignalQaUser(email: string, name: string, overrides: Record<string, unknown> = {}) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      settings: {
        ...defaultSettingsForDemoUser(email),
        ...overrides,
      },
    },
    create: {
      email,
      name,
      settings: {
        ...defaultSettingsForDemoUser(email),
        ...overrides,
      },
    },
  });
}

export async function resetSignalQaUserData(userId: string, options: { detachCoach?: boolean } = {}) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      activePlanId: null,
      ...(options.detachCoach ? { coachId: null } : {}),
    },
  });
  await prisma.learningPlanAssignment.deleteMany({ where: { clientId: userId } });
  await prisma.userExerciseNote.deleteMany({ where: { userId } });
  await prisma.event.deleteMany({ where: { userId } });
  await prisma.metric.deleteMany({ where: { userId } });
  await prisma.weeklyCheckIn.deleteMany({ where: { userId } });
  await prisma.targetTemplate.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.auditEvent.deleteMany({ where: { actorUserId: userId } });
  await prisma.supplement.deleteMany({ where: { userId } });
  await prisma.plan.deleteMany({ where: { userId } });
}

export async function requireExercise(name: string) {
  const exercise = await prisma.exercise.findFirst({ where: { name } });
  if (!exercise) {
    throw new Error(`Missing exercise "${name}". Run npm run seed:demo first to upsert the exercise library.`);
  }
  return exercise;
}

export function completeSeed(message: string): void {
  console.log(`✅ ${message}`);
}

export function failSeed(error: unknown): never {
  console.error(error);
  process.exit(1);
}
