import prisma from '../src/lib/prisma';
import {
  assertNonProductionSeed,
  completeSeed,
  failSeed,
  resetSignalQaUserData,
  upsertSignalQaUser,
} from './lib/signalQaSeedUtils';

async function main() {
  assertNonProductionSeed('seed-signal-empty');

  const email = 'signal-empty@example.com';
  const user = await upsertSignalQaUser(email, 'Signal Empty');

  await resetSignalQaUserData(user.id, { detachCoach: true });

  completeSeed('Seeded Signal Empty user: signal-empty@example.com');
}

main()
  .catch(failSeed)
  .finally(() => prisma.$disconnect());
