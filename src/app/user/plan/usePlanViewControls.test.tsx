import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePlanViewControls } from './usePlanViewControls'

describe('usePlanViewControls', () => {
  it('defaults to sheet mode when no options are provided', () => {
    localStorage.removeItem('planViewMode')
    const { result } = renderHook(() => usePlanViewControls())
    expect(result.current.viewMode).toBe('sheet')
  })

  it('uses stored planViewMode when persistViewMode is enabled', () => {
    localStorage.setItem('planViewMode', 'classic')
    const { result } = renderHook(() => usePlanViewControls({ persistViewMode: true }))
    expect(result.current.viewMode).toBe('classic')
  })

  it('persists mode updates when persistViewMode is enabled', () => {
    localStorage.removeItem('planViewMode')
    const { result } = renderHook(() => usePlanViewControls({ persistViewMode: true }))

    act(() => {
      result.current.setViewMode('classic')
    })

    expect(localStorage.getItem('planViewMode')).toBe('classic')
  })
})
