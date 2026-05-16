import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { usePlanEditorHistory, type PlanEditorSnapshot } from './usePlanEditorHistory'
import type { PlanPrisma } from '@/types/dataTypes'

function makeSnapshot(name: string, weekCount = '4'): PlanEditorSnapshot {
  return { plan: { id: 1, name, weeks: [] } as unknown as PlanPrisma, weekCount }
}

function useHarness(initial: PlanEditorSnapshot, maxEntries?: number) {
  const [snapshot, setSnapshot] = useState(initial)
  const history = usePlanEditorHistory({ current: snapshot, restore: setSnapshot, maxEntries })
  return { snapshot, setSnapshot, history }
}

describe('usePlanEditorHistory', () => {
  it('recordCheckpoint + undo/redo works', () => {
    const { result } = renderHook(() => useHarness(makeSnapshot('A')))
    act(() => result.current.history.recordCheckpoint())
    act(() => result.current.setSnapshot(makeSnapshot('B')))
    act(() => result.current.history.undo())
    expect(result.current.snapshot.plan.name).toBe('A')
    act(() => result.current.history.redo())
    expect(result.current.snapshot.plan.name).toBe('B')
  })

  it('new edit after undo clears redo and maxEntries caps', () => {
    const { result } = renderHook(() => useHarness(makeSnapshot('A'), 2))
    act(() => { result.current.history.recordCheckpoint(); result.current.setSnapshot(makeSnapshot('B')) })
    act(() => { result.current.history.recordCheckpoint(); result.current.setSnapshot(makeSnapshot('C')) })
    act(() => { result.current.history.recordCheckpoint(); result.current.setSnapshot(makeSnapshot('D')) })
    act(() => result.current.history.undo())
    act(() => result.current.history.recordCheckpoint())
    act(() => result.current.setSnapshot(makeSnapshot('X')))
    expect(result.current.history.canRedo).toBe(false)
  })

  it('buffered edit creates one entry and no-op commit does not', () => {
    const { result } = renderHook(() => useHarness(makeSnapshot('A')))
    act(() => result.current.history.beginBufferedEdit())
    act(() => result.current.setSnapshot(makeSnapshot('AB')))
    act(() => result.current.setSnapshot(makeSnapshot('ABC')))
    act(() => result.current.history.commitBufferedEdit())
    expect(result.current.history.canUndo).toBe(true)
    act(() => result.current.history.undo())
    expect(result.current.snapshot.plan.name).toBe('A')

    act(() => result.current.history.beginBufferedEdit())
    act(() => result.current.history.commitBufferedEdit())
    expect(result.current.history.canUndo).toBe(false)
  })
})
