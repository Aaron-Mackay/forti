'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { signalTokens } from '@lib/signal/tokens';
import { getExerciseE1rmHistory } from '@lib/clientApi';
import type { E1rmHistoryPoint } from '@lib/contracts/exerciseHistory';
import type { TrackedE1rmExercise } from '@/types/settingsTypes';
import type { WeightUnit } from '@/lib/units';
import { formatWeight } from '@/lib/units';
import { ExerciseBrowseSheet } from './ExerciseBrowseSheet';
import { ExerciseDetailPanel, filterByTimeRange, type TimeRange } from './ExerciseDetailPanel';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({ default: () => null })),
  { ssr: false },
);

const palette = signalTokens.surface.planning;

const DESKTOP_BREAKPOINT = signalTokens.space.desktopBreakpointPx;

function computeDelta(history: E1rmHistoryPoint[], range: TimeRange): { text: string; color: string } {
  const filtered = filterByTimeRange(history, range);
  if (filtered.length < 2) return { text: '—', color: palette.inkMid };
  const delta = filtered.at(-1)!.bestE1rm - filtered[0].bestE1rm;
  if (Math.abs(delta) < 1) return { text: 'hold', color: palette.inkMid };
  if (delta > 0) return { text: `+${delta.toFixed(1)} kg`, color: palette.ink };
  return { text: `−${Math.abs(delta).toFixed(1)} kg`, color: signalTokens.status.urgent };
}

function MiniSparkline({ exerciseId, data }: { exerciseId: number; data: { x: number; y: number }[] }) {
  if (data.length < 2) return <div style={{ width: 60 }} />;
  return (
    <div style={{ width: 60, flexShrink: 0 }}>
      <Chart
        type="line"
        height={28}
        width={60}
        series={[{ name: '', data }]}
        options={{
          chart: {
            id: `e1rm-row-${exerciseId}`,
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false },
            sparkline: { enabled: true },
          },
          stroke: { curve: 'smooth', width: 1.5 },
          markers: { size: 0 },
          tooltip: { enabled: false },
          colors: [signalTokens.chart.series1],
          xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
          yaxis: { labels: { show: false } },
          grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
        }}
      />
    </div>
  );
}

type MobileView = 'list' | 'detail';

type Props = {
  exercises: TrackedE1rmExercise[];
  weightUnit: WeightUnit;
};

export function StrengthTab({ exercises, weightUnit }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(exercises[0]?.id ?? null);
  const [timeRange, setTimeRange] = useState<TimeRange>('4w');
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [historyByExercise, setHistoryByExercise] = useState<Record<number, E1rmHistoryPoint[]>>({});
  const [isDesktop, setIsDesktop] = useState(false);

  const exerciseIds = exercises.map((e) => e.id).join(',');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setHistoryByExercise({});
    for (const exercise of exercises) {
      getExerciseE1rmHistory(exercise.id)
        .then((history) => {
          if (!mountedRef.current) return;
          setHistoryByExercise((prev) => ({ ...prev, [exercise.id]: history }));
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setHistoryByExercise((prev) => ({ ...prev, [exercise.id]: [] }));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIds]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const selectedExercise = exercises.find((e) => e.id === selectedId) ?? null;
  const selectedHistory = selectedId != null ? (historyByExercise[selectedId] ?? null) : null;

  function handleSelectExercise(id: number) {
    setSelectedId(id);
    setMobileView('detail');
  }

  const showList = isDesktop || mobileView === 'list';
  const showDetail = isDesktop || mobileView === 'detail';

  const listPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 8 }}>
      {/* Header: above the card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Focus exercises
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
            {exercises.length} / 5
          </span>
          <Link
            href="/user/settings"
            aria-label="Edit focus exercises"
            style={{ display: 'flex', alignItems: 'center', color: palette.inkLight, textDecoration: 'none', lineHeight: 1 }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.753.444l-3.326.932a.75.75 0 0 1-.927-.928l.933-3.325c.08-.284.233-.543.443-.754l8.68-8.539Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
        }}
      >

      {exercises.length === 0 ? (
        <div style={{ padding: '8px 12px 20px', fontSize: 13, color: palette.inkMid, lineHeight: 1.6 }}>
          Add up to five tracked lifts in{' '}
          <Link href="/user/settings" style={{ color: signalTokens.signal.deep }}>
            settings
          </Link>{' '}
          to surface e1RM history here.
        </div>
      ) : (
        <>
          <div style={{ borderTop: `1px solid ${palette.border}` }}>
            {exercises.map((exercise, i) => {
              const history = historyByExercise[exercise.id];
              const isSelected = exercise.id === selectedId;
              const filteredForRow = history ? filterByTimeRange(history, timeRange) : [];
              const lastE1rm = filteredForRow.at(-1)?.bestE1rm;
              const delta = history ? computeDelta(history, timeRange) : null;
              const sparkData = filteredForRow.map((p) => ({
                x: new Date(p.date).getTime(),
                y: parseFloat(p.bestE1rm.toFixed(1)),
              }));

              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => handleSelectExercise(exercise.id)}
                  style={{
                    appearance: 'none',
                    background: isSelected ? palette.surfaceAlt : palette.surface,
                    border: 'none',
                    borderTop: i > 0 ? `1px solid ${palette.border}` : 'none',
                    borderLeft: `3px solid ${isSelected ? signalTokens.signal.base : 'transparent'}`,
                    cursor: 'pointer',
                    padding: '18px 16px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    width: '100%',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 15, fontWeight: 600, color: palette.ink, lineHeight: 1.3 }}>
                      {exercise.name}
                    </div>
                    <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.inkMid, marginTop: 2 }}>
                      {lastE1rm != null ? `e1RM ${formatWeight(lastE1rm, weightUnit)}` : history === undefined ? 'Loading…' : 'No data'}
                    </div>
                  </div>
                  <MiniSparkline exerciseId={exercise.id} data={sparkData} />
                  {delta && (
                    <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: delta.color, flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                      {delta.text}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setBrowseOpen(true)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 12px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: palette.inkMid,
            }}
          >
            Search all exercises
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
      </div>
    </div>
  );

  const detailPanel = selectedExercise && selectedHistory !== null ? (
    <ExerciseDetailPanel
      exercise={selectedExercise}
      history={selectedHistory}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      onBack={isDesktop ? undefined : () => setMobileView('list')}
      weightUnit={weightUnit}
    />
  ) : selectedExercise && selectedHistory === null ? (
    <div style={{ padding: '20px 16px', fontSize: 13, color: palette.inkMid }}>Loading…</div>
  ) : null;

  return (
    <>
      <style>{`
        @media (min-width: ${DESKTOP_BREAKPOINT}px) {
          [data-strength-grid] {
            display: grid;
            grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
            align-items: start;
          }
        }
      `}</style>

      <div
        data-strength-grid
        style={{
          padding: '16px 20px 32px',
          gap: 16,
        }}
      >
        {showList && listPanel}
        {showDetail && detailPanel}
      </div>

      <ExerciseBrowseSheet
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        weightUnit={weightUnit}
      />
    </>
  );
}
