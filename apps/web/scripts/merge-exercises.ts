/**
 * Merge a duplicate exercise into a canonical exercise.
 *
 * Usage:
 *   npm run merge-exercises -- --source 123 --target 456
 *   npm run merge-exercises -- --source 123 --target 456 --apply
 *   npm run merge-exercises -- --source 123 --target 456 --apply --allow-category-mismatch
 *
 * Defaults to dry-run unless --apply is provided.
 */

import prisma from '../src/lib/prisma'
import { mergeExercises } from '../src/lib/exerciseMerge'

function parseNumberFlag(flag: string) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  const rawValue = process.argv[index + 1]
  if (!rawValue) {
    throw new Error(`Missing value for ${flag}`)
  }

  const value = Number(rawValue)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid value for ${flag}: ${rawValue}`)
  }

  return value
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

async function main() {
  const sourceExerciseId = parseNumberFlag('--source')
  const targetExerciseId = parseNumberFlag('--target')

  if (sourceExerciseId == null || targetExerciseId == null) {
    throw new Error('Usage: npm run merge-exercises -- --source <id> --target <id> [--apply] [--allow-category-mismatch]')
  }

  const dryRun = !hasFlag('--apply')
  const summary = await mergeExercises(prisma as never, sourceExerciseId, targetExerciseId, {
    dryRun,
    allowCategoryMismatch: hasFlag('--allow-category-mismatch'),
  })

  console.log(`${dryRun ? 'Dry run' : 'Merged'}: ${summary.sourceExercise.name} (#${summary.sourceExercise.id}) -> ${summary.targetExercise.name} (#${summary.targetExercise.id})`)
  console.log(`Category: ${summary.sourceExercise.category ?? 'null'} -> ${summary.targetExercise.category ?? 'null'}`)
  console.log(`WorkoutExercise.exerciseId rows moved: ${summary.counts.movedWorkoutExercises}`)
  console.log(`WorkoutExercise.substitutedForId rows updated: ${summary.counts.updatedSubstitutionRefs}`)
  console.log(`UserExerciseNote rows moved: ${summary.counts.movedUserExerciseNotes}`)
  console.log(`UserExerciseNote collisions merged: ${summary.counts.mergedUserExerciseNotes}`)
  console.log(`CoachExerciseDescription rows moved: ${summary.counts.movedCoachExerciseDescriptions}`)
  console.log(`CoachExerciseDescription collisions merged: ${summary.counts.mergedCoachExerciseDescriptions}`)

  if (dryRun) {
    console.log('\nNo database changes were made. Re-run with --apply to execute the merge.')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
