'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Typography,
} from '@mui/material'
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext'
import { useNewPlan } from './useNewPlan'
import { parsedPlanToPlanPrisma } from './planConverter'
import {
  PLAN_TEMPLATES,
  FILTER_CATEGORIES,
  type FilterCategory,
  type PlanTemplate,
} from './planTemplates'
import { PLACEHOLDER_ID } from './PlanBuilderWithContext'

type TemplateBrowserScreenProps = {
  onSelect: (weekCount: string) => void
}

export const TemplateBrowserScreen = ({ onSelect }: TemplateBrowserScreenProps) => {
  const [filter, setFilter] = useState<FilterCategory>('All')
  const [previewTemplate, setPreviewTemplate] = useState<PlanTemplate | null>(null)
  const { dispatch } = useWorkoutEditorContext()
  const { statePlan } = useNewPlan()

  const filtered =
    filter === 'All'
      ? PLAN_TEMPLATES
      : PLAN_TEMPLATES.filter((t) => t.categories.includes(filter as Exclude<FilterCategory, 'All'>))

  const handleUseTemplate = () => {
    if (!previewTemplate) return
    const planPrisma = parsedPlanToPlanPrisma(previewTemplate.plan, statePlan)
    dispatch({ type: 'REPLACE_PLAN', planId: PLACEHOLDER_ID, plan: planPrisma })
    onSelect(previewTemplate.meta.durationWeeks.toString())
  }

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {FILTER_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setFilter(cat)}
              color={filter === cat ? 'primary' : 'default'}
              variant={filter === cat ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>

        {/* Template cards */}
        {filtered.map((template) => (
          <Card key={template.meta.name} variant="outlined">
            <CardContent sx={{ pb: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {template.meta.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {template.meta.daysPerWeek} days/wk · {template.meta.durationWeeks} weeks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {template.meta.level} · {template.meta.goal}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => setPreviewTemplate(template)}>
                Preview
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Preview bottom sheet */}
      <Drawer
        anchor="bottom"
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '75dvh',
            px: 2,
            pt: 2,
            pb: 3,
          },
        }}
      >
        {previewTemplate && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto' }}>
            <Typography variant="h6" fontWeight={600}>
              {previewTemplate.meta.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {previewTemplate.meta.daysPerWeek} days/wk · {previewTemplate.meta.durationWeeks}{' '}
              weeks · {previewTemplate.meta.level} · {previewTemplate.meta.goal}
            </Typography>
            <Divider />

            {previewTemplate.plan.weeks[0].workouts.map((wo) => (
              <Box key={wo.order}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {wo.name}
                </Typography>
                {wo.exercises.map((ex) => (
                  <Typography key={ex.order} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {ex.exercise.name}
                    {ex.repRange
                      ? ` · ${ex.sets.length}×${ex.repRange}`
                      : ` · ${ex.sets.length} sets`}
                  </Typography>
                ))}
              </Box>
            ))}

            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" fullWidth size="large" onClick={handleUseTemplate}>
                Use this template
              </Button>
              <Button variant="text" fullWidth onClick={() => setPreviewTemplate(null)}>
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  )
}
