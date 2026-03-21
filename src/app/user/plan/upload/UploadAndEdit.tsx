'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CustomAppBar, { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar'
import type { AiImportResponse } from '@/app/api/plan/ai-import/route'

export const UploadAndEdit = () => {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/plan/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, type: 'spreadsheet' }),
      })
      const data: AiImportResponse = await res.json()
      if ('error' in data) {
        setError(data.error)
        return
      }
      sessionStorage.setItem('pendingUploadPlan', JSON.stringify(data.plan))
      router.push('/user/plan/create')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CustomAppBar title="Import from Spreadsheet" showBack />
      <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto', p: 2, maxWidth: 600, mx: 'auto' }}>
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
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          disabled={loading || !text.trim()}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? 'Analysing spreadsheet…' : 'Import'}
        </Button>
      </Box>
    </>
  )
}
