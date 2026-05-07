'use client'

import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave({ repRange: draftRepRange, restTime: draftRestTime })}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
