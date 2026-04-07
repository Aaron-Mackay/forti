'use client'

import { useState, useEffect } from 'react'
import { useAppBar } from '@lib/providers/AppBarProvider'
import { useRouter } from 'next/navigation'
import { EntryScreen } from './EntryScreen'
import { AiFormScreen } from './AiFormScreen'
import { PlanEditorScreen } from './PlanEditorScreen'
import { TemplateBrowserScreen } from './TemplateBrowserScreen'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { PlanPrisma } from '@/types/dataTypes'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import { parsedPlanToPlanPrisma } from './planConverter'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import { applyReviewedExercisesToPlan, PendingUploadPlan } from '@/app/user/plan/upload/uploadFlow'

type View = 'entry' | 'templates' | 'ai' | 'editor'
type EditorSource = 'scratch' | 'template' | 'ai' | 'import'

export const PlanBuilder = ({ blankPlan, clientId }: { blankPlan: PlanPrisma, clientId?: string }) => {
  const [view, setView] = useState<View>('entry')
  const [weekCount, setWeekCount] = useState('6')
  const [editorInitialViewMode, setEditorInitialViewMode] = useState<'classic' | 'sheet'>('classic')
  const [editorSource, setEditorSource] = useState<EditorSource>('scratch')
  const { dispatch } = useWorkoutEditorContext()
  const router = useRouter()

  const resetPlan = () => dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: blankPlan })

  const handleBack = clientId
    ? () => router.push(`/user/coach/clients/${clientId}/plans`)
    : undefined

  // Hydrate from a spreadsheet import stored in sessionStorage by /user/plan/upload
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingUploadPlan')
    if (!raw) return
    sessionStorage.removeItem('pendingUploadPlan')
    try {
      const parsed = JSON.parse(raw) as ParsedPlan | PendingUploadPlan
      const pendingUpload = 'plan' in parsed
        ? parsed
        : { plan: parsed, reviewedExercises: [] }
      const hydratedPlan = applyReviewedExercisesToPlan(pendingUpload.plan, pendingUpload.reviewedExercises)
      const plan = parsedPlanToPlanPrisma(hydratedPlan, blankPlan, pendingUpload.reviewedExercises)
      dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan })
      setWeekCount(String(plan.weeks.length))
      setEditorInitialViewMode('sheet')
      setEditorSource('import')
      setView('editor')
    } catch {
      // ignore malformed data
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const appBarConfig =
    view === 'entry'
      ? clientId
        ? { title: 'Create Plan', showBack: true as const, onBack: handleBack }
        : { title: 'Create Plan' }
      : view === 'templates'
        ? { title: 'Choose a Template', showBack: true as const, onBack: () => { resetPlan(); setView('entry') } }
        : view === 'ai'
          ? { title: 'Build with AI', showBack: true as const, onBack: () => setView('entry') }
          : { title: 'New Plan', showBack: true as const, onBack: () => setView('entry') }

  useAppBar(appBarConfig);

  return (
    <>

      {view === 'entry' && (
        <EntryScreen
          onSelectTemplates={() => setView('templates')}
          onSelectAi={() => setView('ai')}
          onSelectScratch={() => {
            setEditorInitialViewMode('classic')
            setEditorSource('scratch')
            setView('editor')
          }}
        />
      )}

      {view === 'templates' && (
        <TemplateBrowserScreen
          onSelect={(wc) => {
            setWeekCount(wc)
            setEditorInitialViewMode('classic')
            setEditorSource('template')
            setView('editor')
          }}
        />
      )}

      {view === 'ai' && (
        <AiFormScreen
          onSuccess={(wc) => {
            setWeekCount(wc)
            setEditorInitialViewMode('classic')
            setEditorSource('ai')
            setView('editor')
          }}
        />
      )}

      {view === 'editor' && (
        <PlanEditorScreen
          weekCount={weekCount}
          setWeekCount={setWeekCount}
          clientId={clientId}
          initialViewMode={editorInitialViewMode}
          source={editorSource}
        />
      )}
    </>
  )
}
