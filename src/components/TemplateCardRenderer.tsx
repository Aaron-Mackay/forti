'use client';

import { Box, Paper, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Metric } from '@/generated/prisma/browser';
import type { CheckInCard, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import type { PreviousPhotos, WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import CheckInCustomCard from './CheckInCustomCard';
import DataVizChartCard from './DataVizChartCard';
import MetricsSummaryTable from './MetricsSummaryTable';
import ProgressPhotoSection from '@/app/user/check-in/ProgressPhotoSection';

// ─── System card data bundle ──────────────────────────────────────────────────

export interface SystemCardData {
  photoUrls: { front: string | null; back: string | null; side: string | null };
  previousPhotos: PreviousPhotos | null;
  weekStart: string;
  onPhotoUploaded: (angle: 'front' | 'back' | 'side', url: string) => void;
  onPhotoRemoved: (angle: 'front' | 'back' | 'side') => void;
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  customMetricDefs: CustomMetricDef[];
  completedWorkoutsCount: number;
  plannedWorkoutsCount: number;
  onWorkoutsClick?: () => void;
}

// ─── System card placeholder (preview / editor context) ───────────────────────

function SystemCardPlaceholder({ systemType }: { systemType: 'photos' | 'metrics' | 'workouts' }) {
  if (systemType === 'photos') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {(['Front', 'Side', 'Back'] as const).map(angle => (
          <Box key={angle} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: '100%', aspectRatio: '1', border: '1px dashed', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }} />
            <Typography variant="caption" color="text.disabled">{angle}</Typography>
          </Box>
        ))}
      </Box>
    );
  }

  if (systemType === 'metrics') {
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {['Weight', 'Steps', 'Sleep', 'Calories', 'Protein'].map(m => (
          <Box key={m} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="caption" color="text.disabled">{m}</Typography>
            <Typography variant="body2" fontWeight={500} color="text.disabled">—</Typography>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
      <Typography variant="body2" color="text.disabled">Workouts</Typography>
      <Typography variant="body2" fontWeight={600} color="text.disabled">0 / 0</Typography>
    </Box>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  card: CheckInCard;
  gridColumn: string | Record<string, string>;
  /** Required for system cards; omit in preview mode (shows placeholder). */
  systemData?: SystemCardData;
  /** Required for custom cards. */
  responses?: CustomCheckInResponses;
  onResponseChange?: (fieldId: string, value: string | number | null) => void;
  /** Pass the client's userId when rendering dataviz cards on the coach review page. */
  clientId?: string;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export default function TemplateCardRenderer({
  card,
  gridColumn,
  systemData,
  responses = {},
  onResponseChange,
  clientId,
}: Props) {
  if (card.kind === 'dataviz') {
    return (
      <DataVizChartCard
        card={card}
        gridColumn={gridColumn}
        clientId={clientId}
        mode={systemData ? 'use' : 'editor-preview'}
      />
    );
  }

  if (card.kind === 'custom') {
    return (
      <CheckInCustomCard
        card={card}
        gridColumn={gridColumn}
        responses={responses}
        onChange={onResponseChange ?? (() => undefined)}
      />
    );
  }

  // System card
  const { systemType } = card;
  const label =
    systemType === 'photos'   ? 'Progress photos' :
    systemType === 'metrics'  ? 'Weekly metrics' :
                                'Workouts completed';

  if (!systemData) {
    // Preview mode — show placeholder
    return (
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }} color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ opacity: 0.6 }}>
          <SystemCardPlaceholder systemType={systemType} />
        </Box>
      </Paper>
    );
  }

  if (systemType === 'photos') {
    return (
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
        <ProgressPhotoSection
          currentPhotos={systemData.photoUrls}
          previousPhotos={systemData.previousPhotos}
          weekStart={systemData.weekStart}
          onPhotoUploaded={systemData.onPhotoUploaded}
          onPhotoRemoved={systemData.onPhotoRemoved}
        />
      </Paper>
    );
  }

  if (systemType === 'metrics') {
    return (
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Last 2 weeks of metrics</Typography>
        <MetricsSummaryTable
          currentWeek={systemData.currentWeek}
          weekPrior={systemData.weekPrior}
          weekTargets={systemData.weekTargets}
          customMetricDefs={systemData.customMetricDefs}
        />
      </Paper>
    );
  }

  // workouts
  const { completedWorkoutsCount, plannedWorkoutsCount, onWorkoutsClick } = systemData;
  return (
    <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
      <Box
        onClick={onWorkoutsClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.75,
          borderRadius: 1,
          bgcolor: 'action.hover',
          cursor: onWorkoutsClick ? 'pointer' : 'default',
          ...(onWorkoutsClick && { '&:hover': { bgcolor: 'action.selected' } }),
        }}
      >
        <Typography variant="body2" color="text.secondary">Workouts</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {completedWorkoutsCount}/{plannedWorkoutsCount}
          </Typography>
          {onWorkoutsClick && <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        </Box>
      </Box>
    </Paper>
  );
}
