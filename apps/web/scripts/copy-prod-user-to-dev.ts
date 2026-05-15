/**
 * Copy one production user into development, personal data only.
 *
 * Usage:
 *   PROD_DATABASE_URL=... DEV_DATABASE_URL=... USER_EMAIL=... CONFIRM=COPY_PROD_USER_TO_DEV \
 *     npm run db:copy-user-prod-to-dev
 */

import { PrismaClient, Prisma, type Exercise } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const REQUIRED_CONFIRMATION = "COPY_PROD_USER_TO_DEV";

type SourceExercise = Pick<
  Exercise,
  | "id"
  | "name"
  | "category"
  | "description"
  | "equipment"
  | "primaryMuscles"
  | "secondaryMuscles"
  | "createdByUserId"
>;

type Summary = {
  accounts: number;
  plans: number;
  weeks: number;
  workouts: number;
  workoutExercises: number;
  sets: number;
  trainingSessions: number;
  metrics: number;
  events: number;
  targetTemplates: number;
  targetTemplateDays: number;
  supplements: number;
  supplementVersions: number;
  weeklyCheckIns: number;
  userExerciseNotes: number;
  exercisesCopiedOrLinked: number;
  accountConflictsDeleted: number;
};

function createClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function assertValidEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`USER_EMAIL is not a valid-looking email: ${email}`);
  }
}

function readConfig() {
  const prodDatabaseUrl = requiredEnv("PROD_DATABASE_URL");
  const devDatabaseUrl = requiredEnv("DEV_DATABASE_URL");
  const userEmail = requiredEnv("USER_EMAIL");
  const confirmation = requiredEnv("CONFIRM");

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`CONFIRM must exactly equal ${REQUIRED_CONFIRMATION}`);
  }

  if (prodDatabaseUrl === devDatabaseUrl) {
    throw new Error("PROD_DATABASE_URL and DEV_DATABASE_URL must not be identical");
  }

  assertValidEmail(userEmail);

  return { prodDatabaseUrl, devDatabaseUrl, userEmail };
}

function nullableJson(value: Prisma.JsonValue | null) {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function exerciseCreateData(source: SourceExercise, createdByUserId: string | null) {
  return {
    name: source.name,
    category: source.category,
    description: source.description,
    equipment: source.equipment,
    primaryMuscles: source.primaryMuscles,
    secondaryMuscles: source.secondaryMuscles,
    createdByUserId,
  };
}

async function deleteExistingDevUser(tx: Prisma.TransactionClient, email: string) {
  const existingUser = await tx.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!existingUser) {
    console.log("No existing dev user found for that email; cleanup skipped.");
    return;
  }

  console.log(`Replacing existing dev user ${existingUser.email} (${existingUser.id}).`);

  await tx.user.update({
    where: { id: existingUser.id },
    data: { activePlanId: null },
  });

  await tx.user.updateMany({
    where: { coachId: existingUser.id },
    data: { coachId: null, coachClientNotes: null },
  });

  await tx.learningPlanAssignment.deleteMany({ where: { clientId: existingUser.id } });
  await tx.learningPlan.deleteMany({ where: { coachId: existingUser.id } });
  await tx.coachRequest.deleteMany({
    where: { OR: [{ clientId: existingUser.id }, { coachId: existingUser.id }] },
  });

  await tx.trainingSession.deleteMany({ where: { userId: existingUser.id } });
  await tx.userExerciseNote.deleteMany({ where: { userId: existingUser.id } });
  await tx.weeklyCheckIn.deleteMany({ where: { userId: existingUser.id } });
  await tx.targetTemplateDay.deleteMany({
    where: { template: { userId: existingUser.id } },
  });
  await tx.targetTemplate.deleteMany({ where: { userId: existingUser.id } });
  await tx.metric.deleteMany({ where: { userId: existingUser.id } });
  await tx.event.deleteMany({ where: { userId: existingUser.id } });
  await tx.supplementVersion.deleteMany({
    where: { supplement: { userId: existingUser.id } },
  });
  await tx.supplement.deleteMany({ where: { userId: existingUser.id } });
  await tx.notification.deleteMany({ where: { userId: existingUser.id } });
  await tx.libraryAsset.deleteMany({ where: { userId: existingUser.id } });
  await tx.aiUsageLog.deleteMany({ where: { userId: existingUser.id } });
  await tx.auditEvent.deleteMany({ where: { actorUserId: existingUser.id } });

  await tx.exerciseSet.deleteMany({
    where: {
      workoutExercise: {
        workout: {
          week: {
            plan: { userId: existingUser.id },
          },
        },
      },
    },
  });
  await tx.workoutExercise.deleteMany({
    where: {
      workout: {
        week: {
          plan: { userId: existingUser.id },
        },
      },
    },
  });
  await tx.workout.deleteMany({
    where: {
      week: {
        plan: { userId: existingUser.id },
      },
    },
  });
  await tx.week.deleteMany({ where: { plan: { userId: existingUser.id } } });
  await tx.plan.deleteMany({ where: { userId: existingUser.id } });
  await tx.exercise.deleteMany({ where: { createdByUserId: existingUser.id } });

  await tx.account.deleteMany({ where: { userId: existingUser.id } });
  await tx.session.deleteMany({ where: { userId: existingUser.id } });
  await tx.mobileSession.deleteMany({ where: { userId: existingUser.id } });
  await tx.pushSubscription.deleteMany({ where: { userId: existingUser.id } });

  await tx.user.delete({ where: { id: existingUser.id } });
}

async function main() {
  const { prodDatabaseUrl, devDatabaseUrl, userEmail } = readConfig();
  const prod = createClient(prodDatabaseUrl);
  const dev = createClient(devDatabaseUrl);

  try {
    const sourceUser = await prod.user.findUnique({
      where: { email: userEmail },
      include: {
        accounts: true,
        plans: {
          orderBy: { order: "asc" },
          include: {
            weeks: {
              orderBy: { order: "asc" },
              include: {
                workouts: {
                  orderBy: { order: "asc" },
                  include: {
                    exercises: {
                      orderBy: { order: "asc" },
                      include: {
                        exercise: true,
                        substitutedFor: true,
                        sets: { orderBy: { order: "asc" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        trainingSessions: { orderBy: { performedAt: "asc" } },
        metrics: { orderBy: { date: "asc" } },
        events: { orderBy: { startDate: "asc" } },
        targetTemplates: {
          orderBy: { effectiveFrom: "asc" },
          include: { days: { orderBy: { dayOfWeek: "asc" } } },
        },
        supplements: {
          orderBy: { startDate: "asc" },
          include: { versions: { orderBy: { effectiveFrom: "asc" } } },
        },
        weeklyCheckIns: { orderBy: { weekStartDate: "asc" } },
        userExerciseNotes: {
          orderBy: { id: "asc" },
          include: { exercise: true },
        },
        createdExercises: { orderBy: { id: "asc" } },
      },
    });

    if (!sourceUser) {
      throw new Error(`Prod user not found: ${userEmail}`);
    }

    const sourceCounts = {
      accounts: sourceUser.accounts.length,
      plans: sourceUser.plans.length,
      weeks: sourceUser.plans.reduce((count, plan) => count + plan.weeks.length, 0),
      workouts: sourceUser.plans.reduce(
        (count, plan) =>
          count + plan.weeks.reduce((weekCount, week) => weekCount + week.workouts.length, 0),
        0,
      ),
      trainingSessions: sourceUser.trainingSessions.length,
      metrics: sourceUser.metrics.length,
      events: sourceUser.events.length,
      targetTemplates: sourceUser.targetTemplates.length,
      supplements: sourceUser.supplements.length,
      weeklyCheckIns: sourceUser.weeklyCheckIns.length,
      userExerciseNotes: sourceUser.userExerciseNotes.length,
      createdExercises: sourceUser.createdExercises.length,
    };

    console.log(`Found prod user: ${sourceUser.email} (${sourceUser.id})`);
    console.log("Source personal data counts:");
    console.log(JSON.stringify(sourceCounts, null, 2));

    const result = await dev.$transaction(
      async (tx) => {
        await deleteExistingDevUser(tx, sourceUser.email);

        const coachCodeConflict =
          sourceUser.coachCode == null
            ? null
            : await tx.user.findUnique({
                where: { coachCode: sourceUser.coachCode },
                select: { id: true },
              });

        if (sourceUser.coachCode && coachCodeConflict) {
          console.log("Source coachCode conflicts in dev; copied user coachCode will be null.");
        }

        const devUser = await tx.user.create({
          data: {
            email: sourceUser.email,
            name: sourceUser.name,
            image: sourceUser.image,
            emailVerified: sourceUser.emailVerified,
            settings: nullableJson(sourceUser.settings),
            checkInTemplate: nullableJson(sourceUser.checkInTemplate),
            coachId: null,
            coachClientNotes: null,
            coachCode: coachCodeConflict ? null : sourceUser.coachCode,
            coachLogoUrl: sourceUser.coachLogoUrl,
            activePlanId: null,
          },
        });

        const summary: Summary = {
          accounts: 0,
          plans: 0,
          weeks: 0,
          workouts: 0,
          workoutExercises: 0,
          sets: 0,
          trainingSessions: 0,
          metrics: 0,
          events: 0,
          targetTemplates: 0,
          targetTemplateDays: 0,
          supplements: 0,
          supplementVersions: 0,
          weeklyCheckIns: 0,
          userExerciseNotes: 0,
          exercisesCopiedOrLinked: 0,
          accountConflictsDeleted: 0,
        };

        for (const account of sourceUser.accounts) {
          const conflictingAccounts = await tx.account.findMany({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
            select: { id: true, userId: true },
          });

          if (conflictingAccounts.length > 0) {
            await tx.account.deleteMany({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
            summary.accountConflictsDeleted += conflictingAccounts.length;
            console.log(
              `Deleted ${conflictingAccounts.length} conflicting dev Account row(s) for provider ${account.provider}.`,
            );
          }

          await tx.account.create({
            data: {
              userId: devUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });
          summary.accounts += 1;
        }

        const planIdMap = new Map<number, number>();
        const weekIdMap = new Map<number, number>();
        const workoutIdMap = new Map<number, number>();
        const workoutExerciseIdMap = new Map<number, number>();
        const setIdMap = new Map<number, number>();
        const exerciseIdMap = new Map<number, number>();
        const targetTemplateIdMap = new Map<number, number>();
        const supplementIdMap = new Map<number, number>();
        const sourceExercises = new Map<number, SourceExercise>();

        for (const exercise of sourceUser.createdExercises) {
          sourceExercises.set(exercise.id, exercise);
        }

        for (const plan of sourceUser.plans) {
          for (const week of plan.weeks) {
            for (const workout of week.workouts) {
              for (const workoutExercise of workout.exercises) {
                sourceExercises.set(workoutExercise.exercise.id, workoutExercise.exercise);
                if (workoutExercise.substitutedFor) {
                  sourceExercises.set(workoutExercise.substitutedFor.id, workoutExercise.substitutedFor);
                }
              }
            }
          }
        }

        for (const note of sourceUser.userExerciseNotes) {
          sourceExercises.set(note.exercise.id, note.exercise);
        }

        // @ts-expect-error ignore for now
        for (const sourceExercise of [...sourceExercises.values()].sort((a, b) => a.id - b.id)) {
          if (sourceExercise.createdByUserId === sourceUser.id) {
            const copiedExercise = await tx.exercise.create({
              data: exerciseCreateData(sourceExercise, devUser.id),
            });
            exerciseIdMap.set(sourceExercise.id, copiedExercise.id);
            continue;
          }

          const existingGlobal = await tx.exercise.findFirst({
            where: {
              name: sourceExercise.name,
              category: sourceExercise.category,
              createdByUserId: null,
            },
            select: { id: true },
          });

          if (existingGlobal) {
            exerciseIdMap.set(sourceExercise.id, existingGlobal.id);
            continue;
          }

          if (sourceExercise.createdByUserId !== null) {
            console.log(
              `Warning: exercise ${sourceExercise.id} is owned by another prod user; creating a global fallback by name/category.`,
            );
          }

          const createdGlobal = await tx.exercise.create({
            data: exerciseCreateData(sourceExercise, null),
          });
          exerciseIdMap.set(sourceExercise.id, createdGlobal.id);
        }

        summary.exercisesCopiedOrLinked = exerciseIdMap.size;

        for (const plan of sourceUser.plans) {
          const copiedPlan = await tx.plan.create({
            data: {
              userId: devUser.id,
              order: plan.order,
              name: plan.name,
              description: plan.description,
              clientCanEdit: plan.clientCanEdit,
              lastActivityDate: plan.lastActivityDate,
            },
          });
          planIdMap.set(plan.id, copiedPlan.id);
          summary.plans += 1;

          for (const week of plan.weeks) {
            const copiedWeek = await tx.week.create({
              data: {
                planId: copiedPlan.id,
                order: week.order,
              },
            });
            weekIdMap.set(week.id, copiedWeek.id);
            summary.weeks += 1;

            for (const workout of week.workouts) {
              const copiedWorkout = await tx.workout.create({
                data: {
                  weekId: copiedWeek.id,
                  order: workout.order,
                  name: workout.name,
                  notes: workout.notes,
                  dateCompleted: workout.dateCompleted,
                },
              });
              workoutIdMap.set(workout.id, copiedWorkout.id);
              summary.workouts += 1;

              for (const workoutExercise of workout.exercises) {
                const exerciseId = exerciseIdMap.get(workoutExercise.exerciseId);
                if (!exerciseId) {
                  throw new Error(`Missing exercise map for Exercise ${workoutExercise.exerciseId}`);
                }

                const copiedWorkoutExercise = await tx.workoutExercise.create({
                  data: {
                    workoutId: copiedWorkout.id,
                    exerciseId,
                    order: workoutExercise.order,
                    restTime: workoutExercise.restTime,
                    repRange: workoutExercise.repRange,
                    notes: workoutExercise.notes,
                    targetRpe: workoutExercise.targetRpe,
                    targetRir: workoutExercise.targetRir,
                    cardioDuration: workoutExercise.cardioDuration,
                    cardioDistance: workoutExercise.cardioDistance,
                    cardioResistance: workoutExercise.cardioResistance,
                    substitutedForId:
                      workoutExercise.substitutedForId == null
                        ? null
                        : exerciseIdMap.get(workoutExercise.substitutedForId) ?? null,
                    isAdded: workoutExercise.isAdded,
                    isBfr: workoutExercise.isBfr,
                    requiresRecording: workoutExercise.requiresRecording,
                    excludeFromHistory: workoutExercise.excludeFromHistory,
                  },
                });
                workoutExerciseIdMap.set(workoutExercise.id, copiedWorkoutExercise.id);
                summary.workoutExercises += 1;

                for (const set of workoutExercise.sets) {
                  const copiedSet = await tx.exerciseSet.create({
                    data: {
                      workoutExerciseId: copiedWorkoutExercise.id,
                      order: set.order,
                      reps: set.reps,
                      weight: set.weight,
                      e1rm: set.e1rm,
                      rpe: set.rpe,
                      rir: set.rir,
                      isDropSet: set.isDropSet,
                      parentSetId: null,
                    },
                  });
                  setIdMap.set(set.id, copiedSet.id);
                  summary.sets += 1;
                }
              }
            }
          }
        }

        for (const plan of sourceUser.plans) {
          for (const week of plan.weeks) {
            for (const workout of week.workouts) {
              for (const workoutExercise of workout.exercises) {
                for (const set of workoutExercise.sets) {
                  if (set.parentSetId == null) {
                    continue;
                  }

                  const copiedSetId = setIdMap.get(set.id);
                  const copiedParentSetId = setIdMap.get(set.parentSetId);
                  if (!copiedSetId || !copiedParentSetId) {
                    console.log(`Warning: drop-set parent link skipped for source ExerciseSet ${set.id}.`);
                    continue;
                  }

                  await tx.exerciseSet.update({
                    where: { id: copiedSetId },
                    data: { parentSetId: copiedParentSetId },
                  });
                }
              }
            }
          }
        }

        for (const session of sourceUser.trainingSessions) {
          await tx.trainingSession.create({
            data: {
              userId: devUser.id,
              sessionType: session.sessionType,
              status: session.status,
              performedAt: session.performedAt,
              workoutId: session.workoutId == null ? null : workoutIdMap.get(session.workoutId) ?? null,
              activityType: session.activityType,
              durationSec: session.durationSec,
              distanceM: session.distanceM,
              avgPace: session.avgPace,
              avgHr: session.avgHr,
              calories: session.calories,
              notes: session.notes,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
            },
          });
          summary.trainingSessions += 1;
        }

        for (const metric of sourceUser.metrics) {
          await tx.metric.create({
            data: {
              userId: devUser.id,
              weight: metric.weight,
              steps: metric.steps,
              sleepMins: metric.sleepMins,
              calories: metric.calories,
              protein: metric.protein,
              carbs: metric.carbs,
              fat: metric.fat,
              date: metric.date,
              customMetrics: nullableJson(metric.customMetrics),
            },
          });
          summary.metrics += 1;
        }

        for (const event of sourceUser.events) {
          await tx.event.create({
            data: {
              userId: devUser.id,
              name: event.name,
              description: event.description,
              startDate: event.startDate,
              endDate: event.endDate,
              customColor: event.customColor,
              eventType: event.eventType,
              blockSubtype: event.blockSubtype,
              recurrenceFrequency: event.recurrenceFrequency,
              recurrenceEnd: event.recurrenceEnd,
            },
          });
          summary.events += 1;
        }

        for (const template of sourceUser.targetTemplates) {
          const copiedTemplate = await tx.targetTemplate.create({
            data: {
              userId: devUser.id,
              effectiveFrom: template.effectiveFrom,
              createdAt: template.createdAt,
              stepsTarget: template.stepsTarget,
              sleepMinsTarget: template.sleepMinsTarget,
            },
          });
          targetTemplateIdMap.set(template.id, copiedTemplate.id);
          summary.targetTemplates += 1;

          for (const day of template.days) {
            await tx.targetTemplateDay.create({
              data: {
                templateId: copiedTemplate.id,
                dayOfWeek: day.dayOfWeek,
                caloriesTarget: day.caloriesTarget,
                proteinTarget: day.proteinTarget,
                carbsTarget: day.carbsTarget,
                fatTarget: day.fatTarget,
              },
            });
            summary.targetTemplateDays += 1;
          }
        }

        for (const supplement of sourceUser.supplements) {
          const copiedSupplement = await tx.supplement.create({
            data: {
              userId: devUser.id,
              name: supplement.name,
              startDate: supplement.startDate,
              endDate: supplement.endDate,
              createdAt: supplement.createdAt,
              updatedAt: supplement.updatedAt,
            },
          });
          supplementIdMap.set(supplement.id, copiedSupplement.id);
          summary.supplements += 1;

          for (const version of supplement.versions) {
            await tx.supplementVersion.create({
              data: {
                supplementId: copiedSupplement.id,
                effectiveFrom: version.effectiveFrom,
                dosage: version.dosage,
                frequency: version.frequency,
                notes: version.notes,
              },
            });
            summary.supplementVersions += 1;
          }
        }

        for (const checkIn of sourceUser.weeklyCheckIns) {
          await tx.weeklyCheckIn.create({
            data: {
              userId: devUser.id,
              weekStartDate: checkIn.weekStartDate,
              completedAt: checkIn.completedAt,
              energyLevel: checkIn.energyLevel,
              moodRating: checkIn.moodRating,
              stressLevel: checkIn.stressLevel,
              sleepQuality: checkIn.sleepQuality,
              recoveryRating: checkIn.recoveryRating,
              adherenceRating: checkIn.adherenceRating,
              completedWorkouts: checkIn.completedWorkouts,
              plannedWorkouts: checkIn.plannedWorkouts,
              weekReview: checkIn.weekReview,
              coachMessage: checkIn.coachMessage,
              goalsNextWeek: checkIn.goalsNextWeek,
              customResponses: nullableJson(checkIn.customResponses),
              templateSnapshot: nullableJson(checkIn.templateSnapshot),
              coachNotes: checkIn.coachNotes,
              coachResponseUrl: checkIn.coachResponseUrl,
              coachReviewedAt: checkIn.coachReviewedAt,
              frontPhotoUrl: checkIn.frontPhotoUrl,
              backPhotoUrl: checkIn.backPhotoUrl,
              sidePhotoUrl: checkIn.sidePhotoUrl,
            },
          });
          summary.weeklyCheckIns += 1;
        }

        for (const note of sourceUser.userExerciseNotes) {
          const exerciseId = exerciseIdMap.get(note.exerciseId);
          if (!exerciseId) {
            console.log(`Warning: user exercise note skipped; missing exercise map for ${note.exerciseId}.`);
            continue;
          }

          await tx.userExerciseNote.create({
            data: {
              userId: devUser.id,
              exerciseId,
              note: note.note,
            },
          });
          summary.userExerciseNotes += 1;
        }

        if (sourceUser.activePlanId && planIdMap.has(sourceUser.activePlanId)) {
          await tx.user.update({
            where: { id: devUser.id },
            data: { activePlanId: planIdMap.get(sourceUser.activePlanId)! },
          });
        }

        const unsafeAccountTokenCount = await tx.account.count({
          where: {
            userId: devUser.id,
            OR: [
              { refresh_token: { not: null } },
              { access_token: { not: null } },
              { expires_at: { not: null } },
              { token_type: { not: null } },
              { scope: { not: null } },
              { id_token: { not: null } },
              { session_state: { not: null } },
            ],
          },
        });

        if (unsafeAccountTokenCount > 0) {
          throw new Error("Sanity check failed: copied Account rows contain OAuth token fields");
        }

        const copiedSessionCount = await tx.session.count({ where: { userId: devUser.id } });
        const copiedMobileSessionCount = await tx.mobileSession.count({ where: { userId: devUser.id } });
        const copiedPushSubscriptionCount = await tx.pushSubscription.count({ where: { userId: devUser.id } });

        if (copiedSessionCount || copiedMobileSessionCount || copiedPushSubscriptionCount) {
          throw new Error("Sanity check failed: auth/device session rows exist for copied dev user");
        }

        // These maps are intentionally maintained for explicit remapping and safety checks.
        void weekIdMap;
        void workoutExerciseIdMap;
        void targetTemplateIdMap;
        void supplementIdMap;

        return { devUserId: devUser.id, summary };
      },
      { maxWait: 10_000, timeout: 600_000 },
    );

    console.log("");
    console.log(`Copied user: ${sourceUser.email}`);
    console.log(`New dev user id: ${result.devUserId}`);
    console.log(`Accounts copied: ${result.summary.accounts}`);
    console.log(`Account conflicts deleted in dev: ${result.summary.accountConflictsDeleted}`);
    console.log(`Plans copied: ${result.summary.plans}`);
    console.log(`Weeks copied: ${result.summary.weeks}`);
    console.log(`Workouts copied: ${result.summary.workouts}`);
    console.log(`Workout exercises copied: ${result.summary.workoutExercises}`);
    console.log(`Sets copied: ${result.summary.sets}`);
    console.log(`Training sessions copied: ${result.summary.trainingSessions}`);
    console.log(`Metrics copied: ${result.summary.metrics}`);
    console.log(`Events copied: ${result.summary.events}`);
    console.log(`Target templates copied: ${result.summary.targetTemplates}`);
    console.log(`Target template days copied: ${result.summary.targetTemplateDays}`);
    console.log(`Supplements copied: ${result.summary.supplements}`);
    console.log(`Supplement versions copied: ${result.summary.supplementVersions}`);
    console.log(`Weekly check-ins copied: ${result.summary.weeklyCheckIns}`);
    console.log(`User exercise notes copied: ${result.summary.userExerciseNotes}`);
    console.log(`Exercises copied/linked: ${result.summary.exercisesCopiedOrLinked}`);
    console.log("Skipped relationship-aware models: CoachRequest, LearningPlan, LearningPlanAssignment, CoachExerciseNote");
    console.log("Skipped auth/device models: Session, MobileSession, PushSubscription");
    console.log("Skipped audit/usage models: AiUsageLog, AuditEvent");
    console.log("OAuth token fields were not copied from Account rows.");
  } finally {
    await Promise.all([prod.$disconnect(), dev.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
