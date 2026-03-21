'use client';

import React, { useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlanPrisma, WeekPrisma, WorkoutPrisma } from '@/types/dataTypes';
import MobileExerciseCard from './MobileExerciseCard';
import ProgressIcon from '@/lib/ProgressIcon';
import { getWeekStatus, getWorkoutStatus } from '@/lib/workoutProgress';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';

interface MobilePlanViewProps {
  plan: PlanPrisma;
  planId: number;
  isInEditMode: boolean;
}

// ─── Sortable week tab ────────────────────────────────────────────────────────

interface SortableWeekTabProps {
  week: WeekPrisma;
  isActive: boolean;
  isInEditMode: boolean;
  onClick: () => void;
}

const SortableWeekTab = ({ week, isActive, isInEditMode, onClick }: SortableWeekTabProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: week.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : ('auto' as const),
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center' }}>
      {isInEditMode && (
        <Box
          component="span"
          {...attributes}
          {...listeners}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', touchAction: 'none', color: 'text.disabled', px: 0.25 }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{`Wk ${week.order}`}</span>
            <ProgressIcon status={getWeekStatus(week)} />
          </Box>
        }
        onClick={onClick}
        variant={isActive ? 'filled' : 'outlined'}
        color={isActive ? 'primary' : 'default'}
        size="small"
        sx={{ cursor: 'pointer' }}
      />
    </Box>
  );
};

// ─── Sortable workout (edit mode) ─────────────────────────────────────────────

interface SortableWorkoutProps {
  workout: WorkoutPrisma;
  isInEditMode: boolean;
  expandedNotes: Set<number>;
  onToggleNote: (id: number) => void;
}

const SortableWorkout = ({ workout, isInEditMode, expandedNotes, onToggleNote }: SortableWorkoutProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: workout.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        {isInEditMode && (
          <Box
            component="span"
            {...attributes}
            {...listeners}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', touchAction: 'none', color: 'text.disabled' }}
          >
            <DragIndicatorIcon sx={{ fontSize: 18 }} />
          </Box>
        )}
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.85rem', color: 'text.secondary' }}
        >
          {workout.name || `Workout ${workout.order}`}
        </Typography>
        <ProgressIcon status={getWorkoutStatus(workout)} />
      </Box>
      {workout.notes && (
        <Typography
          component="div"
          variant="caption"
          color="text.secondary"
          onClick={() => onToggleNote(workout.id)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, cursor: 'pointer', overflow: 'hidden' }}
        >
          <ChatBubbleOutlineIcon sx={{ fontSize: 12, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedNotes.has(workout.id) ? 'normal' : 'nowrap' }}>
            {workout.notes}
          </span>
        </Typography>
      )}
      {workout.exercises.map((exerciseLink, i) => (
        <MobileExerciseCard key={exerciseLink.id} exerciseLink={exerciseLink} index={i} />
      ))}
    </Box>
  );
};

// ─── Static workout (view mode) ───────────────────────────────────────────────

interface StaticWorkoutProps {
  workout: WorkoutPrisma;
  expandedNotes: Set<number>;
  onToggleNote: (id: number) => void;
}

const StaticWorkout = ({ workout, expandedNotes, onToggleNote }: StaticWorkoutProps) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <Typography
        variant="subtitle1"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.85rem', color: 'text.secondary' }}
      >
        {workout.name || `Workout ${workout.order}`}
      </Typography>
      <ProgressIcon status={getWorkoutStatus(workout)} />
    </Box>
    {workout.notes && (
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        onClick={() => onToggleNote(workout.id)}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, cursor: 'pointer', overflow: 'hidden' }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 12, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedNotes.has(workout.id) ? 'normal' : 'nowrap' }}>
          {workout.notes}
        </span>
      </Typography>
    )}
    {workout.exercises.map((exerciseLink, i) => (
      <MobileExerciseCard key={exerciseLink.id} exerciseLink={exerciseLink} index={i} />
    ))}
  </Box>
);

// ─── Main component ───────────────────────────────────────────────────────────

const MobilePlanView = ({ plan, planId, isInEditMode }: MobilePlanViewProps) => {
  const [activeWeekId, setActiveWeekId] = useState<number>(plan.weeks[0]?.id ?? -1);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const { dispatch } = useWorkoutEditorContext();

  const activeWeek = plan.weeks.find(w => w.id === activeWeekId) ?? plan.weeks[0];

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const toggleNote = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleWeekDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = plan.weeks.findIndex(w => w.id === active.id);
    const toIndex = plan.weeks.findIndex(w => w.id === over.id);
    dispatch({ type: 'REORDER_WEEK', planId, fromIndex, toIndex });
  };

  const handleWorkoutDragEnd = (event: DragEndEvent) => {
    if (!activeWeek) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = activeWeek.workouts.findIndex(w => w.id === active.id);
    const toIndex = activeWeek.workouts.findIndex(w => w.id === over.id);
    dispatch({ type: 'REORDER_WORKOUT', planId, weekId: activeWeek.id, fromIndex, toIndex });
  };

  const tabBarSx = {
    display: 'flex',
    gap: 0.5,
    overflowX: 'auto',
    pb: 1,
    mb: 2,
    borderBottom: 1,
    borderColor: 'divider',
  };

  return (
    <Box>
      {/* Week tabs */}
      {isInEditMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
          <SortableContext items={plan.weeks.map(w => w.id)} strategy={horizontalListSortingStrategy}>
            <Box sx={tabBarSx}>
              {plan.weeks.map(week => (
                <SortableWeekTab
                  key={week.id}
                  week={week}
                  isActive={activeWeek?.id === week.id}
                  isInEditMode={isInEditMode}
                  onClick={() => setActiveWeekId(week.id)}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      ) : (
        <Box sx={tabBarSx}>
          {plan.weeks.map(week => (
            <Chip
              key={week.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{`Wk ${week.order}`}</span>
                  <ProgressIcon status={getWeekStatus(week)} />
                </Box>
              }
              onClick={() => setActiveWeekId(week.id)}
              variant={activeWeek?.id === week.id ? 'filled' : 'outlined'}
              color={activeWeek?.id === week.id ? 'primary' : 'default'}
              size="small"
              sx={{ cursor: 'pointer', flexShrink: 0 }}
            />
          ))}
        </Box>
      )}

      {/* Workout list */}
      {isInEditMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
          <SortableContext items={activeWeek?.workouts.map(w => w.id) ?? []} strategy={verticalListSortingStrategy}>
            {activeWeek?.workouts.map(workout => (
              <SortableWorkout
                key={workout.id}
                workout={workout}
                isInEditMode={isInEditMode}
                expandedNotes={expandedNotes}
                onToggleNote={toggleNote}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        activeWeek?.workouts.map(workout => (
          <StaticWorkout
            key={workout.id}
            workout={workout}
            expandedNotes={expandedNotes}
            onToggleNote={toggleNote}
          />
        ))
      )}
    </Box>
  );
};

export default MobilePlanView;
