import prisma from '@lib/prisma';
import { toDateOnly } from '@lib/checkInUtils';
import { Prisma } from '@prisma/client';

const templateWithDays = {
  days: true,
} satisfies Prisma.TargetTemplateInclude;

export type TargetTemplateWithDays = Prisma.TargetTemplateGetPayload<{
  include: typeof templateWithDays;
}>;

/** Per-day macro targets (may vary by day of week). */
export type TargetDayMacros = {
  caloriesTarget: number | null;
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
};

/** Uniform daily targets stored on the TargetTemplate header row. */
export type TargetTemplateHeader = {
  stepsTarget: number | null;
  sleepMinsTarget: number | null;
};

/**
 * Backwards lookup: returns the most recent TargetTemplate (with its days)
 * whose effectiveFrom is on or before `weekMonday`.
 * Returns null if no template has been created for this user.
 */
export async function getActiveTemplateForWeek(
  userId: string,
  weekMonday: Date,
): Promise<TargetTemplateWithDays | null> {
  return prisma.targetTemplate.findFirst({
    where: { userId, effectiveFrom: { lte: toDateOnly(weekMonday) } },
    orderBy: { effectiveFrom: 'desc' },
    include: templateWithDays,
  });
}

/**
 * Converts a template's days array into a Record<dayOfWeek, TargetDayMacros>
 * for O(1) lookup. Days absent from the array return all-null macros.
 */
export function getMacrosByDow(
  template: TargetTemplateWithDays | null,
): Record<number, TargetDayMacros> {
  const result: Record<number, TargetDayMacros> = {};
  for (let dow = 1; dow <= 7; dow++) {
    const day = template?.days.find(d => d.dayOfWeek === dow);
    result[dow] = {
      caloriesTarget: day?.caloriesTarget ?? null,
      proteinTarget: day?.proteinTarget ?? null,
      carbsTarget: day?.carbsTarget ?? null,
      fatTarget: day?.fatTarget ?? null,
    };
  }
  return result;
}

/**
 * Creates or replaces the TargetTemplate for the given user and effectiveFrom
 * (always a Monday). Replaces all TargetTemplateDay rows atomically.
 */
export async function upsertTargetTemplate(
  userId: string,
  weekMonday: Date,
  header: TargetTemplateHeader,
  days: Record<number, TargetDayMacros>,
): Promise<TargetTemplateWithDays> {
  const effectiveFrom = toDateOnly(weekMonday);

  return prisma.$transaction(async tx => {
    // Upsert header (@@unique on [userId, effectiveFrom] allows this)
    const template = await tx.targetTemplate.upsert({
      where: { userId_effectiveFrom: { userId, effectiveFrom } },
      create: {
        userId,
        effectiveFrom,
        stepsTarget: header.stepsTarget,
        sleepMinsTarget: header.sleepMinsTarget,
      },
      update: {
        stepsTarget: header.stepsTarget,
        sleepMinsTarget: header.sleepMinsTarget,
      },
    });

    // Replace all day rows
    await tx.targetTemplateDay.deleteMany({ where: { templateId: template.id } });
    await tx.targetTemplateDay.createMany({
      data: Object.entries(days).map(([dow, macros]) => ({
        templateId: template.id,
        dayOfWeek: Number(dow),
        caloriesTarget: macros.caloriesTarget,
        proteinTarget: macros.proteinTarget,
        carbsTarget: macros.carbsTarget,
        fatTarget: macros.fatTarget,
      })),
    });

    return tx.targetTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: templateWithDays,
    });
  });
}

/**
 * Returns all TargetTemplates for a user, ordered by effectiveFrom ascending.
 * Used by the coach view to pre-load all template history for client-side lookup.
 */
export async function getAllTemplatesForUser(
  userId: string,
): Promise<TargetTemplateWithDays[]> {
  return prisma.targetTemplate.findMany({
    where: { userId },
    orderBy: { effectiveFrom: 'asc' },
    include: templateWithDays,
  });
}
