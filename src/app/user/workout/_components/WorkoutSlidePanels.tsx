'use client';

import {useRef, useEffect, type ReactNode} from 'react';
import {Box, Tab, Tabs, Tooltip} from '@mui/material';
import type {SxProps, Theme} from '@mui/material/styles';
import {AnimatePresence, motion} from 'framer-motion';
import {blue} from '@mui/material/colors';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import HistoryIcon from '@mui/icons-material/History';
import {Swiper, SwiperSlide} from 'swiper/react';
import {type Swiper as SwiperType} from 'swiper/types';
import 'swiper/css';

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
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    if (!swiperRef.current || activePanel === null) return;
    const idx = panels.findIndex(p => p.value === activePanel);
    if (idx !== -1 && swiperRef.current.activeIndex !== idx) {
      swiperRef.current.slideTo(idx, 300);
    }
  }, [activePanel, panels]);

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
        onChange={() => {
        }}
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
        {activePanel !== null && (
          <Box
            key="slide-panel-swiper"
            component={motion.div}
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{
              duration: 0.18,
              ease: 'easeOut',
            }}
            sx={[
              {
                width: '100%',
                overflow: 'hidden',
                mt: 1,
                mb: 1,
              },
              ...toSxArray(panelSx),
            ]}
          >
            <Swiper
              initialSlide={panels.findIndex(p => p.value === activePanel)}
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              onSlideChange={(swiper) => {
                const newPanel = panels[swiper.activeIndex];
                if (newPanel) onActivePanelChange(newPanel.value);
              }}
              touchReleaseOnEdges={true}
              style={{width: '100%'}}
            >
              {panels.map(panel => (
                <SwiperSlide key={panel.value}>
                  {panel.render()}
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
