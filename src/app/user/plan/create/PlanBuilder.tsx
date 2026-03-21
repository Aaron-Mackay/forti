'use client'

import { useState, useEffect } from 'react'
import CustomAppBar from '@/components/CustomAppBar'
import { EntryScreen } from './EntryScreen'
import { AiFormScreen } from './AiFormScreen'
import { PlanEditorScreen } from './PlanEditorScreen'
import { TemplateBrowserScreen } from './TemplateBrowserScreen'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { PlanPrisma } from '@/types/dataTypes'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import { parsedPlanToPlanPrisma } from './planConverter'
import type { ParsedPlan } from '@/utils/aiPlanParser'

type View = 'entry' | 'templates' | 'ai' | 'editor'

export const PlanBuilder = ({ blankPlan }: { blankPlan: PlanPrisma }) => {
  const [view, setView] = useState<View>('entry')
  const [weekCount, setWeekCount] = useState('6')
  const { dispatch } = useWorkoutEditorContext()

  const resetPlan = () => dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: blankPlan })

  // Hydrate from a spreadsheet import stored in sessionStorage by /user/plan/upload
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingUploadPlan')
    if (!raw) return
    sessionStorage.removeItem('pendingUploadPlan')
    try {
      const parsed = JSON.parse(raw) as ParsedPlan
      const plan = parsedPlanToPlanPrisma(parsed, blankPlan)
      dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan })
      setView('editor')
    } catch {
      // ignore malformed data
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const appBarProps: React.ComponentProps<typeof CustomAppBar> =
    view === 'entry'
      ? { title: 'Create Plan' }
      : view === 'templates'
        ? { title: 'Choose a Template', showBack: true, onBack: () => { resetPlan(); setView('entry') } }
        : view === 'ai'
          ? { title: 'Build with AI', showBack: true, onBack: () => setView('entry') }
          : { title: 'New Plan', showBack: true, onBack: () => setView('entry') }

  return (
    <>
      <CustomAppBar {...appBarProps} />

      {view === 'entry' && (
        <EntryScreen
          onSelectTemplates={() => setView('templates')}
          onSelectAi={() => setView('ai')}
          onSelectScratch={() => setView('editor')}
        />
      )}

      {view === 'templates' && (
        <TemplateBrowserScreen
          onSelect={(wc) => {
            setWeekCount(wc)
            setView('editor')
          }}
        />
      )}

      {view === 'ai' && (
        <AiFormScreen
          onSuccess={(wc) => {
            setWeekCount(wc)
            setView('editor')
          }}
        />
      )}

      {view === 'editor' && (
        <PlanEditorScreen weekCount={weekCount} setWeekCount={setWeekCount} />
      )}
    </>
  )
}
