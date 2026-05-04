'use client';

import {useRef, type ReactNode} from 'react';
import {Box, Tab, Tabs, Tooltip} from '@mui/material';
import type {SxProps, Theme} from '@mui/material/styles';
import {AnimatePresence, motion} from 'framer-motion';
import {blue} from '@mui/material/colors';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import HistoryIcon from '@mui/icons-material/History';

export type WorkoutSlidePanelKey = 'notes' | 'e1rm' | 'muscles' | 'history';

export type WorkoutSlidePanel = {
  value: WorkoutSlidePanelKey;
  label: string;
  render: () => ReactNode;
};

const PANEL_ICONS: Record<WorkoutSlidePanelKey, ReactNode> = {
  notes: <EditNoteOutlinedIcon fontSize="small" />,
  e1rm: <ShowChartIcon fontSize="small" />,
  muscles: <AccessibilityNewIcon fontSize="small" />,
  history: <HistoryIcon fontSize="small" />,
};

const PANEL_ORDER: WorkoutSlidePanelKey[] = ['notes', 'e1rm', 'muscles', 'history'];

type Props = {
  activePanel: WorkoutSlidePanelKey | null;
  onActivePanelChange: (panel: WorkoutSlidePanelKey | null) => void;
  panels: WorkoutSlidePanel[];
  tabsSx?: SxProps<Theme>;
  panelSx?: SxProps<Theme>;
};

const toSxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : sx ? [sx] : []);

export default function WorkoutSlidePanels({
  activePanel,
  onActivePanelChange,
  panels,
  tabsSx,
  panelSx,
}: Props) {
  const prevPanelRef = useRef<WorkoutSlidePanelKey | null>(null);
  const activePanelConfig = activePanel ? panels.find(p => p.value === activePanel) : null;

  const prevIdx = prevPanelRef.current ? PANEL_ORDER.indexOf(prevPanelRef.current) : -1;
  const nextIdx = activePanel ? PANEL_ORDER.indexOf(activePanel) : -1;
  const direction = prevIdx === -1 || nextIdx === -1 ? 1 : nextIdx >= prevIdx ? 1 : -1;
  if (activePanel !== prevPanelRef.current) prevPanelRef.current = activePanel;

  const panelIcon = (panel: WorkoutSlidePanel) => (
    <Tooltip title={panel.label} arrow>
      <Box component="span" sx={{display: 'inline-flex'}}>
        {PANEL_ICONS[panel.value]}
      </Box>
    </Tooltip>
  );

  return (
    <>
      <Tabs
        value={activePanel ?? false}
        onChange={() => {}}
        variant="fullWidth"
        sx={[
          {
            minHeight: 32,
            '& .MuiTab-root': {
              minHeight: 32,
              py: 0.5,
              mb: 0.5,
              whiteSpace: 'nowrap',
              color: 'text.secondary',
              minWidth: 0,
            },
            '& .MuiTab-root.Mui-selected': {
              color: blue[600],
            },
            '& .MuiTabs-indicator': {
              borderRadius: 999,
            },
          },
          ...toSxArray(tabsSx),
        ]}
      >
        {panels.map(panel => (
          <Tab
            key={panel.value}
            value={panel.value}
            icon={panelIcon(panel)}
            aria-label={panel.label}
            onClick={() => onActivePanelChange(activePanel === panel.value ? null : panel.value)}
            sx={{
              px: 1,
              textTransform: 'none',
              '& .MuiTab-iconWrapper': {mb: 0, mr: 0},
            }}
          />
        ))}
      </Tabs>

      <AnimatePresence initial={false}>
        {activePanelConfig && (
          <Box
            key="panel-container"
            component={motion.div}
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{duration: 0.18, ease: 'easeOut'}}
            sx={[
              {width: '100%', overflow: 'hidden', mt: 1, mb: 1},
              ...toSxArray(panelSx),
            ]}
          >
            <motion.div
              key={activePanel}
              initial={{opacity: 0, x: direction * 24}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.12, ease: 'easeOut'}}
            >
              {activePanelConfig.render()}
            </motion.div>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
