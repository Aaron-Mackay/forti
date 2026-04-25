'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { PlanPrisma } from '@/types/dataTypes'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog'
import { MenuState } from './PlanSheetShared'
import { PlanSheetWeekBlock } from './PlanSheetBlocks'
import { PlanSheetExerciseMenu } from './PlanSheetExerciseMenu'

interface PlanSheetViewProps {
  plan: PlanPrisma
  planId: number
  zoom: number
  onZoomChange: (zoom: number) => void
  arrangeMode: boolean
  creationMode?: boolean
  showWeekHeaders?: boolean
  invalidRepRangeIds?: Set<number>
  onRepRangeFocus?: (exerciseId: number) => void
  onRepRangeBlur?: (exerciseId: number) => void
}

const PlanSheetView = ({
  plan,
  planId,
  zoom,
  onZoomChange,
  arrangeMode,
  creationMode = false,
  showWeekHeaders = false,
  invalidRepRangeIds,
  onRepRangeFocus,
  onRepRangeBlur,
}: PlanSheetViewProps) => {
  const { dispatch, allExercises } = useWorkoutEditorContext()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ weekId: number; workoutId: number } | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ weekId: number; workoutId: number; workoutExerciseId: number } | null>(null)
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const pinchRef = useRef<{ startDist: number; startZoom: number; midX: number; midY: number; contentX: number; contentY: number } | null>(null)

  const openRenamePicker = useCallback((weekId: number, workoutId: number, workoutExerciseId: number) => {
    setRenameTarget({ weekId, workoutId, workoutExerciseId })
  }, [])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.zoom = String(zoom)
    }
  }, [zoom])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const getTouchDistance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      )

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinchRef.current = null
        return
      }

      const container = scrollRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const startDist = getTouchDistance(event.touches)
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top
      const contentX = (midX + container.scrollLeft) / zoomRef.current
      const contentY = (midY + container.scrollTop) / zoomRef.current
      pinchRef.current = { startDist, startZoom: zoomRef.current, midX, midY, contentX, contentY }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return
      event.preventDefault()

      const dist = getTouchDistance(event.touches)
      const rawZoom = pinchRef.current.startZoom * (dist / pinchRef.current.startDist)
      const clampedZoom = Math.max(0.25, Math.min(1, rawZoom))
      zoomRef.current = clampedZoom

      if (innerRef.current) {
        innerRef.current.style.zoom = String(clampedZoom)
      }

      if (scrollRef.current) {
        const { midX, midY, contentX, contentY } = pinchRef.current
        scrollRef.current.scrollLeft = contentX * clampedZoom - midX
        scrollRef.current.scrollTop = contentY * clampedZoom - midY
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2 && pinchRef.current) {
        onZoomChange(zoomRef.current)
        pinchRef.current = null
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onZoomChange])

  const sortedWeeks = useMemo(() => [...plan.weeks].sort((a, b) => a.order - b.order), [plan.weeks])
  const maxWorkoutCount = useMemo(() => Math.max(0, ...sortedWeeks.map((week) => week.workouts.length)), [sortedWeeks])
  const slotMaxSets = useMemo<number[]>(
    () =>
      Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
        let max = 0
        for (const week of sortedWeeks) {
          const workout = week.workouts.find((entry) => entry.order === slotIdx + 1)
          if (!workout) continue
          for (const exercise of workout.exercises) {
            if (exercise.exercise?.category === 'cardio') continue
            const topLevelSetCount = exercise.sets.filter((set) => !set.isDropSet).length
            if (topLevelSetCount > max) max = topLevelSetCount
          }
        }
        return max
      }),
    [maxWorkoutCount, sortedWeeks],
  )

  const menuEx = useMemo(
    () =>
      menuState
        ? plan.weeks.find((week) => week.id === menuState.weekId)
          ?.workouts.find((workout) => workout.id === menuState.workoutId)
          ?.exercises.find((exercise) => exercise.id === menuState.exerciseId) ?? null
        : null,
    [menuState, plan.weeks],
  )
  const menuTopLevelSets = useMemo(
    () => menuEx?.sets.filter((set) => !set.isDropSet).sort((a, b) => a.order - b.order) ?? [],
    [menuEx],
  )
  const menuDropSets = useMemo(
    () => menuEx?.sets.filter((set) => set.isDropSet).sort((a, b) => a.order - b.order) ?? [],
    [menuEx],
  )

  const closeMenu = () => setMenuState(null)
  const openPicker = (weekId: number, workoutId: number) => {
    setPickerTarget({ weekId, workoutId })
    setPickerOpen(true)
  }

  if (maxWorkoutCount === 0) {
    const lastWeek = sortedWeeks[sortedWeeks.length - 1]

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No workouts yet.
        </Typography>
        <Box
          sx={{ mt: 1, cursor: 'pointer', display: 'inline-block' }}
          onClick={() => {
            if (lastWeek) {
              dispatch({ type: 'ADD_WORKOUT', planId, weekId: lastWeek.id })
              return
            }
            dispatch({ type: 'ADD_WEEK', planId })
          }}
        >
          <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', userSelect: 'none' }}>
            {lastWeek ? '+ Workout' : '+ Week'}
          </Typography>
        </Box>
      </>
    )
  }

  return (
    <>
      <Box ref={scrollRef} sx={{ overflow: 'auto', touchAction: 'pan-x pan-y', height: 'calc(100dvh - 200px)' }}>
        <Box ref={innerRef} sx={{ width: 'max-content', zoom }}>
          {sortedWeeks.map((week) => (
            <PlanSheetWeekBlock
              key={week.id}
              week={week}
              planId={planId}
              maxWorkoutCount={maxWorkoutCount}
              slotMaxSets={slotMaxSets}
              creationMode={creationMode}
              dispatch={dispatch}
              arrangeMode={arrangeMode}
              showWeekHeader={!creationMode || showWeekHeaders}
              openPicker={openPicker}
              openRenamePicker={openRenamePicker}
              setMenuState={setMenuState}
              invalidRepRangeIds={invalidRepRangeIds}
              onRepRangeFocus={onRepRangeFocus}
              onRepRangeBlur={onRepRangeBlur}
            />
          ))}

          {!arrangeMode && !creationMode && (
            <Box
              onClick={() => {
                const lastWeek = sortedWeeks[sortedWeeks.length - 1]
                if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id })
              }}
              aria-label="Add week"
              sx={{
                mt: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                color: 'primary.main',
                opacity: 0.35,
                py: 1,
                minWidth: '8rem',
                '&:hover': { opacity: 0.9 },
                transition: 'opacity 0.15s',
              }}
            >
              <AddIcon sx={{ fontSize: '1rem' }} />
            </Box>
          )}
        </Box>
      </Box>

      <PlanSheetExerciseMenu
        dispatch={dispatch}
        menuState={menuState}
        menuEx={menuEx}
        menuTopLevelSets={menuTopLevelSets}
        menuDropSets={menuDropSets}
        onClose={closeMenu}
        planId={planId}
      />

      <ExercisePickerDialog
        open={pickerOpen}
        title="Add Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setPickerOpen(false)
          if (pickerTarget) {
            dispatch({ type: 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE', planId, weekId: pickerTarget.weekId, workoutId: pickerTarget.workoutId, exercise })
          }
        }}
      />

      <ExercisePickerDialog
        open={renameTarget !== null}
        title="Change Exercise"
        onClose={() => setRenameTarget(null)}
        onSelect={(exercise) => {
          if (renameTarget) {
            dispatch({
              type: 'UPDATE_EXERCISE',
              planId,
              weekId: renameTarget.weekId,
              workoutId: renameTarget.workoutId,
              workoutExerciseId: renameTarget.workoutExerciseId,
              exerciseName: exercise.name,
              exercises: allExercises,
              category: exercise.category ?? 'resistance',
            })
          }
          setRenameTarget(null)
        }}
      />
    </>
  )
}

export default PlanSheetView
