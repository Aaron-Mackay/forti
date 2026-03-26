'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar'
import { useAppBar } from '@lib/providers/AppBarProvider'
import type { AiImportResponse } from '@/app/api/plan/ai-import/route'

const STEPS = ['Uploading spreadsheet', 'Analysing with AI', 'Building plan']

function StepIcon({ stepIndex, phase }: { stepIndex: number; phase: number }) {
  const stepPhase = stepIndex + 1
  if (phase > stepPhase) return <CheckCircleIcon sx={{ color: 'success.main' }} />
  if (phase === stepPhase) return <CircularProgress size={20} />
  return <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />
}

export const UploadAndEdit = () => {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [parseIssues, setParseIssues] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target?.result as string)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setError(null)
    setParseIssues([])
    setPhase(1)

    // Briefly show "uploading" step before moving to AI analysis
    await new Promise((resolve) => setTimeout(resolve, 400))
    setPhase(2)

    try {
      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, type: 'spreadsheet' }),
      })
      const data: AiImportResponse = await res.json()
      if ('error' in data) {
        setPhase(0)
        setError(data.error)
        if (data.parseIssues?.length) setParseIssues(data.parseIssues)
        return
      }
      if (!('plan' in data)) {
        // Clarifying questions are not supported in the spreadsheet upload flow
        setPhase(0)
        setError('Could not parse the spreadsheet — please try again.')
        return
      }
      setPhase(3)
      sessionStorage.setItem('pendingUploadPlan', JSON.stringify(data.plan))
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push('/user/plan/create')
    } catch {
      setPhase(0)
      setError('Network error — please try again')
    }
  }

  useAppBar({ title: 'Import from Spreadsheet', showBack: true });
  const loading = phase > 0

  return (
    <>
      <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto', p: 2, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a CSV or paste your training spreadsheet below. AI will read the exercises, sets, and weights and create a ready-to-edit plan.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          fullWidth
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          Upload CSV file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
          {fileName ?? 'No file selected'}
        </Typography>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">or</Typography>
        </Divider>

        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          label="Paste in your training sheet"
          multiline
          rows={4}
          fullWidth
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {parseIssues.length > 0 && (
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                {parseIssues.map((issue, i) => (
                  <li key={i}><Typography variant="caption">{issue}</Typography></li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          disabled={loading || !text.trim()}
        >
          Import
        </Button>
      </Box>

      <Dialog
        open={loading}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>Importing your plan</DialogTitle>
        <DialogContent>
          <List dense disablePadding>
            {STEPS.map((label, i) => (
              <ListItem key={label} disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <StepIcon stepIndex={i} phase={phase} />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  slotProps={{
                    primary: {
                      color: phase === i + 1 ? 'text.primary' : phase > i + 1 ? 'text.primary' : 'text.disabled',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
          <LinearProgress sx={{ mt: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            This may take a few minutes
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}
