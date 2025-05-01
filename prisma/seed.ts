// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'jane.doe@example.com',
      name: 'Jane Doe',
      weeks: {
        create: {
          startDate: new Date('2024-05-01'),
          workouts: {
            create: {
              name: 'Leg Day',
              date: new Date('2024-05-02'),
              exercises: {
                create: {
                  order: 1,
                  exercise: {
                    create: {
                      name: 'Squat',
                      description: 'Barbell back squat',
                      muscleGroup: 'Legs',
                    },
                  },
                  sets: {
                    create: [
                      { reps: 10, weight: 60, setOrder: 1 },
                      { reps: 8, weight: 70, setOrder: 2 },
                      { reps: 6, weight: 80, setOrder: 3 },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`🌱 Seeded user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
