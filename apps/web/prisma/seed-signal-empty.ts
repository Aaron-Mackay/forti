import prisma from '../src/lib/prisma';
import { defaultSettingsForDemoUser } from '../src/lib/demoUsers';

async function resetUserData(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { activePlanId: null, coachId: null } });
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

async function main() {
  const email = 'signal-empty@example.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Signal Empty',
      settings: defaultSettingsForDemoUser(email),
    },
    create: {
      email,
      name: 'Signal Empty',
      settings: defaultSettingsForDemoUser(email),
    },
  });

  await resetUserData(user.id);

  console.log('✅ Seeded Signal Empty user: signal-empty@example.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
