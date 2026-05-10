import Link from 'next/link';
import { Box, Paper, Typography } from '@mui/material';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import DashboardChart from '@/app/user/(dashboard)/DashboardChart';
import E1rmProgressCard from '@/app/user/(dashboard)/E1rmProgressCard';
import { EventType } from '@/generated/prisma/browser';
import type { MetricPrisma, EventPrisma } from '@/types/dataTypes';
import type { Settings } from '@/types/settingsTypes';
import type { ActivePlanWithStats } from '@lib/userService';
import { kgToBodyweightDisplay } from '@/lib/units';

type Props = {
  metrics: MetricPrisma[];
  events: EventPrisma[];
  activePlanData: ActivePlanWithStats | null;
  settings: Settings;
  today: Date;
};

function formatBodyweight(metrics: MetricPrisma[], settings: Settings): string {
  const latestWeight = [...metrics].reverse().find((metric) => metric.weight != null)?.weight ?? null;
  if (latestWeight == null) return 'No entries yet';
  const converted = kgToBodyweightDisplay(latestWeight, settings.bodyweightUnit);
  if (converted == null) return 'No entries yet';
  return `${converted.toFixed(1)} ${settings.bodyweightUnit}`;
}

function currentBlockLabel(events: EventPrisma[], today: Date): string {
  const activeBlock = events.find((event) => {
    if (event.eventType !== EventType.BlockEvent) return false;
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return start <= today && end >= today;
  });

  return activeBlock?.name ?? 'No active block';
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 2,
        minHeight: 116,
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {note}
      </Typography>
    </Box>
  );
}

export function LegacyProgress({ metrics, events, activePlanData, settings, today }: Props) {
  const blockEvents = events.filter((event) => event.eventType === EventType.BlockEvent);

  return (
    <>
      <AppBarTitle title="Progress" />
      <Paper sx={{ px: 2, py: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Progress
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
          Review bodyweight, daily metrics, and tracked lifting trends in one place.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            mb: 3,
          }}
        >
          <StatCard
            label="Latest weight"
            value={formatBodyweight(metrics, settings)}
            note="Uses your current bodyweight unit setting."
          />
          <StatCard
            label="Tracked lifts"
            value={String(settings.trackedE1rmExercises.length)}
            note={settings.trackedE1rmExercises.length > 0 ? 'Tracked in your settings.' : 'Add lifts in settings to see e1RM trends.'}
          />
          <StatCard
            label="This week"
            value={String(activePlanData?.weeklyTrainingCount ?? 0)}
            note="Completed training days from your active plan."
          />
          <StatCard
            label="Current block"
            value={currentBlockLabel(events, today)}
            note="Derived from your calendar block events."
          />
        </Box>

        {settings.showMetricsChart && metrics.length > 0 ? (
          <DashboardChart
            metrics={metrics}
            blocks={blockEvents}
            bodyweightUnit={settings.bodyweightUnit}
          />
        ) : (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Metrics chart hidden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enable chart tracking in <Link href="/user/settings">settings</Link> or log more daily metrics.
            </Typography>
          </Box>
        )}

        {settings.showE1rmProgress && settings.trackedE1rmExercises.length > 0 ? (
          <E1rmProgressCard
            exercises={settings.trackedE1rmExercises}
            weightUnit={settings.weightUnit}
          />
        ) : (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              No tracked lifts yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pick up to five exercises in <Link href="/user/settings">settings</Link> to surface e1RM history here.
            </Typography>
          </Box>
        )}
      </Paper>
    </>
  );
}
