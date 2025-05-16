import {Prisma, PrismaClient} from "@prisma/client";
import {NextRequest, NextResponse} from "next/server";
import {SerialisedFullUser} from "@/types/fullUser";

const prisma = new PrismaClient();

type FullUserData = Prisma.UserGetPayload<{
  include: {
    weeks: {
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                exercise: true;
                sets: true;
              }
            };
          };
        };
      };
    };
  };
}>;

function serializeUser(user: FullUserData): SerialisedFullUser {
  return {
    ...user,
    weeks: user.weeks.map(week => ({
      ...week,
      workouts: week.workouts.map(workout => ({
        ...workout,
        exercises: workout.exercises.map(ex => ({
          ...ex,
          sets: ex.sets,
          exercise: ex.exercise,
        })),
      })),
    })),
  };
}


export async function GET(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    const data: FullUserData | null = (await prisma.user.findUnique({
      where: {id: Number(params.userId)},
      include: {
        weeks: {
          include: {
            workouts: {
              orderBy: {order: 'asc'},
              include: {
                exercises: {
                  orderBy: {order: 'asc'},
                  include: {
                    exercise: true,
                    sets: {
                      orderBy: { order: 'asc'}
                    },
                  },
                },
              },
            },
          },
        },
      },
    })) as FullUserData;

    return NextResponse.json(serializeUser(data));
  } catch (err: any) {
    return NextResponse.json({error: err.message}, {status: 500});
  }
}