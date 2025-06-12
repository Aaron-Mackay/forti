// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// todo validation of data, where is userId?

import * as Assert from "assert";

import {SetPrisma, UserPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";

export const parsePlan = (data: string): UserPrisma => {
  const arr2d = data.trim().split("\n").map(row => row.split("\t"));

  const headerRowIndexes: number[] = []
  arr2d.forEach((row, rowIndex) => {
    if (row.some(cell => cell === "EXERCISE")) {
      headerRowIndexes.push(rowIndex)
    }
  })

  const weeks = headerRowIndexes.map((start, i) => {
    const end = headerRowIndexes[i + 1]
    const weekUntrimmed = arr2d.slice(start, end);
    const workoutEndRowIndex = weekUntrimmed.findIndex((row) => row.some(cell => cell === "TRAINING NOTES"))
    return weekUntrimmed.slice(0, workoutEndRowIndex)
  });

  const parsedWeeks = weeks.map((week, i) => {
    return {
      id: (i + 1).toString(),
      order: i + 1,
      workouts: parseWeekWorkouts(week)
    }
  })

  return {
    weeks: parsedWeeks,
    id: 1,
    name: "testName"
  }
}

const parseWeekWorkouts = (week: string[][]): WorkoutPrisma[] => {

  const workouts: WorkoutPrisma[] = []
  let remainingData = [...week]
  let counter = 1
  for (;;) {
    const startColIdx = remainingData[0].findIndex(cell => cell === "EXERCISE")
    const endColIdx = remainingData[0].findIndex(cell => cell === "Volume")
    if (startColIdx === -1 || endColIdx === -1) break;
    const parsedWorkout = {
      id: counter.toString(),
      name: `Workout #${counter}`,
      order: counter++,
      exercises: parseExercises(remainingData.map(row => row.slice(startColIdx, endColIdx + 1)))
    }
    workouts.push(parsedWorkout)
    remainingData = remainingData.map(row => row.slice(endColIdx + 1))
  }

  return workouts
}

const parseExercises = (exerciseTable: string[][]): WorkoutExercisePrisma[] => {
  validateExerciseBlock(exerciseTable[0])
  const trimmedBlock = exerciseTable.filter(row => row[0])
  const parsedExercises: WorkoutExercisePrisma[] = []
  for (let i = 1; i < trimmedBlock.length; i++) {
    const exerciseRow = trimmedBlock[i]
    const exercise: WorkoutExercisePrisma = {
      id: i,
      order: i,
      repRange: exerciseRow[4],
      restTime: exerciseRow[5],
      exercise: {
        // id: i.toString(),
        name: exerciseRow[0],
        category: "N/A" // todo fix this
      },
      sets: parseSets(exerciseRow)
    }
    parsedExercises.push(exercise)
  }

  return parsedExercises
}

const validateExerciseBlock = (topRow: string[]) => {
  const correctHeaderOrder = ["EXERCISE", "", "", "SETS/REPS", "", "REST", "", "Set 1 Weight", "Set 2 Weight", "Set 3 Weight", "Set 1 Reps", "Set 2 Reps", "Set 3 Reps", "Volume"]
  Assert.equal(JSON.stringify(topRow), JSON.stringify(correctHeaderOrder), "Exercise block headers mismatch: " + topRow.toString())
}

const parseSets = (exerciseRow: string[]): SetPrisma[] => {
  const setCount = Number(exerciseRow[3])
  const parsedSets: SetPrisma[] = []
  for (let i = 7; i < 7 + setCount; i++) {
    const set: SetPrisma = {
      id: (i - 6),
      order: (i - 6),
      weight: exerciseRow[i],
      reps: Number(exerciseRow[i + 3]) || null
    }
    parsedSets.push(set)
  }

  return parsedSets
}