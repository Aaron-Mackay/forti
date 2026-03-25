'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  LinearProgress,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import { useApiMutation } from '@lib/hooks/useApiMutation';
import type { LibraryAssetType } from '@prisma/client';
import type { StepProgressMap } from '@lib/learningPlanSchemas';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

interface AssetSummary {
  id: string;
  title: string;
  type: LibraryAssetType;
  url: string | null;
}

interface Step {
  id: number;
  order: number;
  dayOffset: number;
  title: string;
  body: string;
  assetId: string | null;
  asset: AssetSummary | null;
}

interface Assignment {
  id: number;
  startDate: string;
  stepProgress: StepProgressMap | null;
  plan: {
    id: number;
    title: string;
    description: string | null;
    steps: Step[];
  };
}

function AssignmentCard({
  assignment,
  onToggleStep,
}: {
  assignment: Assignment;
  onToggleStep: (assignmentId: number, stepId: number, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { plan, stepProgress: rawProgress } = assignment;
  const progress = rawProgress ?? {};
  const completedCount = plan.steps.filter(s => progress[String(s.id)]?.completedAt).length;
  const startDate = new Date(assignment.startDate);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
        onClick={() => setExpanded(e => !e)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{plan.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Started {startDate.toLocaleDateString()} · {completedCount}/{plan.steps.length} done
            </Typography>
          </Box>
          {expanded ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </Stack>
        {plan.steps.length > 0 && (
          <LinearProgress
            variant="determinate"
            value={plan.steps.length > 0 ? (completedCount / plan.steps.length) * 100 : 0}
            sx={{ mt: 1, borderRadius: 1, height: 6 }}
          />
        )}
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Stack spacing={0} divider={<Divider />}>
          {plan.steps.map(step => {
            const stepProg = progress[String(step.id)];
            const notified = !!stepProg?.notifiedAt;
            const completed = !!stepProg?.completedAt;

            const deliverOn = new Date(startDate);
            deliverOn.setDate(deliverOn.getDate() + step.dayOffset);

            return (
              <Box
                key={step.id}
                sx={{ p: 1.5, bgcolor: !notified ? 'action.disabledBackground' : undefined }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  {notified ? (
                    <Checkbox
                      checked={completed}
                      onChange={e => onToggleStep(assignment.id, step.id, e.target.checked)}
                      size="small"
                      sx={{ mt: -0.5, flexShrink: 0 }}
                      inputProps={{ 'aria-label': `Mark "${step.title}" complete` }}
                    />
                  ) : (
                    <LockIcon
                      fontSize="small"
                      sx={{ color: 'text.disabled', mt: 0.4, flexShrink: 0, ml: 1 }}
                    />
                  )}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                      <Chip label={`Day ${step.dayOffset}`} size="small" variant="outlined" />
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ textDecoration: completed ? 'line-through' : undefined, color: !notified ? 'text.disabled' : undefined }}
                      >
                        {step.title}
                      </Typography>
                    </Stack>
                    {notified && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {step.body}
                      </Typography>
                    )}
                    {!notified && (
                      <Typography variant="caption" color="text.disabled">
                        Available {deliverOn.toLocaleDateString()}
                      </Typography>
                    )}
                    {step.asset && notified && (
                      <Box sx={{ mt: 1 }}>
                        {step.asset.url ? (
                          <MuiLink href={step.asset.url} target="_blank" rel="noopener" variant="body2">
                            {step.asset.title}
                          </MuiLink>
                        ) : (
                          <Chip label={step.asset.title} size="small" />
                        )}
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Box>
            );
          })}
          {plan.steps.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">No steps yet.</Typography>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function LearningPlansClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApiGet<{ assignments: Assignment[] }>(
    `/api/learning-plan-assignments?r=${refreshKey}`
  );
  const { mutate } = useApiMutation<{ stepProgress: StepProgressMap }>();

  async function handleToggleStep(assignmentId: number, stepId: number, completed: boolean) {
    await mutate(
      `/api/learning-plan-assignments/${assignmentId}/steps/${stepId}/complete`,
      'PATCH',
      { completed },
    );
    setRefreshKey(k => k + 1);
  }

  return (
    <Box sx={{ p: 2, minHeight: HEIGHT_EXC_APPBAR }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>Failed to load learning plans.</Alert>
      )}

      {!loading && !error && data && (
        <>
          {data.assignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', pt: 8 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No learning plans yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your coach will assign a learning plan when you&apos;re ready.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {data.assignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onToggleStep={handleToggleStep}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
