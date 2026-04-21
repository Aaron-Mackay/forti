'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Metric } from '@/generated/prisma/browser';
import type { CheckInCard, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import type { PreviousPhotos, WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import type { MetricBreakdownKey } from './MetricsDailyBreakdown';
import CheckInCustomCard from './CheckInCustomCard';
import DataVizChartCard from './DataVizChartCard';
import MetricsSystemCard from './MetricsSystemCard';
import ProgressPhotoSection from '@/app/user/check-in/ProgressPhotoSection';
import { DEFAULT_CHECK_IN_TEMPLATE_PREVIEW_DATA } from './checkInTemplatePreviewData';

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
  canEditMetrics?: boolean;
  onMetricChange?: (dayOffset: number, key: MetricBreakdownKey, value: number | null) => void;
}

// ─── System card placeholder (preview / editor context) ───────────────────────

function SystemCardPlaceholder({
  systemType,
  defaultExpanded,
  interactive,
  forceMobileLayout,
  expanded,
  onExpandedChange,
}: {
  systemType: 'photos' | 'metrics' | 'workouts';
  defaultExpanded: boolean;
  interactive: boolean;
  forceMobileLayout: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const previewData = DEFAULT_CHECK_IN_TEMPLATE_PREVIEW_DATA;

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
      <MetricsSystemCard
        currentWeek={previewData.currentWeek}
        weekPrior={previewData.priorWeek}
        weekTargets={previewData.weekTargets}
        customMetricDefs={previewData.customMetricDefs}
        weekStartDate={previewData.weekStart}
        defaultExpanded={defaultExpanded}
        interactive={interactive}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        layoutMode={forceMobileLayout ? 'force-mobile' : 'auto'}
      />
    );
  }

  return (
    <Stack spacing={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">Training</Typography>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {previewData.trainingCounts.completed}/{previewData.trainingCounts.planned}
        </Typography>
      </Box>
      <Stack spacing={0.5}>
        {previewData.trainingSessions.map(session => (
          <Box key={`${session.day}-${session.name}`} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 28 }}>{session.day}</Typography>
            <Typography variant="body2" color="text.secondary">{session.name}</Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
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
  /** Preview-only: allow system card interactions (e.g. metrics expand/collapse). */
  systemPreviewInteractive?: boolean;
  /** Preview-only: force mobile layout regardless of viewport breakpoint. */
  forceMobileLayout?: boolean;
  /** Preview-only: render dataviz in use mode so runtime date controls are available. */
  datavizPreviewInteractive?: boolean;
  /** Optional controlled expansion state for metrics system cards. */
  metricsExpanded?: boolean;
  /** Optional expansion callback for metrics system cards. */
  onMetricsExpandedChange?: (expanded: boolean) => void;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export default function TemplateCardRenderer({
  card,
  gridColumn,
  systemData,
  responses = {},
  onResponseChange,
  clientId,
  systemPreviewInteractive = false,
  forceMobileLayout = false,
  datavizPreviewInteractive = false,
  metricsExpanded,
  onMetricsExpandedChange,
}: Props) {
  if (card.kind === 'dataviz') {
    return (
      <DataVizChartCard
        card={card}
        gridColumn={gridColumn}
        clientId={clientId}
        mode={systemData ? 'use' : 'editor-preview'}
        interactivePreview={datavizPreviewInteractive}
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
                                'Training';

  if (!systemData) {
    // Preview mode — show placeholder
    return (
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }} color="text.secondary">
          {label}
        </Typography>
        <SystemCardPlaceholder
          systemType={systemType}
          defaultExpanded={card.columnSpan === 2}
          interactive={systemPreviewInteractive}
          forceMobileLayout={forceMobileLayout}
          expanded={metricsExpanded}
          onExpandedChange={onMetricsExpandedChange}
        />
      </Paper>
    );
  }

  if (systemType === 'photos') {
    return (
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, minWidth: 0 }}>
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
      <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, minWidth: 0 }}>
        <MetricsSystemCard
          currentWeek={systemData.currentWeek}
          weekPrior={systemData.weekPrior}
          weekTargets={systemData.weekTargets}
          customMetricDefs={systemData.customMetricDefs}
          weekStartDate={systemData.weekStart}
          defaultExpanded={card.columnSpan === 2}
          interactive
          expanded={metricsExpanded}
          onExpandedChange={onMetricsExpandedChange}
          layoutMode={forceMobileLayout ? 'force-mobile' : 'auto'}
          editableBreakdown={Boolean(systemData.canEditMetrics)}
          onBreakdownMetricChange={systemData.onMetricChange}
        />
      </Paper>
    );
  }

  // training
  const { completedWorkoutsCount, plannedWorkoutsCount, onWorkoutsClick } = systemData;
  return (
    <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, minWidth: 0 }}>
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
        <Typography variant="body2" color="text.secondary">Training</Typography>
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
