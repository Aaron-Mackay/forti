import {ExerciseCategory} from "@prisma/client";
import {
  SetPrisma,
  UserPrisma,
  PlanPrisma,
  WeekPrisma,
  WorkoutPrisma,
  WorkoutExercisePrisma,
} from "@/types/dataTypes";

/**
 * Builder for UserPrisma, now with plans.
 */
export class UserBuilder {
  private readonly user: UserPrisma;
  constructor(id: number) {
    this.user = {
      id: id.toString(),
      email: "test@test.com",
      name: "Test User",
      plans: [],
      userExerciseNotes: [],
      image: null,
      emailVerified: null,
      settings: null,
      coachId: null,
      coachCode: null,
    };
  }
  addPlan(plan: PlanPrisma) {
    plan.userId = this.user.id;
    this.user.plans.push(plan);
    return this;
  }
  build(): UserPrisma {
    // Deep copy plans
    return {
      ...this.user,
      plans: this.user.plans.map((plan) => ({
        ...plan,
        weeks: plan.weeks.map((week) => ({
          ...week,
          workouts: week.workouts.map((workout) => ({
            ...workout,
            exercises: workout.exercises.map((ex) => ({
              ...ex,
              sets: [...ex.sets],
            })),
          })),
        })),
      })),
    };
  }
}

/**
 * Builder for PlanPrisma.
 */
export class PlanBuilder {
  private readonly plan: PlanPrisma;
  constructor(id: number, order = 1) {
    this.plan = {
      id,
      userId: "-1",
      order,
      name: "Test Plan",
      description: "",
      weeks: [],
    };
  }
  addWeek(week: WeekPrisma)  {
    week.planId = this.plan.id;
    this.plan.weeks.push(week);
    return this;
  }
  build(): PlanPrisma {
    return {
      ...this.plan,
      weeks: this.plan.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((workout) => ({
          ...workout,
          exercises: workout.exercises.map((ex) => ({
            ...ex,
            sets: [...ex.sets],
          })),
        })),
      })),
    };
  }
}

/**
 * Builder for WeekPrisma.
 */
export class WeekBuilder {
  private readonly week: WeekPrisma;
  constructor(id: number, order = 1) {
    this.week = {
      id,
      planId: -1,
      order,
      workouts: [],
    };
  }
  addWorkout(w: WorkoutPrisma) {
    w.weekId = this.week.id;
    this.week.workouts.push(w);
    return this;
  }
  build(): WeekPrisma {
    return {
      ...this.week,
      workouts: this.week.workouts.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((ex) => ({
          ...ex,
          sets: [...ex.sets],
        })),
      })),
    };
  }
}

/**
 * Builder for WorkoutPrisma.
 */
export class WorkoutBuilder {
  private readonly workout: WorkoutPrisma;
  constructor(id: number,  order = 1) {
    this.workout = {
      id,
      weekId: -1,
      name: "Workout",
      order,
      notes: "",
      exercises: [],
      dateCompleted: null,
    };
  }
  addExercise(ex: WorkoutExercisePrisma) {
    ex.workoutId = this.workout.id;
    this.workout.exercises.push(ex);
    return this;
  }
  build(): WorkoutPrisma {
    return {
      ...this.workout,
      exercises: this.workout.exercises.map((ex) => ({
        ...ex,
        sets: [...ex.sets],
      })),
    };
  }
}

/**
 * Builder for WorkoutExercisePrisma.
 */
export class ExerciseBuilder {
  private readonly exercise: WorkoutExercisePrisma;
  constructor(id: number,  order = 1) {
    this.exercise = {
      id,
      workoutId: -1,
      exerciseId: -1,
      repRange: "",
      restTime: "",
      order,
      notes: "",
      exercise: {
        id: -1,
        name: "Bench Press",
        category: ExerciseCategory.resistance,
        description: null,
        equipment: [],
        primaryMuscles: [],
        secondaryMuscles: [],
        createdByUserId: null,
      },
      sets: [],
      cardioDuration: null,
      cardioDistance: null,
      cardioResistance: null,
      substitutedForId: null,
      substitutedFor: null,
      isAdded: false,
    };
  }
  addSet(set: SetPrisma) {
    set.workoutExerciseId = this.exercise.id;
    this.exercise.sets.push(set);
    return this;
  }
  build(): WorkoutExercisePrisma {
    return {
      ...this.exercise,
      sets: [...this.exercise.sets],
    };
  }
}

/**
 * Builder for SetPrisma.
 */
export class SetBuilder {
  private readonly set: SetPrisma;
  constructor(id: number, order = 1) {
    this.set = {
      id,
      workoutExerciseId: -1,
      order,
      reps: 8,
      weight: 100,
      e1rm: null,
      rpe: null,
      rir: null,
      isDropSet: false,
      parentSetId: null,
    };
  }
  build(): SetPrisma {
    return { ...this.set };
  }
}
