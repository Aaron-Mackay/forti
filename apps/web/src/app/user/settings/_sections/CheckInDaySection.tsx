'use client';

import { useSettingsWithSaved } from '../_components/SavedState';
import { SignalSegmented } from '@/components/signal/SignalSegmented';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';

export function CheckInDaySection() {
  const { settings, updateSetting } = useSettingsWithSaved();

  return (
    <SignalSegmented
      ariaLabel="Check-in day"
      size="sm"
      value={settings.checkInDay}
      onChange={(v) => updateSetting('checkInDay', v)}
      options={CHECK_IN_DAY_NAMES.map((name, i) => ({
        value: i,
        label: name.slice(0, 3),
        ariaLabel: name,
      }))}
    />
  );
}
