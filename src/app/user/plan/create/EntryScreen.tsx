'use client'

import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import EditIcon from '@mui/icons-material/Edit'
import ListAltIcon from '@mui/icons-material/ListAlt'

type EntryScreenProps = {
  onSelectTemplates: () => void
  onSelectAi: () => void
  onSelectScratch: () => void
}

export const EntryScreen = ({ onSelectTemplates, onSelectAi, onSelectScratch }: EntryScreenProps) => {
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
