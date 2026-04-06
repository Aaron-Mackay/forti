'use client'

import { useCallback, useState } from 'react'

type PlanViewMode = 'classic' | 'sheet'

type UsePlanViewControlsOptions = {
  defaultViewMode?: PlanViewMode
  persistViewMode?: boolean
  viewModeStorageKey?: string
  zoomStorageKey?: string
}

function readStoredZoom(storageKey: string): number {
  if (typeof window === 'undefined') return 1
  const value = parseFloat(localStorage.getItem(storageKey) ?? '')
  return isNaN(value) ? 1 : Math.max(0.25, Math.min(1, value))
}

function readStoredViewMode(storageKey: string, defaultViewMode: PlanViewMode): PlanViewMode {
  if (typeof window === 'undefined') return defaultViewMode
  const stored = localStorage.getItem(storageKey)
  return stored === 'classic' || stored === 'sheet' ? stored : defaultViewMode
}

export function usePlanViewControls({
  defaultViewMode = 'classic',
  persistViewMode = false,
  viewModeStorageKey = 'planViewMode',
  zoomStorageKey = 'sheetZoom',
}: UsePlanViewControlsOptions = {}) {
  const [viewMode, setViewModeState] = useState<PlanViewMode>(() =>
    persistViewMode ? readStoredViewMode(viewModeStorageKey, defaultViewMode) : defaultViewMode,
  )
  const [zoom, setZoom] = useState(() => readStoredZoom(zoomStorageKey))
  const [arrangeMode, setArrangeMode] = useState(false)

  const setViewMode = useCallback((next: PlanViewMode) => {
    setViewModeState(next)
    if (persistViewMode) {
      localStorage.setItem(viewModeStorageKey, next)
    }
    if (next === 'classic') {
      setArrangeMode(false)
    }
  }, [persistViewMode, viewModeStorageKey])

  const toggleArrangeMode = useCallback(() => {
    setArrangeMode((current) => !current)
  }, [])

  const handleZoomChange = useCallback((newZoom: number) => {
    const rounded = Math.round(newZoom * 100) / 100
    setZoom(rounded)
    localStorage.setItem(zoomStorageKey, String(rounded))
  }, [zoomStorageKey])

  return {
    arrangeMode,
    handleZoomChange,
    setViewMode,
    toggleArrangeMode,
    viewMode,
    zoom,
  }
}
