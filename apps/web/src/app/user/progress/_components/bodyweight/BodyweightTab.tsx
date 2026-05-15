'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { signalTokens } from '@lib/signal/tokens';
import type { MetricPrisma } from '@/types/dataTypes';
import type { Settings } from '@/types/settingsTypes';
import type { MetricKey } from '@/types/metricTypes';
import { buildMetricViews } from '@lib/metricSeries/metricCatalog';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';
import { type TimeRange } from '@lib/metricSeries/timeRange';
import { MetricListPanel } from './MetricListPanel';
import { MetricDetailPanel } from './MetricDetailPanel';
import { BackfillDialog } from './BackfillDialog';
import { AddMetricDialog } from './AddMetricDialog';

const palette = signalTokens.surface.planning;
const DESKTOP_BREAKPOINT = signalTokens.space.desktopBreakpointPx;
const CUSTOM_METRIC_CAP = 4;

type MobileView = 'list' | 'detail';

type Props = {
  metrics: MetricPrisma[];
  settings: Settings;
  userId: string;
};

function dayKeyOf(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return format(date, 'yyyy-MM-dd');
}

export function BodyweightTab({ metrics: initialMetrics, settings: initialSettings, userId }: Props) {
  const [metrics, setMetrics] = useState<MetricPrisma[]>(initialMetrics);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [range, setRange] = useState<TimeRange>('12w');
  const [selectedKey, setSelectedKey] = useState<MetricKey | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [isDesktop, setIsDesktop] = useState(false);
  const [backfillDate, setBackfillDate] = useState<Date | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const views = useMemo(() => buildMetricViews(metrics, settings), [metrics, settings]);

  const seriesByKey = useMemo(() => {
    const map = new Map<MetricKey, MetricPoint[]>();
    for (const v of views) map.set(v.key, v.series);
    return map;
  }, [views]);

  const metricsByDayKey = useMemo(() => {
    const map = new Map<string, MetricPrisma>();
    for (const m of metrics) map.set(dayKeyOf(m.date), m);
    return map;
  }, [metrics]);

  // Resolve a stable selected key whenever the catalog changes
  const effectiveSelectedKey: MetricKey | null = useMemo(() => {
    if (selectedKey && views.some((v) => v.key === selectedKey)) return selectedKey;
    return views[0]?.key ?? null;
  }, [selectedKey, views]);

  const selectedView = views.find((v) => v.key === effectiveSelectedKey) ?? null;
  const customAtCap = settings.customMetrics.length >= CUSTOM_METRIC_CAP;

  function handleSelect(key: MetricKey) {
    setSelectedKey(key);
    setMobileView('detail');
  }

  function handleCellClick(date: Date) {
    if (!effectiveSelectedKey) return;
    setBackfillDate(date);
    setBackfillOpen(true);
  }

  function handleMetricSaved(savedDate: Date, metric: MetricPrisma | null) {
    if (!metric) return;
    const k = dayKeyOf(savedDate);
    setMetrics((prev) => {
      const idx = prev.findIndex((m) => dayKeyOf(m.date) === k);
      if (idx === -1) {
        const next = [...prev, metric];
        next.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return next;
      }
      const next = prev.slice();
      next[idx] = { ...prev[idx], ...metric };
      return next;
    });
  }

  function handleSettingsSaved(next: Settings) {
    setSettings(next);
    // auto-select the newly created metric (last in list)
    const newDef = next.customMetrics[next.customMetrics.length - 1];
    if (newDef) setSelectedKey(newDef.id);
  }

  const showList = isDesktop || mobileView === 'list';
  const showDetail = isDesktop || mobileView === 'detail';

  const listPanel = (
    <MetricListPanel
      tracked={views}
      seriesByKey={seriesByKey}
      selectedKey={effectiveSelectedKey}
      range={range}
      customMetricsAtCap={customAtCap}
      onSelect={handleSelect}
      onAddMetric={() => setAddOpen(true)}
    />
  );

  const detailPanel = selectedView ? (
    <MetricDetailPanel
      metric={selectedView}
      fullSeries={selectedView.series}
      range={range}
      onRangeChange={setRange}
      onBack={isDesktop ? undefined : () => setMobileView('list')}
      onCellClick={handleCellClick}
    />
  ) : (
    <div style={{ padding: '20px', fontSize: 13, color: palette.inkMid }}>
      Log a metric or add one to populate this panel.
    </div>
  );

  return (
    <>
      <style>{`
        @media (min-width: ${DESKTOP_BREAKPOINT}px) {
          [data-bodyweight-grid] {
            display: grid;
            grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
            align-items: start;
          }
        }
      `}</style>

      <div
        data-bodyweight-grid
        style={{
          padding: '16px 20px 32px',
          gap: 16,
        }}
      >
        {showList && listPanel}
        {showDetail && detailPanel}
      </div>

      <BackfillDialog
        open={backfillOpen}
        onClose={() => setBackfillOpen(false)}
        date={backfillDate}
        metricKey={effectiveSelectedKey}
        metricLabel={selectedView?.label ?? ''}
        metricsByDayKey={metricsByDayKey}
        customMetricDefs={settings.customMetrics}
        bodyweightUnit={settings.bodyweightUnit}
        userId={userId}
        onMetricSaved={handleMetricSaved}
      />

      <AddMetricDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingCustomMetrics={settings.customMetrics}
        onSaved={handleSettingsSaved}
      />
    </>
  );
}
