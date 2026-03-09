'use client'

import { useState } from 'react'
import CustomAppBar from '@/components/CustomAppBar'
import { EntryScreen } from './EntryScreen'
import { AiFormScreen } from './AiFormScreen'
import { PlanEditorScreen } from './PlanEditorScreen'

type View = 'entry' | 'ai' | 'editor'

export const PlanBuilder = () => {
  const [view, setView] = useState<View>('entry')
  const [weekCount, setWeekCount] = useState('6')

  const appBarProps: React.ComponentProps<typeof CustomAppBar> =
    view === 'entry'
      ? { title: 'Create Plan' }
      : view === 'ai'
        ? { title: 'Build with AI', showBack: true, onBack: () => setView('entry') }
        : { title: 'New Plan', showBack: true, onBack: () => setView('entry') }

  return (
    <>
      <CustomAppBar {...appBarProps} />

      {view === 'entry' && (
        <EntryScreen
          onSelectAi={() => setView('ai')}
          onSelectScratch={() => setView('editor')}
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
