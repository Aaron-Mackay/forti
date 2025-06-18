import {describe, expect, it} from "vitest";
import {updateUserSets} from "./updateUserSets";
import {ExerciseBuilder, SetBuilder, UserBuilder, WeekBuilder, WorkoutBuilder} from "@/testUtils/builders";
import {SetPrisma, UserPrisma} from "@/types/dataTypes";

function buildUser(): UserPrisma {
  const week1 = new WeekBuilder(101, 1)
    .addWorkout(new WorkoutBuilder(201, 1)
      .addExercise(new ExerciseBuilder(301, 1)
        .addSet(new SetBuilder(401, 1).build())
        .addSet(new SetBuilder(402, 2).build())
        .build())
      .addExercise(new ExerciseBuilder(302, 2)
        .addSet(new SetBuilder(403, 1).build())
        .build())
      .build())
    .build();


  const week2 = new WeekBuilder(102, 2)
    .addWorkout(new WorkoutBuilder(202, 1)
      .addExercise(new ExerciseBuilder(303, 1)
        .addSet(new SetBuilder(404, 1)
          .build()).build()).build()).build();


  return new UserBuilder(1).addWeek(week1).addWeek(week2).build()
}

describe("updateUserSets", () => {
  it("updates the sets for the correct exercise", () => {
    const user = buildUser();

    const newSets: SetPrisma[] = [
      new SetBuilder(405, 1).build(),
      new SetBuilder(406, 2).build(),
    ];

    const updatedUser = updateUserSets(
      user,
      101, // weekId
      201, // workoutId
      301, // exerciseId
      newSets
    );

    // Check that the sets for exercise 301 are updated
    const updatedSets =
      updatedUser.weeks[0].workouts[0].exercises[0].sets;
    expect(updatedSets).toEqual(newSets);

    // Other exercises remain unchanged
    expect(
      updatedUser.weeks[0].workouts[0].exercises[1].sets
    ).toEqual(user.weeks[0].workouts[0].exercises[1].sets);

    // Other weeks remain unchanged
    expect(updatedUser.weeks[1]).toEqual(user.weeks[1]);
  });

  it("does not modify user if weekId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(407, 1).build()];

    const updatedUser = updateUserSets(
      user,
      999, // non-existent weekId
      201,
      301,
      newSets
    );

    expect(updatedUser).toEqual(user);
  });

  it("does not modify user if workoutId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(408, 1).build()];

    const updatedUser = updateUserSets(
      user,
      101,
      999, // non-existent workoutId
      301,
      newSets
    );

    expect(updatedUser).toEqual(user);
  });

  it("does not modify user if exerciseId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(409, 1).build()];

    const updatedUser = updateUserSets(
      user,
      101,
      201,
      999, // non-existent exerciseId
      newSets
    );

    expect(updatedUser).toEqual(user);
  });
});