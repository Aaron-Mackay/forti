'use client'

import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import EditIcon from '@mui/icons-material/Edit'
import ListAltIcon from '@mui/icons-material/ListAlt'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useRouter } from 'next/navigation'
import { signalTokens } from '@lib/signal/tokens'
import type { ReactNode } from 'react'

type EntryScreenProps = {
  signalEnabled?: boolean
  clientId?: string
  onSelectTemplates: () => void
  onSelectAi: () => void
  onSelectScratch: () => void
}

const palette = signalTokens.surface.planning

export const EntryScreen = ({ signalEnabled = false, clientId, onSelectTemplates, onSelectAi, onSelectScratch }: EntryScreenProps) => {
  const router = useRouter()

  if (signalEnabled) {
    return (
      <div
        style={{
          minHeight: '100%',
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.font.body,
          padding: '14px 16px 28px',
        }}
      >
        <style>{`
          @media (min-width: 900px) {
            [data-signal-plan-create-grid] {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        `}</style>

        <section
          style={{
            background: palette.surface,
            border: `1px solid ${palette.borderStrong}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '20px 20px 18px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: signalTokens.font.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
            Plan create
          </div>
          <div style={{ fontFamily: signalTokens.font.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
            Build a new training plan
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55, maxWidth: 680 }}>
            Pick the fastest starting point {clientId ? 'for this athlete' : 'for this plan'}.
            Templates, AI, import, and scratch all keep the existing editor flow behind them.
          </div>
        </section>

        <div data-signal-plan-create-grid style={{ display: 'grid', gap: 12 }}>
          <SignalEntryCard
            testId="entry-templates"
            title="From a template"
            description="Browse proven program structures"
            note="Fastest if you want a starting framework"
            icon={<ListAltIcon sx={{ fontSize: 30 }} />}
            accent={palette.inkMid}
            onClick={onSelectTemplates}
          />
          <SignalEntryCard
            testId="entry-ai"
            title="Build with AI"
            description="Answer a few questions"
            note="Best for goal-led plan drafting"
            icon={<AutoAwesomeIcon sx={{ fontSize: 30 }} />}
            accent={palette.inkMid}
            onClick={onSelectAi}
          />
          <SignalEntryCard
            testId="entry-upload"
            title="Import from spreadsheet"
            description="Upload CSV or paste training data"
            note="Best if the plan already exists elsewhere"
            icon={<UploadFileIcon sx={{ fontSize: 30 }} />}
            accent={palette.inkMid}
            onClick={() => router.push('/user/plan/upload')}
          />
          <SignalEntryCard
            testId="entry-scratch"
            title="Start from scratch"
            description="Full manual control"
            note="Best for custom coaching builds"
            icon={<EditIcon sx={{ fontSize: 30 }} />}
            accent={palette.inkMid}
            onClick={onSelectScratch}
          />
        </div>
      </div>
    )
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        How do you want to start?
      </Typography>

      <Card variant="outlined">
        <CardActionArea onClick={onSelectTemplates} data-testid="entry-templates">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ListAltIcon sx={{ fontSize: 36, color: 'secondary.main', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                From a template
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse proven programs by goal and experience level
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card variant="outlined">
        <CardActionArea onClick={onSelectAi} data-testid="entry-ai">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 36, color: 'primary.main', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Build with AI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Answer a few questions and let AI design your plan
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card variant="outlined">
        <CardActionArea onClick={() => router.push('/user/plan/upload')} data-testid="entry-upload">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UploadFileIcon sx={{ fontSize: 36, color: 'text.secondary', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Import from spreadsheet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a CSV or paste a training spreadsheet — AI reads it and builds a ready-to-edit plan
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card variant="outlined">
        <CardActionArea onClick={onSelectScratch} data-testid="entry-scratch">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EditIcon sx={{ fontSize: 36, color: 'text.secondary', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Start from scratch
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Full manual control over workouts and exercises
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  )
}

function SignalEntryCard({
  testId,
  title,
  description,
  note,
  icon,
  accent,
  onClick,
}: {
  testId: string
  title: string
  description: string
  note: string
  icon: ReactNode
  accent: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        appearance: 'none',
        width: '100%',
        border: `1px solid ${palette.border}`,
        background: palette.surface,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px',
        textAlign: 'left',
        cursor: 'pointer',
        color: palette.ink,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 46,
            borderRadius: signalTokens.radii.card,
            display: 'grid',
            placeItems: 'center',
            background: palette.surfaceAlt,
            color: accent,
            border: `1px solid ${palette.border}`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: signalTokens.font.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55, marginBottom: 10 }}>
            {description}
          </div>
          <div style={{ fontFamily: signalTokens.font.mono, fontSize: 11, color: palette.inkLight }}>
            {note}
          </div>
        </div>
      </div>
    </button>
  )
}
