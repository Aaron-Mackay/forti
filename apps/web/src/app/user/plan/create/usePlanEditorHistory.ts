'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { PlanPrisma } from '@/types/dataTypes'

export type PlanEditorSnapshot = {
  plan: PlanPrisma
  weekCount: string
}

type UsePlanEditorHistoryArgs = {
  current: PlanEditorSnapshot
  restore: (snapshot: PlanEditorSnapshot) => void
  maxEntries?: number
}

const cloneSnapshot = (snapshot: PlanEditorSnapshot): PlanEditorSnapshot => structuredClone(snapshot)
const serializeSnapshot = (snapshot: PlanEditorSnapshot) => JSON.stringify(snapshot)

export function usePlanEditorHistory({ current, restore, maxEntries = 100 }: UsePlanEditorHistoryArgs) {
  const [past, setPast] = useState<PlanEditorSnapshot[]>([])
  const [future, setFuture] = useState<PlanEditorSnapshot[]>([])
  const bufferedStartRef = useRef<PlanEditorSnapshot | null>(null)

  const recordCheckpoint = useCallback(() => {
    setPast((prev) => {
      const currentSerialized = serializeSnapshot(current)
      const last = prev[prev.length - 1]
      if (last && serializeSnapshot(last) === currentSerialized) return prev
      const next = [...prev, cloneSnapshot(current)]
      return next.length > maxEntries ? next.slice(next.length - maxEntries) : next
    })
    setFuture([])
  }, [current, maxEntries])

  const beginBufferedEdit = useCallback(() => {
    if (!bufferedStartRef.current) bufferedStartRef.current = cloneSnapshot(current)
  }, [current])

  const commitBufferedEdit = useCallback(() => {
    const start = bufferedStartRef.current
    bufferedStartRef.current = null
    if (!start) return
    if (serializeSnapshot(start) === serializeSnapshot(current)) return

    setPast((prev) => {
      const last = prev[prev.length - 1]
      if (last && serializeSnapshot(last) === serializeSnapshot(start)) return prev
      const next = [...prev, cloneSnapshot(start)]
      return next.length > maxEntries ? next.slice(next.length - maxEntries) : next
    })
    setFuture([])
  }, [current, maxEntries])

  const cancelBufferedEdit = useCallback(() => {
    bufferedStartRef.current = null
  }, [])

  const runWithCheckpoint = useCallback((fn: () => void) => {
    recordCheckpoint()
    fn()
  }, [recordCheckpoint])

  const undo = useCallback(() => {
    setPast((prev) => {
      const target = prev[prev.length - 1]
      if (!target) return prev
      setFuture((prevFuture) => [cloneSnapshot(current), ...prevFuture])
      restore(cloneSnapshot(target))
      return prev.slice(0, -1)
    })
  }, [current, restore])

  const redo = useCallback(() => {
    setFuture((prev) => {
      const [next, ...rest] = prev
      if (!next) return prev
      setPast((prevPast) => {
        const nextPast = [...prevPast, cloneSnapshot(current)]
        return nextPast.length > maxEntries ? nextPast.slice(nextPast.length - maxEntries) : nextPast
      })
      restore(cloneSnapshot(next))
      return rest
    })
  }, [current, maxEntries, restore])

  const clearHistory = useCallback(() => {
    setPast([])
    setFuture([])
    bufferedStartRef.current = null
  }, [])

  return useMemo(() => ({
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    recordCheckpoint,
    beginBufferedEdit,
    commitBufferedEdit,
    cancelBufferedEdit,
    runWithCheckpoint,
    undo,
    redo,
    clearHistory,
  }), [past.length, future.length, recordCheckpoint, beginBufferedEdit, commitBufferedEdit, cancelBufferedEdit, runWithCheckpoint, undo, redo, clearHistory])
}
