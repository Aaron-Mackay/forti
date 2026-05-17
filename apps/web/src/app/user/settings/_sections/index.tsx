'use client';

import { type ReactNode } from 'react';
import { ProfileSection } from './ProfileSection';
import { DashboardCardsSection } from './DashboardCardsSection';
import { WorkoutDefaultsSection } from './WorkoutDefaultsSection';
import { TrackedLiftsSection } from './TrackedLiftsSection';
import { CustomMetricsSection } from './CustomMetricsSection';
import { CheckInDaySection } from './CheckInDaySection';
import { UnitsSection } from './UnitsSection';
import { ReplayGuideSection } from './ReplayGuideSection';
import { CoachSection } from './CoachSection';
import { CoachModeSection } from './CoachModeSection';
import { ExportSection } from './ExportSection';
import { SignalUiSection } from './SignalUiSection';
import { SignOutSection } from './SignOutSection';
import type { SectionSlug } from '../_components/sections';

type Args = {
  initialName: string;
  initialImage: string | null;
};

export function renderSection(slug: SectionSlug, args: Args): ReactNode {
  switch (slug) {
    case 'profile':
      return <ProfileSection initialName={args.initialName} initialImage={args.initialImage} />;
    case 'dashboard':
      return <DashboardCardsSection />;
    case 'workout':
      return <WorkoutDefaultsSection />;
    case 'tracked':
      return <TrackedLiftsSection />;
    case 'metrics':
      return <CustomMetricsSection />;
    case 'checkin':
      return <CheckInDaySection />;
    case 'units':
      return <UnitsSection />;
    case 'onboarding':
      return <ReplayGuideSection />;
    case 'coach':
      return <CoachSection />;
    case 'coach-mode':
      return <CoachModeSection />;
    case 'export':
      return <ExportSection />;
    case 'signal':
      return <SignalUiSection />;
    case 'signout':
      return <SignOutSection />;
  }
}
