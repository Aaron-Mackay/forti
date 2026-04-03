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
import type { ParsedPlan } from '@/utils/aiPlanParser'

const STEPS = ['Uploading spreadsheet', 'Analysing with AI', 'Building plan']

// Mirror of MAX_INPUT_BYTES_SPREADSHEET in src/app/api/plan/ai-import/route.ts
const MAX_INPUT_BYTES = 225_000
const CHUNK_WEEK_GROUP_SIZE = 2
const CHUNK_BYTE_BUDGET = 110_000
const MAX_CHUNK_ATTEMPTS = 3
const CHUNK_REQUEST_TIMEOUT_MS = 240_000

function splitByWeekBlocks(input: string, weeksPerChunk: number): string[] {
  const lines = input.split(/\r?\n/)
  const weekStarts = lines
    .map((line, i) => (/^\s*WEEK\s+\d+/i.test(line) ? i : -1))
    .filter((i) => i >= 0)

  if (weekStarts.length <= 1) return [input]

  const weekBlocks = weekStarts.map((start, i) => {
    const endExclusive = weekStarts[i + 1] ?? lines.length
    return lines.slice(start, endExclusive).join('\n').trim()
  }).filter(Boolean)

  const chunks: string[] = []
  for (let i = 0; i < weekBlocks.length; i += weeksPerChunk) {
    chunks.push(weekBlocks.slice(i, i + weeksPerChunk).join('\n\n'))
  }
  return chunks.length > 0 ? chunks : [input]
}

function splitByByteBudget(input: string, byteBudget: number): string[] {
  const lines = input.split(/\r?\n/)
  const chunks: string[] = []
  let current: string[] = []
  let currentBytes = 0

  for (const line of lines) {
    const lineBytes = new TextEncoder().encode(line + '\n').length
    if (current.length > 0 && currentBytes + lineBytes > byteBudget) {
      chunks.push(current.join('\n'))
      current = []
      currentBytes = 0
    }
    current.push(line)
    currentBytes += lineBytes
  }

  if (current.length > 0) chunks.push(current.join('\n'))
  return chunks.length > 0 ? chunks : [input]
}

function buildImportChunks(input: string): string[] {
  const weekChunks = splitByWeekBlocks(input, CHUNK_WEEK_GROUP_SIZE)
  if (weekChunks.length > 1) return weekChunks

  const totalBytes = new TextEncoder().encode(input).length
  if (totalBytes > CHUNK_BYTE_BUDGET) {
    return splitByByteBudget(input, CHUNK_BYTE_BUDGET)
  }
  return [input]
}

function mergeChunkPlans(plans: ParsedPlan[]): ParsedPlan {
  const first = plans[0]
  const mergedWeeks = plans.flatMap((plan) => plan.weeks).map((week, i) => ({ ...week, order: i + 1 }))
  return { ...first, weeks: mergedWeeks }
}

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
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const inputBytes = new TextEncoder().encode(text).length
  const isOverLimit = inputBytes > MAX_INPUT_BYTES

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
    if (isOverLimit) {
      setError(`Input too large — please reduce to under 225 KB (currently ${(inputBytes / 1000).toFixed(1)} KB)`)
      return
    }
    setError(null)
    setParseIssues([])
    setPhase(1)
    setChunkProgress(null)

    // Briefly show "uploading" step before moving to AI analysis
    await new Promise((resolve) => setTimeout(resolve, 400))
    setPhase(2)

    try {
      const chunks = buildImportChunks(text)
      setChunkProgress(chunks.length > 1 ? { current: 1, total: chunks.length } : null)
      const importedPlans: ParsedPlan[] = []

      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress(chunks.length > 1 ? { current: i + 1, total: chunks.length } : null)
        let lastError: string | null = null

        for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), CHUNK_REQUEST_TIMEOUT_MS)
          try {
            const res = await fetch('/api/plan/ai-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input: chunks[i], type: 'spreadsheet' }),
              signal: controller.signal,
            })
            const data: AiImportResponse = await res.json()
            if ('error' in data) {
              lastError = data.error
              if (res.status >= 500 && attempt < MAX_CHUNK_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, 600 * attempt))
                continue
              }
              if (data.parseIssues?.length) setParseIssues(data.parseIssues)
              break
            }
            if (!('plan' in data)) {
              lastError = 'Could not parse the spreadsheet — please try again.'
              break
            }
            importedPlans.push(data.plan as ParsedPlan)
            lastError = null
            break
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              lastError = 'Request timed out while importing — try fewer weeks per upload.'
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
              lastError = 'You appear to be offline — please reconnect and try again.'
            } else {
              lastError = 'Network error — please try again'
            }
            if (attempt < MAX_CHUNK_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, 600 * attempt))
            }
          } finally {
            clearTimeout(timeout)
          }
        }

        if (lastError) {
          setPhase(0)
          setError(lastError)
          setChunkProgress(null)
          return
        }
      }

      if (importedPlans.length === 0) {
        setPhase(0)
        setError('Could not parse the spreadsheet — please try again.')
        setChunkProgress(null)
        return
      }

      const mergedPlan = mergeChunkPlans(importedPlans)
      setPhase(3)
      sessionStorage.setItem('pendingUploadPlan', JSON.stringify(mergedPlan))
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push('/user/plan/create')
    } catch {
      setPhase(0)
      setError('Network error — please try again')
      setChunkProgress(null)
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
          error={isOverLimit}
          helperText={
            text.length > 0
              ? `${inputBytes.toLocaleString()} / ~225,000 bytes${isOverLimit ? ' — too large' : ''}`
              : undefined
          }
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
          {chunkProgress && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Processing chunk {chunkProgress.current} of {chunkProgress.total}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
