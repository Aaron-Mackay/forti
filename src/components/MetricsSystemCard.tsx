'use client';

import { useEffect, useState } from 'react';
import { Box, Collapse, Divider, IconButton, Typography } from '@mui/material';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { AnimatePresence, motion } from 'framer-motion';
import type { Metric } from '@/generated/prisma/browser';
import type { WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import type { MetricBreakdownKey } from './MetricsDailyBreakdown';
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
  editableBreakdown?: boolean;
  onBreakdownMetricChange?: (dayOffset: number, key: MetricBreakdownKey, value: number | null) => void;
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
  editableBreakdown = false,
  onBreakdownMetricChange,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = typeof expanded === 'boolean';
  const isExpanded = isControlled ? expanded : internalExpanded;
  const forceMobileLayout = layoutMode === 'force-mobile';
  const forceCompactFont = forceMobileLayout || isExpanded;

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

      {/* desktop */}
      <Box sx={{ display: forceMobileLayout ? 'none' : { xs: 'none', lg: 'flex' }, alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
        <Box sx={{ flex: isExpanded ? '0 1 auto' : '1 1 0', minWidth: 0 }}>
          <Box
            component={motion.div}
            animate={{ opacity: isExpanded ? [0.92, 1] : [0.96, 1] }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <MetricsSummaryTable
              currentWeek={currentWeek}
              weekPrior={weekPrior}
              weekTargets={weekTargets}
              customMetricDefs={customMetricDefs}
              forceCompactFont={forceCompactFont}
            />
          </Box>
        </Box>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <Box
              component={motion.div}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              sx={{
                display: 'flex',
                flex: '1 1 0',
                minWidth: 0,
                gap: 2,
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
                  editable={editableBreakdown}
                  onMetricChange={onBreakdownMetricChange}
                />
              </Box>
            </Box>
          )}
        </AnimatePresence>
      </Box>

      {/* mobile */}
      <Box sx={{ display: forceMobileLayout ? 'block' : { xs: 'block', lg: 'none' }, minWidth: 0 }}>
        <Box
          component={motion.div}
          animate={{ opacity: isExpanded ? [0.92, 1] : [0.96, 1] }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <MetricsSummaryTable
            currentWeek={currentWeek}
            weekPrior={weekPrior}
            weekTargets={weekTargets}
            customMetricDefs={customMetricDefs}
            forceCompactFont={forceCompactFont}
          />
        </Box>
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
              editable={editableBreakdown}
              onMetricChange={onBreakdownMetricChange}
            />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
