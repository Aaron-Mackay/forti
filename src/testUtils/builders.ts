import {SetPrisma, UserPrisma, WeekPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";

export class UserBuilder {
  private readonly user: UserPrisma
  constructor(id: number) {
    this.user = {
      id,
      email: 'test@test.com',
      name: 'Test User',
      weeks: [],
    }
  }
  addWeek(week: WeekPrisma)  {
    week.userId = this.user.id
    this.user.weeks.push(week)
    return this
  }
  build(): UserPrisma {
    return {...this.user}
  }
}

export class WeekBuilder {
  private readonly week: WeekPrisma;
  constructor(id: number, order = 1) {
    this.week = {
      id,
      userId: -1,
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
    return { ...this.week, workouts: [...this.week.workouts] };
  }
}

export class WorkoutBuilder {
  private readonly workout: WorkoutPrisma;
  constructor(id: number,  order = 1) {
    this.workout = {
      id,
      weekId: -1,
      name: 'Workout',
      order,
      notes: '',
      exercises: [],
    };
  }
  addExercise(ex: WorkoutExercisePrisma) {
    ex.workoutId = this.workout.id;
    this.workout.exercises.push(ex);
    return this;
  }
  build(): WorkoutPrisma {
    return { ...this.workout, exercises: [...this.workout.exercises] };
  }
}

export class ExerciseBuilder {
  private readonly exercise: WorkoutExercisePrisma;
  constructor(id: number,  order = 1) {
    this.exercise = {
      id,
      workoutId: -1,
      exerciseId: -1,
      repRange: '',
      restTime: '',
      order,
      notes: null,
      exercise: {
        id: -1,
        name: 'Bench Press',
        category: 'Chest',
        description: null,
      },
      sets: [],
    };
  }
  addSet(set: SetPrisma) {
    set.workoutExerciseId = this.exercise.id;
    this.exercise.sets.push(set);
    return this;
  }
  build(): WorkoutExercisePrisma {
    return { ...this.exercise, sets: [...this.exercise.sets] };
  }
}

export class SetBuilder {
  private readonly set: SetPrisma;
  constructor(id: number, order = 1) {
    this.set = {
      id,
      workoutExerciseId: -1,
      order,
      reps: 8,
      weight: '100',
    };
  }
  build(): SetPrisma {
    return { ...this.set };
  }
}
