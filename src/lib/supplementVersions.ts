import { Prisma } from '@prisma/client';
import { toDateOnly } from '@lib/checkInUtils';

const supplementWithVersions = {
  versions: { orderBy: { effectiveFrom: 'asc' as const } },
} satisfies Prisma.SupplementInclude;

export type SupplementWithVersions = Prisma.SupplementGetPayload<{
  include: typeof supplementWithVersions;
}>;

export { supplementWithVersions };

/**
 * Backwards lookup: returns the most recent SupplementVersion
 * whose effectiveFrom is on or before `date` (defaults to today).
 * Falls back to the earliest version if none predate the date.
 */
export function getActiveVersion(
  supplement: SupplementWithVersions,
  date: Date = new Date(),
): SupplementWithVersions['versions'][number] | null {
  if (!supplement.versions.length) return null;
  const dateOnly = toDateOnly(date);
  const desc = [...supplement.versions].reverse();
  return desc.find(v => v.effectiveFrom <= dateOnly) ?? supplement.versions[0];
}
