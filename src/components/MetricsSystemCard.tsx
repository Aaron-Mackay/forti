'use client';

import { useEffect, useState } from 'react';
import { Box, Collapse, Divider, IconButton, Typography } from '@mui/material';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import type { Metric } from '@/generated/prisma/browser';
import type { WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import MetricsSummaryTable from './MetricsSummaryTable';
import MetricsDailyBreakdown from './MetricsDailyBreakdown';

interface Props {
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  customMetricDefs: CustomMetricDef[];
  weekStartDate: string | Date;
  defaultExpanded?: boolean;
  interactive?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  layoutMode?: 'auto' | 'force-mobile';
}

export default function MetricsSystemCard({
  currentWeek,
  weekPrior,
  weekTargets,
  customMetricDefs,
  weekStartDate,
  defaultExpanded = false,
  interactive = true,
  expanded,
  onExpandedChange,
  layoutMode = 'auto',
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = typeof expanded === 'boolean';
  const isExpanded = isControlled ? expanded : internalExpanded;
  const forceMobileLayout = layoutMode === 'force-mobile';
  const forceCompactFont = forceMobileLayout;

  useEffect(() => {
    if (!isControlled) {
      setInternalExpanded(defaultExpanded);
    }
  }, [defaultExpanded, isControlled]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Last 2 weeks of metrics
        </Typography>
        <IconButton
          size="small"
          onClick={() => {
            if (!interactive) return;
            const next = !isExpanded;
            if (!isControlled) setInternalExpanded(next);
            onExpandedChange?.(next);
          }}
          disabled={!interactive}
          aria-label="Toggle daily breakdown"
        >
          <Box sx={{ display: { xs: 'flex', lg: 'none' } }}>
            {isExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          </Box>
          <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
            {isExpanded
              ? <UnfoldLessIcon sx={{ transform: 'rotate(90deg)' }} />
              : <UnfoldMoreIcon sx={{ transform: 'rotate(90deg)' }} />}
          </Box>
        </IconButton>
      </Box>

      <Box sx={{ display: forceMobileLayout ? 'none' : { xs: 'none', lg: 'flex' }, alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <MetricsSummaryTable
            currentWeek={currentWeek}
            weekPrior={weekPrior}
            weekTargets={weekTargets}
            customMetricDefs={customMetricDefs}
            forceCompactFont={forceCompactFont}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flex: isExpanded ? '1 1 0' : '0 0 0',
            minWidth: 0,
            gap: 2,
            maxWidth: isExpanded ? '100dvw' : 0,
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0,
            transition: 'max-width 300ms ease, opacity 200ms ease',
            alignItems: 'flex-start',
          }}
        >
          <Divider orientation="vertical" flexItem />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MetricsDailyBreakdown
              metrics={currentWeek}
              weekStartDate={weekStartDate}
              customMetricDefs={customMetricDefs}
              showMetricColumn={false}
              includeEmptyRows
              forceCompactFont={forceCompactFont}
              showRightFade
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: forceMobileLayout ? 'block' : { xs: 'block', lg: 'none' }, minWidth: 0 }}>
        <MetricsSummaryTable
          currentWeek={currentWeek}
          weekPrior={weekPrior}
          weekTargets={weekTargets}
          customMetricDefs={customMetricDefs}
          forceCompactFont={forceCompactFont}
        />
        <Collapse in={isExpanded} unmountOnExit>
          <Divider sx={{ py: 1 }} />
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <MetricsDailyBreakdown
              metrics={currentWeek}
              weekStartDate={weekStartDate}
              customMetricDefs={customMetricDefs}
              includeEmptyRows
              forceCompactFont={forceCompactFont}
              showRightFade
            />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
