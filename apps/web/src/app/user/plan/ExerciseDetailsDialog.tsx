'use client'

import { useEffect, useState } from 'react'
import { Stack, TextField } from '@mui/material'
import { Overlay } from '@/components/signal/overlay'

type ExerciseDetailsDialogProps = {
  open: boolean
  repRange: string | null
  restTime: string | null
  onClose: () => void
  onSave: (values: { repRange: string; restTime: string }) => void
}

export default function ExerciseDetailsDialog({
  open,
  repRange,
  restTime,
  onClose,
  onSave,
}: ExerciseDetailsDialogProps) {
  const [draftRepRange, setDraftRepRange] = useState('')
  const [draftRestTime, setDraftRestTime] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftRepRange(repRange ?? '')
    setDraftRestTime(restTime ?? '')
  }, [open, repRange, restTime])

  const dirty = draftRepRange !== (repRange ?? '') || draftRestTime !== (restTime ?? '')

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Edit details"
      size="sm"
      dirty={dirty}
      primaryAction={{
        label: 'Save',
        onClick: () => onSave({ repRange: draftRepRange, restTime: draftRestTime }),
      }}
      ghostAction={{ label: 'Cancel', onClick: onClose }}
    >
      <Stack spacing={2} sx={{ pt: 1, pb: 1 }}>
        <TextField
          label="Rep range"
          value={draftRepRange}
          onChange={(event) => setDraftRepRange(event.target.value)}
          size="small"
          fullWidth
          autoComplete="off"
        />
        <TextField
          label="Rest time"
          value={draftRestTime}
          onChange={(event) => setDraftRestTime(event.target.value)}
          size="small"
          fullWidth
          autoComplete="off"
        />
      </Stack>
    </Overlay>
  )
}
